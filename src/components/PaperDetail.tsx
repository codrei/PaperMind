import { useState, useEffect } from 'react';
import { Paper } from '../types';
import { 
  ArrowLeft, FileText, Layout, MessageSquare, 
  Sparkles, ListChecks, Brain, Share2, Download,
  ExternalLink, ChevronRight, Activity, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatWindow } from './ChatWindow';
import { Summarizer } from './Summarizer';
import { QuizGenerator } from './QuizGenerator';
import { FlashcardGenerator } from './FlashcardGenerator';
import { ArchitectureViewer } from './ArchitectureViewer';
import { ResearchInsights } from './ResearchInsights';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface PaperDetailProps {
  paper: Paper | undefined;
  onBack: () => void;
}

type Tab = 'chat' | 'summary' | 'architecture' | 'quiz' | 'flashcards' | 'insights';

export function PaperDetail({ paper, onBack }: PaperDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  if (!paper) return null;

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Share link copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const handleDownload = () => {
    toast.info("Extracting PDF from archive...", {
      description: "Note: In this preview, PDF local storage is temporary."
    });
    // In a production environment with Firebase Storage, we would use paper.fileUrl
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'chat', label: 'Paper Chat', icon: MessageSquare },
    { id: 'summary', label: 'AI Summary', icon: Layout },
    { id: 'architecture', label: 'Architecture', icon: Activity },
    { id: 'quiz', label: 'Practice Quiz', icon: ListChecks },
    { id: 'flashcards', label: 'Flashcards', icon: Brain },
    { id: 'insights', label: 'Insights', icon: Sparkles },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-background z-10 gap-4">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-border shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
               <span className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em] truncate">Research Manuscript</span>
            </div>
            <h2 className="font-bold text-lg sm:text-xl truncate pr-4 text-foreground font-serif tracking-tight">{paper.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-11 sm:ml-0">
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold bg-background border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 rounded-full transition-all whitespace-nowrap"
          >
            <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> PDF
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold bg-accent hover:bg-accent-hover text-accent-fg rounded-full transition-all shadow-lg whitespace-nowrap"
          >
            <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Share
          </button>
        </div>
      </header>

      {/* Tabs / Navigation */}
      <nav className="flex items-center gap-1 sm:gap-2 px-2 sm:px-6 bg-background border-b border-border overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-bold transition-all whitespace-nowrap",
                isActive ? "text-accent-ink" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {isActive && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.99, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: -5 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full w-full"
          >
            {activeTab === 'chat' && <ChatWindow paper={paper} />}
            {activeTab === 'summary' && <Summarizer paper={paper} />}
            {activeTab === 'architecture' && <ArchitectureViewer paper={paper} />}
            {activeTab === 'quiz' && <QuizGenerator paper={paper} />}
            {activeTab === 'flashcards' && <FlashcardGenerator paper={paper} />}
            {activeTab === 'insights' && <ResearchInsights paper={paper} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
