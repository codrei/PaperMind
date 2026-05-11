import { motion, AnimatePresence } from 'motion/react';
import { X, Info, Brain, Zap, Target, BookOpen, User } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-background border border-border shadow-2xl rounded-[2.5rem] z-[70] overflow-hidden"
          >
            <div className="absolute top-6 right-6">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-12 space-y-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <Info className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold font-serif">About PaperMind</h2>
                  <p className="text-xs uppercase font-bold tracking-[0.25em] text-muted-foreground mt-1">AI Research Intelligence Engine</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-indigo-500">
                    <Brain className="w-5 h-5" />
                    <h3 className="font-bold uppercase tracking-widest text-[10px]">Neural Synthesis</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    PaperMind uses advanced language models to deconstruct complex research papers into digestible, high-level insights.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-emerald-500">
                    <Target className="w-5 h-5" />
                    <h3 className="font-bold uppercase tracking-widest text-[10px]">Adaptive Practice</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Verify your understanding through dynamically generated quizzes and flashcards tailored specifically to your data.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-amber-500">
                    <Zap className="w-5 h-5" />
                    <h3 className="font-bold uppercase tracking-widest text-[10px]">Architecture Mapping</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Automatically map model architectures, input spaces, and compute costs mentioned in technical manuscripts.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-rose-500">
                    <BookOpen className="w-5 h-5" />
                    <h3 className="font-bold uppercase tracking-widest text-[10px]">Persistent Knowledge</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your library is stored securely, allowing you to return to your research vectors and study materials at any time.
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-border space-y-6">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20">
                      <User className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Marco Andrei Belen</h4>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">2nd Year CS Student @ NU Lipa</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground font-medium">Build v1.0.5</p>
                  </div>
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/10 p-5 rounded-2xl">
                  <p className="text-xs text-muted-foreground leading-relaxed italic font-serif">
                    "I built PaperMind as a tool to help fellow students and researchers navigate the overwhelming wave of academic literature. My goal is to save researchers time by synthesizing complex technical manuscripts into actionable insights."
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <div className="bg-muted/30 p-6 rounded-2xl border border-border">
                  <p className="text-xs text-center text-muted-foreground leading-relaxed">
                    Designed for researchers, students, and engineers. <br/>
                    <span className="font-bold text-foreground">PaperMind</span> empowers you to master complex literature at 10x speed.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
