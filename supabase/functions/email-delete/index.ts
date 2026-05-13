import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { ImapFlow } from 'npm:imapflow@1.0.177';
import { corsHeaders } from '../_shared/cors.ts';
import { jwtPayload, isServiceRoleJwt } from '../_shared/jwt.ts';
import { imapPasswordFor } from '../_shared/imapPassword.ts';

function isDashboardAdmin(authHeader: string | null): boolean {
  if (isServiceRoleJwt(authHeader)) return true;
  const email = jwtPayload(authHeader)?.email;
  if (typeof email !== 'string') return false;
  const e = email.toLowerCase();
  return e === 'serge@eh-me.com' || e === 'admin@eh-me.com';
}

const TRASH_FOLDER_CANDIDATES = [
  'Trash',
  'INBOX.Trash',
  'Deleted Messages',
  'Corbeille',
  '[Gmail]/Trash',
];

async function pickTrashFolder(client: ImapFlow): Promise<string | null> {
  const list = await client.list();
  const lower = list.map((b) => b.path.toLowerCase());
  for (const c of TRASH_FOLDER_CANDIDATES) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx >= 0) return list[idx].path;
  }
  const fuzzy = list.find((b) =>
    /trash|corbeille|deleted/i.test(b.path),
  );
  return fuzzy?.path ?? null;
}

function normMessageId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/^<|>$/g, '').trim().toLowerCase() || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!isDashboardAdmin(authHeader)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: { emailIds?: number[]; mode?: 'trash' | 'hard_delete' };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const emailIds = Array.isArray(payload.emailIds)
    ? payload.emailIds.filter((n) => Number.isFinite(n))
    : [];
  const mode = payload.mode === 'hard_delete' ? 'hard_delete' : 'trash';
  if (!emailIds.length) {
    return new Response(JSON.stringify({ success: true, deleted: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error: qErr } = await supabase
    .from('inbox_emails')
    .select('id, account_email, uid_imap, folder, message_id, deleted_at')
    .in('id', emailIds);
  if (qErr) {
    return new Response(JSON.stringify({ error: qErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  type Row = {
    id: number;
    account_email: string | null;
    uid_imap: number | null;
    folder: string | null;
    message_id: string | null;
    deleted_at: string | null;
  };

  const byAccount = new Map<string, Row[]>();
  for (const r of rows ?? []) {
    const row = r as Row;
    if (!row.account_email) continue;
    const arr = byAccount.get(row.account_email) ?? [];
    arr.push(row);
    byAccount.set(row.account_email, arr);
  }

  for (const [accountEmail, accRows] of byAccount) {
    const pass = imapPasswordFor(accountEmail);
    if (!pass) continue;

    const client = new ImapFlow({
      host: 'mail.infomaniak.com',
      port: 993,
      secure: true,
      auth: { user: accountEmail, pass },
      logger: false,
    });

    try {
      await client.connect();

      if (mode === 'trash') {
        const inboxUids = accRows
          .filter((r) => (r.folder ?? 'INBOX') === 'INBOX' && r.uid_imap != null)
          .map((r) => r.uid_imap!);
        if (inboxUids.length) {
          const lock = await client.getMailboxLock('INBOX');
          try {
            const dest = await pickTrashFolder(client);
            if (dest) {
              await client.messageMove(inboxUids, dest, { uid: true });
            } else {
              await client.messageFlagsAdd(inboxUids, ['\\Deleted'], {
                uid: true,
              });
            }
          } finally {
            lock.release();
          }
        }
      } else {
        const inboxUids = accRows
          .filter((r) => (r.folder ?? 'INBOX') === 'INBOX' && r.uid_imap != null)
          .map((r) => r.uid_imap!);
        const trashMids = new Set(
          accRows
            .filter((r) =>
              (r.folder ?? '') === 'Trash' || r.deleted_at != null
            )
            .map((r) => normMessageId(r.message_id))
            .filter((m): m is string => !!m),
        );

        if (inboxUids.length) {
          const lock = await client.getMailboxLock('INBOX');
          try {
            await client.messageDelete(inboxUids, { uid: true });
          } finally {
            lock.release();
          }
        }

        if (trashMids.size > 0) {
          const trashPath = await pickTrashFolder(client);
          if (trashPath) {
            const lockT = await client.getMailboxLock(trashPath);
            try {
              const st = await client.status(trashPath, { uidNext: true });
              const maxT = (st.uidNext ?? 1) - 1;
              if (maxT > 0) {
                const toDel: number[] = [];
                for await (const msg of client.fetch(
                  { uid: `1:${maxT}` },
                  { uid: true, envelope: true },
                )) {
                  const mid = normMessageId(msg.envelope?.messageId ?? undefined);
                  if (mid && trashMids.has(mid) && msg.uid) toDel.push(msg.uid);
                }
                if (toDel.length) {
                  await client.messageDelete(toDel, { uid: true });
                }
              }
            } finally {
              lockT.release();
            }
          }
        }
      }
    } catch {
      /* DB update still applied */
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  if (mode === 'hard_delete') {
    await supabase.from('inbox_emails').delete().in('id', emailIds);
  } else {
    await supabase
      .from('inbox_emails')
      .update({
        deleted_at: new Date().toISOString(),
        folder: 'Trash',
      })
      .in('id', emailIds);
  }

  return new Response(
    JSON.stringify({ success: true, deleted: emailIds.length, mode }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
