import { Paper } from '../types';
import { useAuth } from '../AuthWrapper';
import { Book, Plus, LogOut, FileText, ChevronRight, Moon, Sun, Info, History, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AboutModal } from './AboutModal';
import { ActivityLog } from './ActivityLog';
import { useState } from 'react';

interface SidebarProps {
  papers: Paper[];
  onSelectPaper: (id: string | null) => void;
  selectedPaperId: string | null;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ papers, onSelectPaper, selectedPaperId, theme, toggleTheme, isOpen, onClose }: SidebarProps) {
  const { logout, user } = useAuth();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[50] lg:relative lg:translate-x-0 w-64 flex flex-col bg-background border-r border-border h-full transition-transform duration-300 ease-spring",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => {
              onSelectPaper(null);
              onClose?.();
            }}
          >
            <div className="bg-accent text-accent-fg w-8 h-8 rounded-lg flex items-center justify-center font-serif font-semibold text-lg">
              P
            </div>
            <span className="font-semibold text-xl text-foreground font-serif">PaperMind</span>
          </div>

          <button 
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-8 no-scrollbar">
        <nav className="space-y-1">
          <p className="px-3 text-xs font-medium text-muted-foreground/80 mb-2">Workspace</p>
          <button 
            onClick={() => onSelectPaper(null)}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-md transition-all",
              !selectedPaperId 
                ? "bg-muted text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Plus className="w-4 h-4" />
            New analysis
          </button>
          <button 
            onClick={() => setIsActivityOpen(true)}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all"
          >
            <History className="w-4 h-4" />
            Activity Log
          </button>
        </nav>

        <nav className="space-y-1">
          <p className="px-3 text-xs font-medium text-muted-foreground/80 mb-2">Papers</p>
          {papers.length === 0 && !selectedPaperId && (
            <p className="px-3 text-xs text-muted-foreground/70">No papers yet</p>
          )}
          {papers.map((paper) => (
            <button
              key={paper.id}
              onClick={() => onSelectPaper(paper.id)}
              className={cn(
                "group flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md transition-all border-l-2",
                selectedPaperId === paper.id 
                  ? "bg-accent-soft text-accent-ink border-accent" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
              )}
            >
              <FileText className={cn("w-4 h-4 shrink-0", selectedPaperId === paper.id ? "text-accent-ink" : "text-muted-foreground group-hover:text-muted-foreground")} />
              <span className="truncate text-left flex-1 font-medium">{paper.title}</span>
              <ChevronRight className={cn("w-3 h-3 transition-opacity", selectedPaperId === paper.id ? "opacity-100" : "opacity-0 group-hover:opacity-50")} />
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6 border-t border-border bg-muted/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-9 h-9 rounded-full border border-border" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold ring-1 ring-border">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setIsAboutOpen(true)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-accent-ink hover:bg-accent-soft rounded-md transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            Information
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-accent-ink hover:bg-accent-soft rounded-md transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-md transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>

      {/* Modals live OUTSIDE <aside>: the aside has a transform (translate-x),
          which would otherwise trap these fixed-positioned overlays inside the
          sidebar column instead of centering them over the whole screen. */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <ActivityLog isOpen={isActivityOpen} onClose={() => setIsActivityOpen(false)} />
    </>
  );
}
