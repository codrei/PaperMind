import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paper } from '../types';
import { Upload, FileText, Clock, Trash2, ArrowUpRight, Search, PlusCircle, Info } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { AboutModal } from './AboutModal';
import { db, logActivity } from '../lib/firebase';
import { collection, addDoc, doc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../AuthWrapper';
import { toast } from 'sonner';
import { motion } from 'motion/react';


interface DashboardProps {
  papers: Paper[];
  isLoading: boolean;
  onSelectPaper: (id: string) => void;
}

export function Dashboard({ papers, isLoading, onSelectPaper }: DashboardProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    const fileName = file.name.toLowerCase();
    const isPDF = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isDOCX = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx');
    
    if (!isPDF && !isDOCX) {
      toast.error(`"${file.name}" is not a supported file type. Please upload a PDF or DOCX file.`);
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Processing "${file.name}"...`);

    try {
      // 1. Extract text in the browser — no upload server needed.
      // Lazy-loaded so the PDF engine isn't in the initial bundle.
      const { extractFileText } = await import('../lib/extract');
      const { chunks, metadata } = await extractFileText(file);

      if (!chunks || chunks.length === 0) {
        throw new Error("No readable text could be extracted from this PDF.");
      }

      // 2. Create paper entry in Firestore
      const paperRef = await addDoc(collection(db, 'papers'), {
        userId: user.uid,
        title: file.name,
        status: 'completed',
        createdAt: serverTimestamp(),
        metadata: metadata || {}
      });

      // 3. Store chunks in Firestore using Batches (max 500 per batch)
      const batchSize = 400;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = writeBatch(db);
        const currentChunks = chunks.slice(i, i + batchSize);
        
        currentChunks.forEach((chunk) => {
          const chunkRef = doc(collection(db, `papers/${paperRef.id}/chunks`));
          batch.set(chunkRef, {
            paperId: paperRef.id,
            content: chunk,
            userId: user.uid,
            createdAt: serverTimestamp()
          });
        });
        
        await batch.commit();
      }

      await logActivity(user.uid, 'upload', `Uploaded paper: ${file.name}`, paperRef.id);
      toast.success("Paper analyzed and saved to library!", { id: toastId });
      onSelectPaper(paperRef.id);
    } catch (error: any) {
      console.error("PDF Processing Error:", error);
      toast.error(`Upload failed: ${error.message || "Unknown error"}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  }, [user, onSelectPaper]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false,
    disabled: isUploading
  } as any);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this paper?")) return;
    
    try {
      await deleteDoc(doc(db, 'papers', id));
      toast.success("Paper deleted");
    } catch (error) {
      toast.error("Failed to delete paper");
    }
  };

  const filteredPapers = papers.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8 sm:space-y-10">
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8 border-b border-border pb-6 sm:pb-10">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-semibold font-serif text-foreground leading-tight">Papers</h1>
          <p className="text-muted-foreground text-base">Upload a PDF or Word file to start reading it with AI.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={() => setIsAboutOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-sm rounded-lg transition-colors whitespace-nowrap"
          >
            <Info className="w-4 h-4 text-accent-ink" />
            About
          </button>
          <div className="relative group w-full sm:w-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent-ink transition-colors" />
            <input
              type="text"
              placeholder="Search papers"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all w-full sm:w-64 placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      </div>

      <div 
        {...getRootProps()} 
        className={cn(
          "relative group cursor-pointer rounded-xl border-2 border-dashed transition-all p-8 sm:p-16 text-center",
          isDragActive ? "border-accent bg-accent-soft" : "border-border hover:border-muted-foreground/30 hover:bg-muted/30",
          isUploading ? "opacity-50 cursor-not-allowed" : ""
        )}
      >
        <input {...getInputProps()} />
        <div className="max-w-sm mx-auto space-y-6">
          <div className="w-16 h-16 bg-card rounded-xl flex items-center justify-center mx-auto border border-border group-hover:border-accent/40 transition-colors">
            <Upload className={cn("w-8 h-8 transition-colors", isDragActive ? "text-accent-ink" : "text-muted-foreground group-hover:text-foreground")} />
          </div>
          <div className="space-y-2">
            <p className="font-serif font-semibold text-xl text-foreground">Drag a file here, or browse</p>
            <p className="text-muted-foreground text-sm">PDF or Word (.docx) — read in your browser, nothing is uploaded to a server.</p>
          </div>
        </div>
        {isUploading && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[4px] rounded-xl flex items-center justify-center z-20">
            <div className="flex items-center gap-3.5 bg-card px-6 py-4 rounded-xl border border-border shadow-md">
              <PlusCircle className="w-5 h-5 animate-spin text-accent-ink" />
              <div className="text-left">
                <p className="font-semibold text-foreground leading-none">Reading your paper</p>
                <p className="text-xs text-muted-foreground mt-1.5">Extracting and indexing the text…</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted/40 rounded-2xl animate-pulse ring-1 ring-border" />
          ))
        ) : filteredPapers.length === 0 ? (
          <div className="col-span-full py-24 text-center space-y-4 bg-muted/40 rounded-xl border border-border flex flex-col items-center">
            <FileText className="w-14 h-14 text-muted-foreground/40" strokeWidth={1.25} />
            <div className="space-y-1.5">
              <p className="text-foreground font-semibold text-lg font-serif">No papers yet</p>
              <p className="text-muted-foreground text-sm max-w-xs">Upload your first paper above to get started.</p>
            </div>
          </div>
        ) : (
          filteredPapers.map((paper) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={paper.id}
              onClick={() => onSelectPaper(paper.id)}
              className="bg-card border border-border p-6 rounded-xl hover:border-accent hover:shadow-md transition-all cursor-pointer group relative"
            >
              <div className="flex flex-col h-full gap-5">
                <div className="flex justify-between items-start">
                  <div className="bg-accent-soft p-2.5 rounded-lg">
                    <FileText className="w-5 h-5 text-accent-ink" />
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, paper.id)}
                    className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-semibold text-lg leading-snug line-clamp-2 min-h-[3.25rem] transition-colors font-serif text-foreground">
                  {paper.title}
                </h3>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {formatDate(paper.createdAt)}
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-accent-ink">
                    Open <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
