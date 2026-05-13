import nodemailer from 'npm:nodemailer@6.9.16';
import { imapPasswordFor } from './imapPassword.ts';

export async function sendSmtpMail(opts: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  cc?: string;
  bcc?: string;
  inReplyTo?: string;
  references?: string;
}): Promise<{ messageId: string }> {
  const pass = imapPasswordFor(opts.from);
  if (!pass) throw new Error(`Missing SMTP secret for ${opts.from}`);

  const transporter = nodemailer.createTransport({
    host: 'mail.infomaniak.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: opts.from, pass },
  });

  const info = await transporter.sendMail({
    from: opts.from,
    to: opts.to,
    cc: opts.cc || undefined,
    bcc: opts.bcc || undefined,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    headers: {
      ...(opts.inReplyTo ? { 'In-Reply-To': opts.inReplyTo } : {}),
      ...(opts.references ? { References: opts.references } : {}),
    },
  });
  const messageId = typeof info.messageId === 'string' ? info.messageId : '';
  return { messageId };
}
