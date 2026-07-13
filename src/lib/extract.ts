// Client-side document text extraction — runs entirely in the browser, so
// the app needs no upload server (works on any static host).
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ExtractResult {
  chunks: string[];
  metadata: { numpages: number; info: Record<string, unknown> };
}

// Split into overlapping chunks so context isn't lost at boundaries.
export function chunkText(text: string, size = 1000, overlap = 200): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    chunks.push(text.slice(index, index + size));
    index += size - overlap;
  }
  return chunks;
}

export async function extractFileText(file: File): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  let text = '';
  let numpages = 1;
  let info: Record<string, unknown> = {};

  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
    numpages = doc.numPages;
    const meta = await doc.getMetadata().catch(() => null);
    info = (meta?.info as Record<string, unknown>) ?? {};

    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items.map((item) => ('str' in item ? item.str : '')).join(' '),
      );
    }
    text = pages.join('\n');
  } else if (
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    text = result.value;
  } else {
    throw new Error(`Unsupported file type: ${file.type || name}. Please use PDF or DOCX.`);
  }

  if (!text.trim()) {
    throw new Error(
      'No readable text found — the document may be empty or contain only scanned images.',
    );
  }

  return { chunks: chunkText(text.trim()), metadata: { numpages, info } };
}
