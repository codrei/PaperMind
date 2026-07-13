import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { useAuth } from '../AuthWrapper';
import { Clock, Upload, ListChecks, Brain, MessageSquare, History, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../lib/utils';

interface Activity {
  id: string;
  type: 'upload' | 'chat' | 'quiz' | 'flashcard';
  description: string;
  paperId?: string;
  createdAt: any;
}

interface ActivityLogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityLog({ isOpen, onClose }: ActivityLogProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isOpen) return;

    const q = query(
      collection(db, `users/${user.uid}/activity`),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const a = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
      setActivities(a);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, isOpen]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'upload': return <Upload className="w-4 h-4 text-accent-ink" />;
      case 'chat': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'quiz': return <ListChecks className="w-4 h-4 text-amber-500" />;
      case 'flashcard': return <Brain className="w-4 h-4 text-rose-500" />;
      default: return <History className="w-4 h-4" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-border shadow-2xl z-[90] flex flex-col"
          >
            <div className="p-8 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-soft rounded-xl flex items-center justify-center border border-accent/30 text-accent-ink">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-serif">Research Activity</h2>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">Chronological Vector Log</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 bg-muted/40 rounded-2xl animate-pulse" />
                ))
              ) : activities.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <History className="w-12 h-12 text-muted-foreground" />
                  <p className="text-sm font-medium">No activity logged yet.</p>
                </div>
              ) : (
                activities.map((activity, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={activity.id}
                    className="flex gap-5 group"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border group-hover:ring-accent/30 transition-all shadow-sm shrink-0">
                        {getIcon(activity.type)}
                      </div>
                      <div className="w-0.5 h-full bg-border rounded-full group-last:hidden" />
                    </div>
                    <div className="flex-1 pt-1 pb-6 space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-bold text-accent-ink bg-accent-soft px-2 py-0.5 rounded-md border border-accent/20">
                          {activity.type}
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {activity.createdAt?.seconds ? formatDate(activity.createdAt.seconds * 1000) : 'Just now'}
                        </div>
                      </div>
                      <p className="text-xs font-serif text-foreground leading-relaxed">
                        {activity.description}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="p-8 border-t border-border bg-muted/10">
              <p className="text-[9px] text-center text-muted-foreground font-bold">
                End-to-End Activity Encryption Active
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
