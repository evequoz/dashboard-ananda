import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import nodemailer from 'npm:nodemailer@6.9.16';
import { corsHeaders } from '../_shared/cors.ts';
import { jwtPayload, isServiceRoleJwt } from '../_shared/jwt.ts';
import {
  ALLOWED_FROM_ADDRESSES,
  imapPasswordFor,
} from '../_shared/imapPassword.ts';

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

  let body: {
    from: string;
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    attachments?: Array<{
      filename: string;
      content: string;
      contentType?: string;
      encoding?: string;
    }>;
    replyToEmailId?: number;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const from = (body.from || '').trim().toLowerCase();
  if (!ALLOWED_FROM_ADDRESSES.includes(from)) {
    return new Response(JSON.stringify({ error: 'from not allowed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const pass = imapPasswordFor(from);
  if (!pass) {
    return new Response(JSON.stringify({ error: 'Missing SMTP password secret' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: ownerId, error: ownerErr } = await supabase.rpc(
    'dashboard_inbox_owner_user_id',
  );
  if (ownerErr || !ownerId) {
    return new Response(
      JSON.stringify({ error: `owner: ${ownerErr?.message ?? 'null'}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const transporter = nodemailer.createTransport({
    host: 'mail.infomaniak.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: from, pass },
  });

  const decodeBase64 = (b64: string): Uint8Array => {
    const bin = atob(b64.replace(/\s/g, ''));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };

  const attachments = (body.attachments ?? []).map((a) => ({
    filename: a.filename,
    content: a.encoding === 'base64' ? decodeBase64(a.content) : a.content,
    contentType: a.contentType || 'application/octet-stream',
  }));

  try {
    const info = await transporter.sendMail({
      from,
      to: body.to,
      subject: body.subject,
      text: body.body,
      cc: body.cc || undefined,
      bcc: body.bcc || undefined,
      attachments: attachments.length ? attachments : undefined,
    });

    await supabase.from('sent_emails').insert({
      user_id: ownerId,
      from_email: from,
      to_emails: body.to,
      cc: body.cc ?? '',
      bcc: body.bcc ?? '',
      subject: body.subject,
      body: body.body,
      sent_at: new Date().toISOString(),
      account_email: from,
    });

    if (body.replyToEmailId) {
      await supabase
        .from('inbox_emails')
        .update({ processed: true })
        .eq('id', body.replyToEmailId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: info.messageId ?? '',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
