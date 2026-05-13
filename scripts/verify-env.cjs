'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const { ImapFlow } = require('imapflow');

const REQUIRED = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY',
  'EMAIL_SERGE_EHME_PASSWORD',
  'EMAIL_ADMIN_EHME_PASSWORD',
  'EMAIL_SERGE_SEME_PASSWORD',
];

function badPlaceholder(v) {
  if (!v || !String(v).trim()) return true;
  return /REMPLACER/i.test(String(v));
}

async function main() {
  let failed = false;
  for (const k of REQUIRED) {
    if (badPlaceholder(process.env[k])) {
      console.error('[KO] Variable manquante ou placeholder:', k);
      failed = true;
    }
  }
  if (failed) process.exit(1);

  const url = process.env.SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  const sr = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const rest = await fetch(`${url}/rest/v1/email_accounts?select=id&limit=1`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
  });
  console.log('[REST anon] email_accounts → HTTP', rest.status);
  if (!rest.ok) failed = true;

  const supa = createClient(url, sr, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: ownerId, error: rpcErr } = await supa.rpc(
    'dashboard_inbox_owner_user_id',
  );
  if (rpcErr || !ownerId) {
    console.error('[KO] RPC dashboard_inbox_owner_user_id:', rpcErr?.message);
    failed = true;
  } else {
    console.log('[OK] RPC dashboard_inbox_owner_user_id →', String(ownerId).slice(0, 8) + '…');
  }

  const gemUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const gemRes = await fetch(gemUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Réponds uniquement: OK' }] }],
      generationConfig: { maxOutputTokens: 16, temperature: 0 },
    }),
  });
  console.log('[Gemini] → HTTP', gemRes.status);
  if (!gemRes.ok) {
    const t = await gemRes.text().catch(() => '');
    console.error('[KO] Gemini body:', t.slice(0, 200));
    failed = true;
  }

  const { data: accounts } = await supa
    .from('email_accounts')
    .select('email, imap_host, imap_port, username')
    .eq('active', true)
    .limit(1);

  const acc = accounts?.[0];
  if (!acc) {
    console.warn('[SKIP] Aucun compte actif dans email_accounts');
  } else {
    const map = {
      'serge@eh-me.com': process.env.EMAIL_SERGE_EHME_PASSWORD,
      'admin@eh-me.com': process.env.EMAIL_ADMIN_EHME_PASSWORD,
      'serge@seme.ch': process.env.EMAIL_SERGE_SEME_PASSWORD,
    };
    const pass = map[String(acc.email).toLowerCase()];
    if (!pass) {
      console.error('[KO] Pas de mot de passe env pour', acc.email);
      failed = true;
    } else {
      const client = new ImapFlow({
        host: acc.imap_host,
        port: acc.imap_port,
        secure: true,
        auth: { user: acc.username, pass },
        logger: false,
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
      try {
        await client.connect();
        console.log('[OK] IMAP connect:', acc.email);
        await client.logout();
      } catch (e) {
        console.error('[KO] IMAP', acc.email, e instanceof Error ? e.message : e);
        failed = true;
      }
    }
  }

  if (failed) {
    console.error('\nRésumé: au moins un test a échoué.');
    process.exit(1);
  }
  console.log('\nRésumé: tout répond.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
