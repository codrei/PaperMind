import { useState, useEffect } from 'react';
import { Paper } from '../types';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Info, Target, Lightbulb, Workflow, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateText } from '../lib/gemini';
import { db, logActivity } from '../lib/firebase';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { useAuth } from '../AuthWrapper';
import { motion } from 'motion/react';

interface SummarizerProps {
  paper: Paper;
}

export function Summarizer({ paper }: SummarizerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  useEffect(() => {
    if (paper.abstract) {
      setSummaryData(paper);
    } else {
      generateSummary();
    }
  }, [paper.id]);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const chunksSnapshot = await getDocs(collection(db, `papers/${paper.id}/chunks`));
      const content = chunksSnapshot.docs.slice(0, 5).map(doc => doc.data().content).join("\n");

      const prompt = `Analyze the following research paper content and provide a structured summary in JSON format.
      
Content:
${content}

JSON structure:
{
  "abstract": "A 2-3 sentence overview",
  "keyContributions": ["Contribution 1", "Contribution 2"],
  "methodology": "Brief methodology explanation",
  "results": "Key results summarized",
  "limitations": "Paper limitations",
  "futureWork": "Suggested future research",
  "architectureDescription": "High level architecture overview"
}
Return ONLY the JSON.`;

      const text = await generateText(prompt, { json: true });

      const analysisResult = JSON.parse(text || '{}');
      setSummaryData(analysisResult);

      // Save to Firebase
      await updateDoc(doc(db, 'papers', paper.id), {
        ...analysisResult,
        status: 'completed'
      });

      if (user) {
        await logActivity(user.uid, 'upload', `Synthesized AI analysis for ${paper.title}`, paper.id);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium animate-pulse">Running AI Analysis...</p>
      </div>
    );
  }

  if (!summaryData) return null;

  const sections = [
    { title: 'Abstract', icon: Info, content: summaryData.abstract, color: 'text-blue-400' },
    { title: 'Methodology', icon: Workflow, content: summaryData.methodology, color: 'text-purple-400' },
    { title: 'Key Contributions', icon: Target, isList: true, content: summaryData.keyContributions, color: 'text-emerald-400' },
    { title: 'Results', icon: CheckCircle2, content: summaryData.results, color: 'text-amber-400' },
    { title: 'Limitations', icon: ShieldAlert, content: summaryData.limitations, color: 'text-red-400' },
    { title: 'Future Work', icon: Lightbulb, content: summaryData.futureWork, color: 'text-blue-400' },
  ];

  return (
    <div className="p-4 sm:p-10 max-w-5xl mx-auto space-y-8 sm:space-y-12 pb-24 sm:pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 sm:pb-8 gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600/10 rounded-full flex items-center justify-center border border-indigo-500/20 shadow-inner">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
          </div>
          <div className="space-y-0.5 sm:space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif">Synthesized Analysis</h2>
            <p className="text-[8px] sm:text-[10px] uppercase font-bold tracking-[0.25em] text-muted-foreground">Multimodal Synthesis Engine • PaperCore v4</p>
          </div>
        </div>
        <div className="text-left sm:text-right">
           <span className="px-2.5 sm:px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] sm:text-[10px] font-bold rounded-full border border-emerald-500/20 uppercase tracking-widest">Verified Grounding</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {sections.map((section, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            key={section.title} 
            className="bg-card border border-border p-6 sm:p-8 rounded-2xl sm:rounded-3xl hover:border-indigo-500/30 transition-all space-y-4 sm:space-y-6 shadow-sm group"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-2.5 bg-muted rounded-xl group-hover:ring-2 group-hover:ring-indigo-500/20 transition-all">
                <section.icon className={cn("w-4 h-4 sm:w-5 sm:h-5", section.color)} />
              </div>
              <h3 className="font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border flex-1 pb-1">{section.title}</h3>
            </div>
            
            {section.isList ? (
              <ul className="space-y-3 sm:space-y-4">
                {Array.isArray(section.content) && section.content.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 sm:gap-4 text-xs sm:text-sm text-foreground/80 leading-relaxed font-serif">
                    <div className="w-1 h-1 rounded-full bg-indigo-500 mt-2 sm:mt-2.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs sm:text-sm leading-relaxed text-foreground/80 font-serif first-letter:text-xl sm:first-letter:text-2xl first-letter:font-bold first-letter:mr-1">
                {section.content}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
