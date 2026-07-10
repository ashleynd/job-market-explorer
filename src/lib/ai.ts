/**
 * AI provider abstraction. Both providers are called via plain fetch
 * (no SDK dependency) and return raw text, which the /api/ask route
 * parses and validates with Zod before anything reaches the UI.
 *
 * Provider selection:
 *   AI_PROVIDER=gemini | anthropic  (explicit)
 *   otherwise: GEMINI_API_KEY set → gemini; ANTHROPIC_API_KEY set → anthropic;
 *   neither → null (route falls back to mock mode).
 *
 * Gemini 2.5 Flash has a free tier (no card required) — see README.
 */

export type Provider = "gemini" | "anthropic";

export function resolveProvider(): Provider | null {
  const explicit = process.env.AI_PROVIDER;
  if (explicit === "gemini" || explicit === "anthropic") return explicit;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export async function askModel(
  provider: Provider,
  system: string,
  question: string
): Promise<string> {
  if (provider === "gemini") return askGemini(system, question);
  return askAnthropic(system, question);
}

async function askGemini(system: string, question: string): Promise<string> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 500,
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function askAnthropic(system: string, question: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system,
      messages: [{ role: "user", content: question }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic request failed: ${res.status}`);
  const data = await res.json();
  return (
    data?.content?.find((b: { type: string }) => b.type === "text")?.text ?? ""
  );
}
