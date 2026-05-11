import { GoogleGenAI } from "@google/genai";

// Import from import.meta.env for Vite compatibility in production
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY is not set. AI features will not work.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || '' }) as any;

export const MODELS = {
  text: "gemini-3-flash-preview",
  pro: "gemini-3.1-pro-preview",
  embedding: "gemini-embedding-2-preview"
};

export async function generateEmbeddings(text: string) {
  try {
    const model = ai.getGenerativeModel({ model: MODELS.embedding });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (e) {
    console.error("Embedding error:", e);
    return new Array(768).fill(0); // Fallback
  }
}

export function cosineSimilarity(vec1: number[], vec2: number[]) {
  const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (mag1 * mag2);
}
