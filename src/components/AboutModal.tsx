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
                <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center shadow-lg ">
                  <Info className="w-6 h-6 text-accent-fg" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold font-serif">About PaperMind</h2>
                  <p className="text-xs uppercase font-bold tracking-[0.25em] text-muted-foreground mt-1">A study tool for research papers</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-accent-ink">
                    <Brain className="w-5 h-5" />
                    <h3 className="font-bold text-[10px]">Summaries</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Upload a paper and get a plain-language summary of what it says — the abstract, the method, the findings, and why they matter.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-accent-ink">
                    <Target className="w-5 h-5" />
                    <h3 className="font-bold text-[10px]">Quizzes & flashcards</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Check what you actually understood, with quizzes and flashcards made from the paper you uploaded.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-amber-500">
                    <Zap className="w-5 h-5" />
                    <h3 className="font-bold text-[10px]">Paper structure</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    See how the paper is organised, plus the models, datasets, and setup it describes.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-rose-500">
                    <BookOpen className="w-5 h-5" />
                    <h3 className="font-bold text-[10px]">Your library</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your papers and study materials are saved to your account, so you can come back to them anytime.
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-border space-y-6">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent-soft rounded-full flex items-center justify-center border border-accent/30">
                      <User className="w-5 h-5 text-accent-ink" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Marco Andrei Belen</h4>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">3rd Year CS Student @ NU Lipa</p>
                    </div>
                  </div>
                </div>

                {/* Marco: swap this for your own words whenever you like — it
                    should sound like you, not like a product page. */}
                <div className="bg-accent-soft border border-accent/20 p-5 rounded-2xl">
                  <p className="text-xs text-muted-foreground leading-relaxed font-serif">
                    I built PaperMind as a student project. Reading research
                    papers for class was slow going, so I wanted something that
                    could explain a paper in plain language and then check
                    whether I&apos;d actually understood it.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <div className="bg-muted/30 p-6 rounded-2xl border border-border">
                  <p className="text-xs text-center text-muted-foreground leading-relaxed">
                    Built with React, TypeScript, and the Google Gemini API.
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
