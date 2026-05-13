/**
 * Read fetch Response as JSON without throwing on empty bodies (avoids
 * "Unexpected end of JSON input" from Response.json() on 200 + empty body).
 */
export async function parseJsonResponseBody(res: Response): Promise<unknown | null> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed) as unknown;
}
