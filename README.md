# 📚 PaperMind — AI Research-Paper Assistant

**Live:** <https://papermind-sand.vercel.app>

Turns a dense research paper into an interactive study session: AI summaries,
beginner-friendly explanations, auto-generated flashcards and quizzes, and a
chat that answers questions **grounded in the paper's own text** via
retrieval-augmented generation.

## ✨ Features

- **Upload** a PDF or DOCX — text is extracted **entirely in the browser**
  (pdf.js / mammoth), chunked with overlap, and stored per-user
- **Summarize** — structured overview, key contributions, and plain-language
  explanations
- **Chat with the paper** — every question retrieves the most relevant chunks
  (top-k ranking) and the answer is grounded on them
- **Flashcards & quizzes** — generated from the paper, saved to your library
- **Auth & persistence** — Firebase authentication; papers, chunks, decks, and
  chat history live in Firestore

## 🏗️ Architecture

```
[React SPA (Vite + Tailwind)]
   │  in-browser PDF/DOCX text extraction (lazy-loaded pdf.js / mammoth)
   ▼
[Firebase Auth + Firestore]        papers · chunks · messages · decks
   │  top-k lexical retrieval over the paper's chunks (client)
   ▼
[/api/generate — Vercel serverless function]
   │  origin allowlist · rate limiting · prompt caps · model allowlist
   ▼
[Google Gemini]                    gemini-3.5-flash
```

Two deliberate decisions:

1. **No upload server.** Text extraction runs in the browser, so the app
   deploys as a static site plus one tiny function — nothing to keep alive,
   no server file-size limits, and the parsing step costs nothing.
2. **The Gemini key never ships to the client.** All generation goes through
   `api/generate.ts`, which holds the key server-side and protects itself
   with an origin allowlist, per-IP + global rate limits, and a prompt-size
   cap.

## 🛠️ Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Firebase (Auth + Firestore) ·
Google Gemini (`@google/genai`) · pdf.js · mammoth · Vercel

## 🚀 Run locally

```bash
npm install
npm run dev
```

The dev server proxies `/api/*` to the deployed function, so you don't need a
key locally. To run the function itself locally, use `vercel dev` with
`GEMINI_API_KEY` in your environment (see `.env.example`).

## 🔐 Deployment

Push to `main` → Vercel builds the Vite app and the `api/` function.
One environment variable is required: **`GEMINI_API_KEY`** (server-side).

## 👤 Author

**Marco Andrei R. Belen** — Computer Science (Machine Learning) student, NU Lipa

[Portfolio](https://marcobelen.vercel.app) · [GitHub](https://github.com/codrei) · [LinkedIn](https://www.linkedin.com/in/marco-andrei-belen/)
