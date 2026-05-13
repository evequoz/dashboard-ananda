import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { ImapFlow } from 'npm:imapflow@1.0.177';
import { simpleParser } from 'npm:mailparser@3.7.1';
import { corsHeaders } from '../_shared/cors.ts';
import { isServiceRoleJwt } from '../_shared/jwt.ts';
import { classifyEmail } from '../_shared/gemini.ts';
import { imapPasswordFor } from '../_shared/imapPassword.ts';
import { sendSmtpMail } from '../_shared/smtp.ts';

type EmailAccount = {
  id: number;
  email: string;
  imap_host: string;
  imap_port: number;
  username: string;
  active: boolean;
  last_uid_seen: number;
};

type SenderRule = { email_pattern: string; status: string };

const PER_ACCOUNT_TIMEOUT_MS = 20000;
/** Plafond (Edge / worker) ; le budget réel dépend du nombre de comptes. */
const GLOBAL_BUDGET_CAP_MS = 150000;

function rejectAfter(ms: number, label: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout ${ms}ms: ${label}`)), ms);
  });
}

function extractAddress(fromHeader: string): string {
  const m = fromHeader.match(/<([^>]+)>/);
  return (m?.[1] || fromHeader).trim().toLowerCase();
}

function matchSenderRule(pattern: string, fromHeader: string): boolean {
  const p = pattern.trim().toLowerCase();
  const addr = extractAddress(fromHeader);
  if (!p) return false;
  if (p.startsWith('@')) return addr.endsWith(p);
  return addr === p || fromHeader.toLowerCase().includes(p);
}

function senderRuleFor(
  fromHeader: string,
  rules: SenderRule[],
): SenderRule | null {
  for (const r of rules) {
    if (matchSenderRule(r.email_pattern, fromHeader)) return r;
  }
  return null;
}

async function senderSeenBefore(
  supabase: ReturnType<typeof createClient>,
  accountEmail: string,
  fromHeader: string,
): Promise<boolean> {
  const addr = extractAddress(fromHeader);
  const { count, error } = await supabase
    .from('inbox_emails')
    .select('id', { count: 'exact', head: true })
    .eq('account_email', accountEmail)
    .ilike('sender', `%${addr}%`);
  if (error) return true;
  return (count ?? 0) > 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!isServiceRoleJwt(authHeader)) {
    return new Response(JSON.stringify({ error: 'service_role required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  console.log('JWT OK');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const summary: Record<string, unknown> = { accounts: [] as unknown[] };

  try {
    const { data: ownerId, error: ownerErr } = await supabase.rpc(
      'dashboard_inbox_owner_user_id',
    );
    if (ownerErr || !ownerId) {
      throw new Error(
        `dashboard_inbox_owner_user_id: ${ownerErr?.message ?? 'null'}`,
      );
    }
    console.log('Owner ID:', ownerId);

    const { data: rulesRaw } = await supabase
      .from('email_senders')
      .select('email_pattern, status');
    const rules = (rulesRaw ?? []) as SenderRule[];

    const { data: accounts, error: accErr } = await supabase
      .from('email_accounts')
      .select('id, email, imap_host, imap_port, username, active, last_uid_seen')
      .eq('active', true);
    if (accErr) throw accErr;
    console.log('Accounts:', accounts?.length);

    const globalBudgetMs = Math.min(
      GLOBAL_BUDGET_CAP_MS,
      20000 + (accounts ?? []).length * PER_ACCOUNT_TIMEOUT_MS,
    );
    const globalDeadline = Date.now() + globalBudgetMs;
    console.log('email-sync global budget ms:', globalBudgetMs);

    const syncOneImapAccount = async (acc: EmailAccount): Promise<void> => {
      const pass = imapPasswordFor(acc.email);
      if (!pass) throw new Error('no_imap_password_secret');

      const client = new ImapFlow({
        host: acc.imap_host,
        port: acc.imap_port,
        secure: true,
        auth: { user: acc.username, pass },
        logger: false,
        tls: { rejectUnauthorized: false },
        socketTimeout: 15000,
        greetingTimeout: 10000,
        connectionTimeout: 10000,
      } as ConstructorParameters<typeof ImapFlow>[0]);

      let maxUidHandled = acc.last_uid_seen;

      try {
        console.log('Connecting IMAP:', acc.email);
        await client.connect();
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error('IMAP connect error:', acc.email, errMsg);
        (summary.accounts as unknown[]).push({
          email: acc.email,
          error: errMsg,
        });
        await client.logout().catch(() => undefined);
        return;
      }

      try {
        const lock = await client.getMailboxLock('INBOX');
        try {
          const st = await client.status('INBOX', { uidNext: true, messages: true });
          const uidNext = st.uidNext ?? 1;
          const maxUid = uidNext > 0 ? uidNext - 1 : 0;

          // Derniers 500 messages sur le serveur (UID) — ne pas marquer deleted hors fenêtre
          const uidWindowMin = maxUid > 0 ? Math.max(1, maxUid - 500) : 1;
          const uidsOnServer = new Set<number>();
          if (maxUid > 0) {
            for await (
              const m of client.fetch(
                { uid: `${uidWindowMin}:${maxUid}` },
                { uid: true },
              )
            ) {
              if (m.uid) uidsOnServer.add(m.uid);
            }
          }

          const { data: existingRows } = await supabase
            .from('inbox_emails')
            .select('id, uid_imap')
            .eq('account_email', acc.email)
            .eq('folder', 'INBOX')
            .is('deleted_at', null)
            .not('uid_imap', 'is', null);

          const missingIds = (existingRows ?? [])
            .filter((r: { uid_imap: number }) =>
              r.uid_imap >= uidWindowMin && !uidsOnServer.has(r.uid_imap)
            )
            .map((r: { id: number }) => r.id);

          if (missingIds.length) {
            await supabase
              .from('inbox_emails')
              .update({ deleted_at: new Date().toISOString() })
              .in('id', missingIds);
          }

          let startUid = acc.last_uid_seen + 1;
          if (acc.last_uid_seen <= 0 && maxUid > 0) {
            startUid = Math.max(1, maxUid - 20);
          }
          if (startUid > maxUid) {
            await supabase
              .from('email_accounts')
              .update({
                last_sync_at: new Date().toISOString(),
                last_uid_seen: maxUid,
              })
              .eq('id', acc.id);
            (summary.accounts as unknown[]).push({
              email: acc.email,
              fetched: 0,
              markedDeleted: missingIds.length,
            });
            return;
          }

          let inserted = 0;
          for await (const msg of client.fetch(
            { uid: `${startUid}:${maxUid}` },
            { envelope: true, source: true, uid: true, bodyStructure: true },
          )) {
            if (!msg.uid) continue;
            maxUidHandled = Math.max(maxUidHandled, msg.uid);

            const env = msg.envelope;
            const subject = env?.subject?.toString() ?? '';
            const fromHeader = env?.from?.[0]
              ? `${env.from[0].name ? `${env.from[0].name} ` : ''}<${env.from[0].address}>`
              : '';
            const date = env?.date?.toISOString?.() ?? new Date().toISOString();

            let messageId =
              env?.messageId?.toString?.()?.trim()?.replace(/^<|>$/g, '') ?? '';
            let textBody = '';
            let htmlBody = '';
            let hasAttachment = false;
            const attMeta: Array<{ filename: string; size?: number }> = [];

            if (msg.source) {
              const parsed = await simpleParser(msg.source);
              textBody = parsed.text || '';
              htmlBody = typeof parsed.html === 'string' ? parsed.html : '';
              if (!messageId && parsed.messageId) {
                messageId = String(parsed.messageId).replace(/^<|>$/g, '');
              }
              hasAttachment = (parsed.attachments?.length ?? 0) > 0;
              for (const a of parsed.attachments ?? []) {
                attMeta.push({
                  filename: a.filename || 'file',
                  size: a.size,
                });
              }
            }

            const snippet = (textBody || htmlBody.replace(/<[^>]+>/g, ' ')).slice(
              0,
              800,
            );

            if (messageId) {
              const { data: dup } = await supabase
                .from('inbox_emails')
                .select('id')
                .eq('message_id', messageId)
                .maybeSingle();
              if (dup) continue;
            }

            const rule = senderRuleFor(fromHeader, rules);
            let spamScore = 0.45;
            let spamCategory = 'unknown';
            let processed = false;

            if (rule?.status === 'whitelist') {
              spamScore = 0;
              spamCategory = 'legitimate';
            } else if (rule?.status === 'blacklist') {
              spamScore = 1;
              spamCategory = 'spam';
              processed = true;
            } else if (rule?.status === 'newsletter') {
              spamScore = 0.2;
              spamCategory = 'newsletter';
            } else {
              const c = await classifyEmail(subject, fromHeader, snippet);
              spamScore = c.score;
              spamCategory = c.category;
            }

            if (spamScore > 0.8 && spamCategory !== 'newsletter') processed = true;

            let challengeSent = false;
            const selfAddr = acc.email.trim().toLowerCase();
            if (
              spamScore > 0.6 &&
              extractAddress(fromHeader) !== selfAddr &&
              !(await senderSeenBefore(supabase, acc.email, fromHeader))
            ) {
              try {
                const toAddr = extractAddress(fromHeader);
                if (toAddr && toAddr !== acc.email.toLowerCase()) {
                  await sendSmtpMail({
                    from: acc.email,
                    to: toAddr,
                    subject: `Re: ${subject || 'Vérification'}`.slice(0, 200),
                    text:
                      'Bonjour, je reçois beaucoup de messages automatisés. Pour que votre email arrive dans ma boîte principale, merci de répondre à ce message avec le mot : HUMAIN',
                  });
                  challengeSent = true;
                }
              } catch {
                /* ignore challenge send failure */
              }
            }

            const { error: insErr } = await supabase.from('inbox_emails').insert({
              user_id: ownerId,
              subject,
              sender: fromHeader,
              received_at: date,
              content: textBody || htmlBody || '',
              ai_summary: snippet.slice(0, 500),
              action_required: false,
              processed,
              account_email: acc.email,
              has_attachment: hasAttachment,
              attachments: attMeta,
              message_id: messageId || null,
              uid_imap: msg.uid,
              folder: 'INBOX',
              spam_score: spamScore,
              spam_category: spamCategory,
              challenge_sent: challengeSent,
              challenge_responded: false,
            });
            if (!insErr) inserted += 1;
          }

          await supabase
            .from('email_accounts')
            .update({
              last_sync_at: new Date().toISOString(),
              last_uid_seen: Math.max(maxUid, maxUidHandled),
            })
            .eq('id', acc.id);

          (summary.accounts as unknown[]).push({
            email: acc.email,
            inserted,
            markedDeleted: missingIds.length,
            lastUid: Math.max(maxUid, maxUidHandled),
          });
        } finally {
          lock.release();
        }
      } catch (e) {
        const imapMsg = e instanceof Error ? e.message : String(e);
        console.error('IMAP error:', imapMsg);
        throw e instanceof Error ? e : new Error(imapMsg);
      } finally {
        await client.logout().catch(() => undefined);
      }
    };

    for (const acc of (accounts ?? []) as EmailAccount[]) {
      if (Date.now() >= globalDeadline) {
        console.log('email-sync: budget 25s épuisé, arrêt des comptes restants');
        (summary.accounts as unknown[]).push({
          skipped: 'global_budget_25s_exceeded',
        });
        break;
      }

      const pass = imapPasswordFor(acc.email);
      if (!pass) {
        (summary.accounts as unknown[]).push({
          email: acc.email,
          skipped: 'no_imap_password_secret',
        });
        continue;
      }

      try {
        await Promise.race([
          syncOneImapAccount(acc),
          rejectAfter(PER_ACCOUNT_TIMEOUT_MS, `account ${acc.email}`),
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('email-sync compte:', acc.email, msg);
        (summary.accounts as unknown[]).push({
          email: acc.email,
          error: msg,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('email-sync fatal:', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
