import { supabase } from './supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const claudeFunctionName = import.meta.env.VITE_SUPABASE_CLAUDE_FUNCTION || 'claude-pro';

export const askClaude = async (prompt: string, forceJson = false) => {
  if (!prompt?.trim()) throw new Error('Le prompt est requis.');

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const functionUrl = `${supabaseUrl}/functions/v1/${claudeFunctionName}`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || supabaseAnonKey}`,
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      data.error ||
      `Erreur Claude. Vérifie la fonction Supabase "${claudeFunctionName}" et la clé ANTHROPIC_API_KEY.`
    );
  }

  const textResponse: string = data.response || data.text || '';
  if (!forceJson) return { success: true, text: textResponse };

  const start = textResponse.indexOf('{');
  const end = textResponse.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Format JSON invalide retourné par Claude.');

  const jsonContent = textResponse.substring(start, end + 1);
  return { success: true, data: JSON.parse(jsonContent) };
};
