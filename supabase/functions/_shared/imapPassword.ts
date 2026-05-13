const ACCOUNT_SECRETS: Record<string, string> = {
  'serge@eh-me.com': 'EMAIL_SERGE_EHME_PASSWORD',
  'admin@eh-me.com': 'EMAIL_ADMIN_EHME_PASSWORD',
  'serge@seme.ch': 'EMAIL_SERGE_SEME_PASSWORD',
};

export function imapPasswordFor(email: string): string {
  const key = ACCOUNT_SECRETS[email.trim().toLowerCase()];
  if (!key) return '';
  return Deno.env.get(key)?.trim() ?? '';
}

export const ALLOWED_FROM_ADDRESSES = Object.keys(ACCOUNT_SECRETS);
