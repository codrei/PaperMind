// All Gemini calls go through /api/generate (a Vercel serverless function),
// so the API key never ships to the browser.

export const MODELS = {
  text: "gemini-3.5-flash",
  pro: "gemini-3.1-pro-preview",
};

/** Single entry point for text generation, proxied through the backend. */
export async function generateText(
  prompt: string,
  opts: { json?: boolean; model?: string } = {},
): Promise<string> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      json: opts.json === true,
      ...(opts.model ? { model: opts.model } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    text?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Generation failed (${res.status})`);
  }
  return data.text ?? "";
}

/**
 * Lexical retrieval: rank chunks by how many of the query's terms they
 * contain and return the top k as grounding context.
 */
export function rankChunks(query: string, chunks: string[], k = 8): string[] {
  const terms: string[] = query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  if (terms.length === 0) return chunks.slice(0, k);

  return chunks
    .map((content, index) => {
      const haystack = content.toLowerCase();
      const score = terms.reduce(
        (acc, term) => acc + (haystack.includes(term) ? 1 : 0),
        0,
      );
      return { content, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, k)
    .map((entry) => entry.content);
}
