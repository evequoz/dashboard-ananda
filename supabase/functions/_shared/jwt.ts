export function jwtPayload(authHeader: string | null): Record<string, unknown> | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isServiceRoleJwt(authHeader: string | null): boolean {
  return jwtPayload(authHeader)?.role === 'service_role';
}
