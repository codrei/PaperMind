import { useState, useEffect } from 'react';
import { Paper, Flashcard } from '../types';
import { 
  Brain, Loader2, RefreshCw, Layers, 
  RotateCw, ChevronLeft, ChevronRight, Play 
} from 'lucide-react';
import { ai, MODELS } from '../lib/gemini';
import { db, logActivity } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../AuthWrapper';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface FlashcardGeneratorProps {
  paper: Paper;
}

export function FlashcardGenerator({ paper }: FlashcardGeneratorProps) {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'flashcards'),
      where('paperId', '==', paper.id),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const fetchFlashcards = async () => {
      const snap = await getDocs(q);
      setFlashcards(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flashcard)));
    };
    fetchFlashcards();
  }, [paper.id, user]);

  const generateFlashcards = async () => {
    setLoading(true);
    try {
      const chunksSnapshot = await getDocs(collection(db, `papers/${paper.id}/chunks`));
      const content = chunksSnapshot.docs.slice(0, 5).map(doc => doc.data().content).join("\n");

      const prompt = `Generate 5 high-quality study flashcards from this research paper.
      
Content:
${content}

JSON structure:
[
  { "front": "Term or Question", "back": "Definition or Answer" }
]
Return ONLY the JSON array.`;

      const model = ai.getGenerativeModel({ 
        model: MODELS.text,
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent(prompt);
      const geminiResponse = await result.response;
      const text = geminiResponse.text();

      const cardsData = JSON.parse(text || '[]');
      
      const newCards: Flashcard[] = [];
      for (const card of cardsData) {
        const docRef = await addDoc(collection(db, 'flashcards'), {
          ...card,
          paperId: paper.id,
          userId: user?.uid,
          createdAt: Date.now()
        });
        newCards.push({ id: docRef.id, ...card, paperId: paper.id, userId: user?.uid!, createdAt: Date.now() });
      }

      await logActivity(user!.uid, 'flashcard', `Constructed flashcards for ${paper.title}`, paper.id);
      setFlashcards([...newCards, ...flashcards]);
      setIsReviewMode(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev + 1) % flashcards.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev - 1 + flashcards.length) % flashcards.length);
  };

  if (isReviewMode && flashcards.length > 0) {
    return (
      <div className="p-10 max-w-2xl mx-auto flex flex-col items-center justify-center h-full space-y-12">
        <div className="w-full flex items-center justify-between border-b border-border pb-6">
           <button onClick={() => setIsReviewMode(false)} className="text-muted-foreground hover:text-foreground text-[10px] uppercase font-bold tracking-widest transition-colors">
             ← Return to Deck
           </button>
           <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] font-mono">
             Sequence {currentIndex + 1} / {flashcards.length}
           </div>
        </div>

        <div 
          className="relative w-full max-w-lg aspect-[4/3] perspective-1000 cursor-pointer group"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 25 }}
            className="relative w-full h-full preserve-3d"
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-card border-2 border-border rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center shadow-lg group-hover:border-indigo-500/40 transition-colors">
               <div className="absolute top-8 left-10 text-[8px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Flashcard Manuscript Type: A</div>
               <Layers className="w-6 h-6 text-muted-foreground/30 absolute bottom-8 right-10" />
               <h3 className="text-3xl font-bold text-foreground font-serif leading-tight">{flashcards[currentIndex].front}</h3>
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                 <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2 bg-background px-4 py-2 rounded-full border border-border">
                   <RotateCw className="w-3 h-3 text-indigo-500" /> Tap to decode
                 </p>
               </div>
            </div>
            
            {/* Back */}
            <div 
              className="absolute inset-0 backface-hidden bg-indigo-600 border-2 border-indigo-500 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center shadow-2xl"
              style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
            >
               <div className="absolute top-8 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-500 rounded-full border border-indigo-400">
                 <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-white">Synthesized Key Result</span>
               </div>
               <div className="space-y-6">
                 <Brain className="w-8 h-8 text-indigo-200/50 mx-auto" />
                 <h3 className="text-2xl font-bold text-white leading-relaxed font-serif">
                   {flashcards[currentIndex].back}
                 </h3>
               </div>
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                 <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest flex items-center gap-2">
                   <RotateCw className="w-3 h-3" /> Tap to hide vector
                 </p>
               </div>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-8">
          <button 
            onClick={(e) => { e.stopPropagation(); prevCard(); }}
            className="p-5 bg-background border border-border rounded-full hover:border-muted-foreground/30 transition-all text-muted-foreground hover:text-foreground shadow-lg"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); nextCard(); }}
            className="p-5 bg-indigo-600 border border-indigo-500 rounded-full hover:bg-indigo-500 transition-all text-white shadow-xl shadow-indigo-600/30"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-12 pb-32">
      <div className="flex items-center justify-between border-b border-border pb-8">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-indigo-600/10 rounded-full flex items-center justify-center border border-indigo-500/20 shadow-inner">
            <Brain className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">Flashcard Retrieval</h2>
            <p className="text-xs uppercase font-bold tracking-[0.25em] text-muted-foreground">Mnemonic Reinforcement Engine</p>
          </div>
        </div>
        <button 
          onClick={generateFlashcards}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full text-[10px] font-bold transition-all shadow-lg shadow-indigo-600/30 uppercase tracking-widest text-white"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Generate Decks
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {flashcards.length === 0 && !loading ? (
          <div className="col-span-full text-center py-32 bg-muted/20 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center gap-6">
             <Layers className="w-16 h-16 text-muted" />
             <div className="space-y-1">
               <p className="text-muted-foreground font-serif text-xl">Empty Syllabus</p>
               <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">Select generate to construct cards from chunks</p>
             </div>
          </div>
        ) : (
          <div className="col-span-full">
            <button 
              onClick={() => setIsReviewMode(true)}
              className="w-full group bg-card border border-border p-12 rounded-3xl hover:border-indigo-500/40 hover:shadow-md transition-all text-left shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-500/20 uppercase tracking-widest">Active Study Session</span>
                  <h3 className="text-4xl font-bold font-serif text-foreground line-clamp-1">{paper.title}</h3>
                  <p className="text-xs text-muted-foreground font-mono tracking-tighter uppercase">{flashcards.length} Mnemic Vectors Synthesized</p>
                </div>
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl rotate-3 flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-0 transition-all">
                  <Play className="w-10 h-10 text-white ml-1.5" />
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
