/**
 * Cron Node.js — même logique que supabase/functions/email-sync/index.ts
 * CommonJS (.cjs) car le package racine est en "type": "module".
 *
 * Usage : npm run email-sync
 * Config : .env à la racine (voir README).
 */
'use strict';

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const nodeFetch = require('node-fetch');
const ws = require('ws');

const PER_ACCOUNT_TIMEOUT_MS = 20000;
const GLOBAL_BUDGET_CAP_MS = 150000;

const ACCOUNT_SECRETS = {
  'serge@eh-me.com': 'EMAIL_SERGE_EHME_PASSWORD',
  'admin@eh-me.com': 'EMAIL_ADMIN_EHME_PASSWORD',
  'serge@seme.ch': 'EMAIL_SERGE_SEME_PASSWORD',
};

function imapPasswordFor(email) {
  const key = ACCOUNT_SECRETS[String(email || '').trim().toLowerCase()];
  if (!key) return '';
  return String(process.env[key] || '').trim();
}

function rejectAfter(ms, label) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout ${ms}ms: ${label}`)), ms);
  });
}

function extractAddress(fromHeader) {
  const m = String(fromHeader || '').match(/<([^>]+)>/);
  return (m ? m[1] : fromHeader).trim().toLowerCase();
}

function matchSenderRule(pattern, fromHeader) {
  const p = String(pattern || '').trim().toLowerCase();
  const addr = extractAddress(fromHeader);
  if (!p) return false;
  if (p.startsWith('@')) return addr.endsWith(p);
  return addr === p || String(fromHeader).toLowerCase().includes(p);
}

function senderRuleFor(fromHeader, rules) {
  for (const r of rules) {
    if (matchSenderRule(r.email_pattern, fromHeader)) return r;
  }
  return null;
}

async function senderSeenBefore(supabase, accountEmail, fromHeader) {
  const addr = extractAddress(fromHeader);
  const { count, error } = await supabase
    .from('inbox_emails')
    .select('id', { count: 'exact', head: true })
    .eq('account_email', accountEmail)
    .ilike('sender', `%${addr}%`);
  if (error) return true;
  return (count ?? 0) > 0;
}

async function classifyEmail(subject, from, snippet) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { score: 0.5, category: 'unknown' };

  const prompt = `Tu es un filtre email. Analyse cet email et retourne UNIQUEMENT un JSON valide.

Expéditeur: ${from}
Sujet: ${subject}
Début contenu: ${String(snippet).slice(0, 300)}

Réponds avec ce JSON exact, sans markdown :
{"score": 0.0, "category": "legitimate"}

score: 0.0 = certainement légitime, 1.0 = certainement spam
category: "legitimate" | "newsletter" | "spam" | "automated"

Règles :
- Emails personnels, clients, professionnels → score < 0.3, legitimate
- Newsletters utiles (Stripe, services utilisés) → score 0.1-0.3, newsletter
- Pub non sollicitée → score > 0.7, spam
- Robots/notifications automatiques → automated`;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
  const res = await nodeFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 128 },
    }),
  });
  if (!res.ok) return { score: 0.5, category: 'unknown' };
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    '{"score":0.5,"category":"unknown"}';
  const cleaned = String(text).replace(/```json\n?|\n?```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    const score =
      typeof parsed.score === 'number'
        ? Math.min(1, Math.max(0, parsed.score))
        : 0.5;
    const category =
      typeof parsed.category === 'string' ? parsed.category : 'unknown';
    return { score, category };
  } catch {
    return { score: 0.5, category: 'unknown' };
  }
}

async function sendSmtpMail({ from, to, subject, text }) {
  const pass = imapPasswordFor(from);
  if (!pass) throw new Error(`Missing SMTP secret for ${from}`);
  const transporter = nodemailer.createTransport({
    host: 'mail.infomaniak.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: from, pass },
  });
  await transporter.sendMail({ from, to, subject, text });
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env');
  }

  console.log('JWT OK (service role .env)');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });

  const summary = { accounts: [] };

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
  const rules = rulesRaw ?? [];

  const { data: accounts, error: accErr } = await supabase
    .from('email_accounts')
    .select('id, email, imap_host, imap_port, username, active, last_uid_seen')
    .eq('active', true);
  if (accErr) throw accErr;
  console.log('Accounts:', accounts?.length ?? 0);

  const globalBudgetMs = Math.min(
    GLOBAL_BUDGET_CAP_MS,
    20000 + (accounts?.length ?? 1) * PER_ACCOUNT_TIMEOUT_MS,
  );
  const globalDeadline = Date.now() + globalBudgetMs;
  console.log('email-sync-cron global budget ms:', globalBudgetMs);

  const syncOneImapAccount = async (acc) => {
    const pass = imapPasswordFor(acc.email);
    if (!pass) throw new Error('no_imap_password_secret');

    const lastSeen = Number(acc.last_uid_seen) || 0;

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
    });

    let maxUidHandled = lastSeen;

    try {
      console.log('Connecting IMAP:', acc.email);
      await client.connect();
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('IMAP connect error:', acc.email, errMsg);
      summary.accounts.push({ email: acc.email, error: errMsg });
      await client.logout().catch(() => undefined);
      return;
    }

    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const st = await client.status('INBOX', { uidNext: true, messages: true });
        const uidNext = st.uidNext ?? 1;
        const maxUid = uidNext > 0 ? uidNext - 1 : 0;

        const uidWindowMin = maxUid > 0 ? Math.max(1, maxUid - 500) : 1;
        const uidsOnServer = new Set();
        if (maxUid > 0) {
          for await (const m of client.fetch(
            { uid: `${uidWindowMin}:${maxUid}` },
            { uid: true },
          )) {
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
          .filter(
            (r) => r.uid_imap >= uidWindowMin && !uidsOnServer.has(r.uid_imap),
          )
          .map((r) => r.id);

        if (missingIds.length) {
          await supabase
            .from('inbox_emails')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', missingIds);
        }

        let startUid = lastSeen + 1;
        if (lastSeen <= 0 && maxUid > 0) {
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
          summary.accounts.push({
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
          const subject = env?.subject != null ? String(env.subject) : '';
          const from0 = env?.from?.[0];
          const fromHeader = from0
            ? `${from0.name ? `${from0.name} ` : ''}<${from0.address}>`
            : '';
          const date =
            env?.date && typeof env.date.toISOString === 'function'
              ? env.date.toISOString()
              : new Date().toISOString();

          let messageId =
            env?.messageId != null
              ? String(env.messageId).trim().replace(/^<|>$/g, '')
              : '';
          let textBody = '';
          let htmlBody = '';
          let hasAttachment = false;
          const attMeta = [];

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
              /* ignore */
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

        summary.accounts.push({
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

  for (const acc of accounts ?? []) {
    if (Date.now() >= globalDeadline) {
      console.log('email-sync: budget 25s épuisé, arrêt des comptes restants');
      summary.accounts.push({ skipped: 'global_budget_25s_exceeded' });
      break;
    }

    if (!imapPasswordFor(acc.email)) {
      summary.accounts.push({
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
      summary.accounts.push({ email: acc.email, error: msg });
    }
  }

  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('email-sync fatal:', msg);
    process.exit(1);
  });
