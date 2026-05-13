import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { jwtPayload, isServiceRoleJwt } from '../_shared/jwt.ts';
import { classifyEmail } from '../_shared/gemini.ts';

function isDashboardAdmin(authHeader: string | null): boolean {
  if (isServiceRoleJwt(authHeader)) return true;
  const email = jwtPayload(authHeader)?.email;
  if (typeof email !== 'string') return false;
  const e = email.toLowerCase();
  return e === 'serge@eh-me.com' || e === 'admin@eh-me.com';
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

  let payload: { inboxEmailIds?: number[] };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ids = Array.isArray(payload.inboxEmailIds)
    ? payload.inboxEmailIds.filter((n) => Number.isFinite(n))
    : [];
  if (!ids.length) {
    return new Response(JSON.stringify({ ok: true, updated: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await supabase
    .from('inbox_emails')
    .select('id, subject, sender, content')
    .in('id', ids);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let updated = 0;
  for (const r of rows ?? []) {
    const row = r as {
      id: number;
      subject: string | null;
      sender: string | null;
      content: string | null;
    };
    const snippet = (row.content || '').slice(0, 800);
    const c = await classifyEmail(
      row.subject || '',
      row.sender || '',
      snippet,
    );
    let processed = false;
    if (c.score > 0.8 && c.category !== 'newsletter') processed = true;
    const { error: uErr } = await supabase
      .from('inbox_emails')
      .update({
        spam_score: c.score,
        spam_category: c.category,
        processed,
      })
      .eq('id', row.id);
    if (!uErr) updated += 1;
  }

  return new Response(JSON.stringify({ ok: true, updated }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
