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
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8 sm:space-y-16">
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8 border-b border-border pb-6 sm:pb-10">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight font-serif text-foreground leading-tight">Research Library</h1>
          <p className="text-muted-foreground text-base sm:text-lg">Manage your academic workspace and deconstruct complex architectures.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button 
            onClick={() => setIsAboutOpen(true)}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-bold text-[10px] sm:text-xs rounded-full transition-all uppercase tracking-widest whitespace-nowrap"
          >
            <Info className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-indigo-500" />
            About PaperMind
          </button>
          <div className="relative group w-full sm:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search library..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-5 py-2.5 sm:py-3 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all w-full sm:w-72 placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      </div>

      <div 
        {...getRootProps()} 
        className={cn(
          "relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all p-8 sm:p-16 text-center",
          isDragActive ? "border-indigo-500 bg-indigo-500/5" : "border-border hover:border-muted-foreground/30 hover:bg-muted/30",
          isUploading ? "opacity-50 cursor-not-allowed" : ""
        )}
      >
        <input {...getInputProps()} />
        <div className="max-w-sm mx-auto space-y-6">
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto ring-1 ring-border group-hover:ring-muted-foreground/20 transition-all shadow-sm">
            <Upload className={cn("w-10 h-10 transition-colors", isDragActive ? "text-indigo-400" : "text-muted-foreground group-hover:text-foreground")} />
          </div>
          <div className="space-y-2">
            <p className="font-bold text-2xl tracking-tight text-foreground">Import Research Manuscript</p>
            <p className="text-muted-foreground font-medium">Supports PDF and DOCX formats</p>
          </div>
        </div>
        {isUploading && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[4px] rounded-3xl flex items-center justify-center z-20">
            <div className="flex items-center gap-4 bg-card px-8 py-5 rounded-2xl border border-border shadow-xl">
              <PlusCircle className="w-6 h-6 animate-spin text-indigo-500" />
              <div className="text-left">
                <p className="font-bold text-foreground leading-none">Synthesizing Paper</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Chunking & Indexing...</p>
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
          <div className="col-span-full py-32 text-center space-y-6 bg-muted/20 rounded-3xl border border-border flex flex-col items-center">
            <div className="text-muted flex justify-center">
               <FileText className="w-20 h-20" />
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground font-bold text-xl font-serif">Your shelf is waiting</p>
              <p className="text-muted-foreground/60 text-sm max-w-xs">Upload your first research paper to begin your AI-assisted study session.</p>
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
              className="bg-card border border-border p-8 rounded-3xl hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer group relative shadow-sm"
            >
              <div className="flex flex-col h-full gap-6">
                <div className="flex justify-between items-start">
                  <div className="bg-muted p-3 rounded-xl ring-1 ring-border group-hover:ring-indigo-500/20 transition-all shadow-inner">
                    <FileText className="w-7 h-7 text-indigo-500" />
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, paper.id)}
                    className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
                
                <h3 className="font-bold text-xl leading-snug line-clamp-2 min-h-[3.5rem] group-hover:text-indigo-400 transition-colors font-serif text-foreground">
                  {paper.title}
                </h3>
                
                <div className="mt-auto flex items-center justify-between pt-6 border-t border-border">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                    {formatDate(paper.createdAt)}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform uppercase tracking-tighter">
                    Analyze <ArrowUpRight className="w-3.5 h-3.5" />
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
