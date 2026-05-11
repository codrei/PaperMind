import { useState, useEffect } from 'react';
import { Paper } from '../types';
import { Sparkles, Loader2, Lightbulb, Compass, Globe, Construction } from 'lucide-react';
import { cn } from '../lib/utils';
import { ai, MODELS } from '../lib/gemini';
import { db } from '../lib/firebase';
import { getDocs, collection } from 'firebase/firestore';
import { motion } from 'motion/react';

export function ResearchInsights({ paper }: { paper: Paper }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const generate = async () => {
      setLoading(true);
      try {
        const chunksSnapshot = await getDocs(collection(db, `papers/${paper.id}/chunks`));
        const content = chunksSnapshot.docs.slice(0, 5).map(doc => doc.data().content).join("\n");

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

        const response = await ai.models.generateContent({
          model: MODELS.text,
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });

        setData(JSON.parse(response.text || '{}'));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    generate();
  }, [paper.id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <p className="text-sm">Mining field-wide insights...</p>
    </div>
  );

  if (!data) return null;

  const sections = [
    { title: 'Implementation Difficulty', icon: Construction, content: [data.difficulty], color: 'text-orange-400' },
    { title: 'Possible Improvements', icon: Lightbulb, content: data.improvements, color: 'text-yellow-400' },
    { title: 'Related Directions', icon: Compass, content: data.directions, color: 'text-blue-400' },
    { title: 'Real-world Applications', icon: Globe, content: data.applications, color: 'text-emerald-400' },
  ];

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-12 pb-32">
      <div className="flex items-center gap-5 border-b border-border pb-8">
        <div className="w-12 h-12 bg-indigo-600/10 rounded-full flex items-center justify-center border border-indigo-500/20 shadow-inner">
          <Sparkles className="w-6 h-6 text-indigo-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">Paper Intelligence</h2>
          <p className="text-xs uppercase font-bold tracking-[0.25em] text-muted-foreground">Cross-Domain Synthesis & Future Vectors</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sections.map((section, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: idx % 2 === 0 ? -15 : 15 }}
            animate={{ opacity: 1, x: 0 }}
            key={section.title} 
            className="bg-card border border-border p-8 rounded-3xl space-y-6 hover:border-indigo-500/30 transition-all group shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-muted rounded-xl group-hover:text-indigo-500 transition-colors">
                <section.icon className={cn("w-5 h-5", section.color)} />
              </div>
              <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border flex-1 pb-1">{section.title}</h3>
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
