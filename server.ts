import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createRequire } from 'module';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic middleware
  app.use(cors());
  
  // LOGGING MIDDLEWARE
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API REQUEST] ${req.method} ${req.url}`);
    }
    next();
  });

  // Multer for file uploads
  const storage = multer.memoryStorage();
  const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });

  // API Routes - BEFORE global body parsers to avoid interference with multipart
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/api/process-file', (req, res) => {
    console.log(`[UPLOAD] Starting upload process for ${req.url}`);
    
    upload.single('file')(req, res, async (err: any) => {
      if (err) {
        console.error('[MULTER ERROR]', err);
        return res.status(400).json({ 
          error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 50MB)' : (err.message || 'Upload failed')
        });
      }

      try {
        if (!req.file) {
          console.error('[API ERROR] File missing in request');
          return res.status(400).json({ error: 'No file received by the server.' });
        }

        const mimeType = req.file.mimetype;
        const fileName = req.file.originalname.toLowerCase();
        let text = '';
        let numpages = 1;
        let info = {};

        console.log(`[PROCESS] File: ${req.file.originalname} (${mimeType}), Size: ${req.file.size} bytes`);
        
        try {
          if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
            const data = await pdf(req.file.buffer);
            text = data.text;
            numpages = data.numpages || 1;
            info = data.info || {};
          } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
            fileName.endsWith('.docx')
          ) {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            text = result.value;
            numpages = 1; 
          } else {
            console.error('[API ERROR] Unsupported type:', mimeType);
            return res.status(400).json({ error: `Unsupported file type: ${mimeType}. Please use PDF or DOCX.` });
          }
        } catch (parseError: any) {
          console.error('[PARSE ERROR]', parseError);
          return res.status(422).json({ 
            error: 'Failed to extract text from this document. It might be corrupted or encrypted.',
            details: parseError.message 
          });
        }

        if (!text || text.trim().length === 0) {
          console.warn('[PROCESS WARNING] No text extracted');
          return res.status(422).json({ error: 'The document appears to be empty or contains only unreadable images.' });
        }

        const chunks = chunkText(text.trim(), 1000); 
        console.log(`[SUCCESS] Processed ${fileName}. Created ${chunks.length} chunks.`);

        return res.json({ 
          chunks,
          metadata: { numpages, info }
        });
      } catch (fatalError: any) {
        console.error('[FATAL PROCESS ERROR]', fatalError);
        return res.status(500).json({ 
          error: 'An unexpected server error occurred during processing.',
          details: fatalError?.message
        });
      }
    });
  });

  // Global body parsers - AFTER the multipart route
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API 404 handler
  app.all('/api/*', (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite/SPA logic
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler for JSON responses
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[Global Error Handler]', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err : undefined
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function chunkText(text: string, size: number): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    chunks.push(text.slice(index, index + size));
    index += size - 200; // Overlap of 200 characters
  }
  return chunks;
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
