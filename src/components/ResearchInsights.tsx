import { useState, useEffect, useCallback } from 'react';
import { Paper } from '../types';
import { Sparkles, Lightbulb, Compass, Globe, Construction } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateText } from '../lib/gemini';
import { db } from '../lib/firebase';
import { getDocs, collection } from 'firebase/firestore';
import { motion } from 'motion/react';
import { GenerationFailed, GenerationLoading } from './GenerationState';

export function ResearchInsights({ paper }: { paper: Paper }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const chunksSnapshot = await getDocs(collection(db, `papers/${paper.id}/chunks`));
        const content = chunksSnapshot.docs.slice(0, 5).map(doc => doc.data().content).join("\n");

        if (!content.trim()) {
          setData(null);
          setError("There's no readable text saved for this paper yet.");
          return;
        }

        const prompt = `Provide research insights for this paper in JSON format.
        
Content:
${content}

JSON structure:
{
  "improvements": ["Possible improvement 1"],
  "directions": ["Future direction 1"],
  "applications": ["Real world app 1"],
  "difficulty": "Easy/Medium/Hard explaining why"
}
Return ONLY the JSON.`;

        const text = await generateText(prompt, { json: true });

        const parsed = JSON.parse(text || '{}');
        if (!parsed || Object.keys(parsed).length === 0) {
          setData(null);
          setError('Nothing came back for this paper. Try again in a moment.');
          return;
        }
        setData(parsed);
      } catch (e) {
        console.error(e);
        setData(null);
        setError("Couldn't generate insights. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
  }, [paper.id]);

  useEffect(() => {
    generate();
  }, [generate]);

  if (loading) return <GenerationLoading message="Reading the paper…" />;

  if (!data) {
    return (
      <GenerationFailed
        message={error ?? 'Nothing to show for this paper yet.'}
        onRetry={generate}
      />
    );
  }

  const sections = [
    { title: 'Implementation Difficulty', icon: Construction, content: [data.difficulty], color: 'text-orange-400' },
    { title: 'Possible Improvements', icon: Lightbulb, content: data.improvements, color: 'text-yellow-400' },
    { title: 'Related Directions', icon: Compass, content: data.directions, color: 'text-blue-400' },
    { title: 'Real-world Applications', icon: Globe, content: data.applications, color: 'text-accent-ink' },
  ];

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-12 pb-32">
      <div className="flex items-center gap-5 border-b border-border pb-8">
        <div className="w-12 h-12 bg-accent-soft rounded-full flex items-center justify-center border border-accent/30 shadow-inner">
          <Sparkles className="w-6 h-6 text-accent-ink" />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">Insights</h2>
          <p className="text-xs uppercase font-bold tracking-[0.25em] text-muted-foreground">Connections and open questions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sections.map((section, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: idx % 2 === 0 ? -15 : 15 }}
            animate={{ opacity: 1, x: 0 }}
            key={section.title} 
            className="bg-card border border-border p-8 rounded-xl space-y-6 hover:border-accent/30 transition-all group shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-muted rounded-xl group-hover:text-accent-ink transition-colors">
                <section.icon className={cn("w-5 h-5", section.color)} />
              </div>
              <h3 className="font-bold text-[10px] text-muted-foreground border-b border-border flex-1 pb-1">{section.title}</h3>
            </div>
            <ul className="space-y-4">
              {section.content.map((item: string, i: number) => (
                <li key={i} className="text-sm text-foreground/80 flex items-start gap-4 leading-relaxed font-serif">
                  <div className="w-1 h-1 rounded-full bg-border mt-2.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
