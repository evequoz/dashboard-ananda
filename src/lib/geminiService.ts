import { getValidSession } from './supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

export const askGemini = async (prompt: string, forceJson = false) => {
  if (!prompt?.trim()) throw new Error("Le prompt est requis.");

  const { session, error } = await getValidSession();
  const token = session?.access_token;
  if (!token || error) {
    throw new Error(error?.message || 'Session Supabase introuvable. Reconnectez-vous pour appeler l’IA.');
  }
  const functionUrl = `${supabaseUrl}/functions/v1/gemini-pro`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erreur lors de la communication avec l'IA.");

  const textResponse: string = data.response || data.text || "";
  if (!forceJson) return { success: true, text: textResponse };

  const start = textResponse.indexOf('{');
  const end = textResponse.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error("Format JSON invalide retourné par l'IA.");

  const jsonContent = textResponse.substring(start, end + 1);
  return { success: true, data: JSON.parse(jsonContent) };
};

