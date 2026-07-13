// Serverless Gemini proxy — the API key lives only in this function's
// environment (GEMINI_API_KEY), never in the browser bundle.
import { GoogleGenAI } from '@google/genai';

declare const process: { env: Record<string, string | undefined> };

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  body?: unknown;
};
type Res = {
  setHeader(name: string, value: string): void;
  status(code: number): Res;
  json(body: unknown): void;
  end(): void;
};

const ALLOWED_ORIGINS = new Set(['https://papermind-sand.vercel.app']);
const ALLOWED_MODELS = new Set(['gemini-3.5-flash', 'gemini-3.1-pro-preview']);
const MAX_PROMPT_CHARS = 200_000;

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

// Best-effort in-memory rate limiting (resets on cold start): one active
// reader triggers several generations, so limits are per-burst generous.
const PER_IP_MAX = 30;
const PER_IP_WINDOW_MS = 10 * 60 * 1000;
const GLOBAL_MAX = 150;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const hitsByIp = new Map<string, number[]>();
let globalHits: number[] = [];

function clientIp(req: Req): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  globalHits = globalHits.filter((t) => now - t < GLOBAL_WINDOW_MS);
  if (globalHits.length >= GLOBAL_MAX) return true;

  const hits = (hitsByIp.get(ip) ?? []).filter((t) => now - t < PER_IP_WINDOW_MS);
  if (hits.length >= PER_IP_MAX) {
    hitsByIp.set(ip, hits);
    return true;
  }
  hits.push(now);
  hitsByIp.set(ip, hits);
  globalHits.push(now);

  if (hitsByIp.size > 1000) {
    for (const [key, stamps] of hitsByIp) {
      if (!stamps.some((t) => now - t < PER_IP_WINDOW_MS)) hitsByIp.delete(key);
    }
  }
  return false;
}

export default async function handler(req: Req, res: Res) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (isRateLimited(clientIp(req))) {
    return res.status(429).json({
      error: 'Too many requests in a short time. Please wait a few minutes.',
    });
  }

  const body = (req.body ?? {}) as { prompt?: unknown; json?: unknown; model?: unknown };
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  if (!prompt.trim()) return res.status(400).json({ error: 'Missing prompt' });
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(413).json({ error: 'Prompt too large' });
  }
  const model =
    typeof body.model === 'string' && ALLOWED_MODELS.has(body.model)
      ? body.model
      : 'gemini-3.5-flash';

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY configuration' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      ...(body.json === true
        ? { config: { responseMimeType: 'application/json' } }
        : {}),
    });
    return res.status(200).json({ text: response.text ?? '' });
  } catch (error) {
    console.error('Gemini generation failed:', error);
    return res.status(502).json({ error: 'Generation failed' });
  }
}
