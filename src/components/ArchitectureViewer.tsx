import { useState, useEffect } from 'react';
import { Paper } from '../types';
import { Activity, Loader2, Box, Network, Cpu } from 'lucide-react';
import { generateText } from '../lib/gemini';
import { db } from '../lib/firebase';
import { getDocs, collection } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function ArchitectureViewer({ paper }: { paper: Paper }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const generate = async () => {
      setLoading(true);
      try {
        const chunksSnapshot = await getDocs(collection(db, `papers/${paper.id}/chunks`));
        const content = chunksSnapshot.docs.slice(0, 5).map(doc => doc.data().content).join("\n");

        let prompt = "";
        if (!activeCategory) {
          prompt = `Explain the model architecture and training pipeline described in this research paper.
          
Content:
${content}

Provide a detailed, technical explanation suitable for a ML student. Use markdown formatting.`;
        } else {
          prompt = `Provide a deep-dive analysis of the **${activeCategory}** aspect of this research paper.
          
Content:
${content}

Focus exclusively on details related to ${activeCategory}. Use markdown formatting.`;
        }

        const text = await generateText(prompt);

        setData(text || null);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    generate();
  }, [paper.id, activeCategory]);

  if (loading && !data) return (
    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4 py-32">
      <Loader2 className="w-8 h-8 animate-spin text-accent-ink" />
      <p className="text-sm">Loading {activeCategory || "architecture"} details…</p>
    </div>
  );

  const categories = [
    { label: 'Input Space', icon: Box, id: 'Input Space' },
    { label: 'Neural Layers', icon: Network, id: 'Neural Layers' },
    { label: 'Compute Cost', icon: Cpu, id: 'Compute Cost' }
  ];

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-12 pb-32">
      <div className="flex items-center gap-5 border-b border-border pb-8">
        <div className="w-12 h-12 bg-accent-soft rounded-full flex items-center justify-center border border-accent/30 shadow-inner text-accent-ink">
          <Activity className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">Paper structure</h2>
          <p className="text-xs uppercase font-bold tracking-[0.25em] text-muted-foreground">How the paper is put together</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
         {categories.map(item => (
           <button 
             key={item.id} 
             onClick={() => setActiveCategory(activeCategory === item.id ? null : item.id)}
             className={cn(
               "p-5 rounded-2xl flex items-center gap-4 transition-all shadow-sm border text-left",
               activeCategory === item.id 
                 ? "bg-accent border-accent text-accent-fg" 
                 : "bg-muted/30 border-border text-muted-foreground hover:border-accent/30 hover:bg-muted/50"
             )}
           >
             <div className={cn(
               "p-2 rounded-lg transition-colors border",
               activeCategory === item.id 
                 ? "bg-accent border-accent" 
                 : "bg-background border-border group-hover:text-accent-ink"
             )}>
               <item.icon className="w-5 h-5" />
             </div>
             <span className="text-xs font-bold">{item.label}</span>
           </button>
         ))}
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl"
            >
              <Loader2 className="w-6 h-6 animate-spin text-accent-ink" />
            </motion.div>
          )}
          <motion.div 
            key={activeCategory + (data || "")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border p-10 rounded-xl prose dark:prose-invert max-w-none leading-relaxed font-serif text-foreground/80"
          >
            {data ? data.split('\n').map((line, i) => (
              <p key={i} className="mb-4 last:mb-0">{line}</p>
            )) : <p className="text-muted-foreground">Loading architecture details…</p>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
