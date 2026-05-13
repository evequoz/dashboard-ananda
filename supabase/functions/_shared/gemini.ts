export type ClassifyResult = { score: number; category: string };

export async function classifyEmail(
  subject: string,
  from: string,
  snippet: string,
): Promise<ClassifyResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return { score: 0.5, category: 'unknown' };

  const prompt = `Tu es un filtre email. Analyse cet email et retourne UNIQUEMENT un JSON valide.

Expéditeur: ${from}
Sujet: ${subject}
Début contenu: ${snippet.slice(0, 300)}

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
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 128 },
    }),
  });
  if (!res.ok) return { score: 0.5, category: 'unknown' };
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"score":0.5,"category":"unknown"}';
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as ClassifyResult;
    const score = typeof parsed.score === 'number' ? Math.min(1, Math.max(0, parsed.score)) : 0.5;
    const category = typeof parsed.category === 'string' ? parsed.category : 'unknown';
    return { score, category };
  } catch {
    return { score: 0.5, category: 'unknown' };
  }
}
