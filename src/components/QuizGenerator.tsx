import { useState, useEffect } from 'react';
import { Paper, Quiz } from '../types';
import { 
  ListChecks, Loader2, PlayCircle, CheckCircle2, 
  XCircle, ChevronRight, RefreshCw, Trophy 
} from 'lucide-react';
import { generateText } from '../lib/gemini';
import { db, logActivity } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../AuthWrapper';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface QuizGeneratorProps {
  paper: Paper;
}

export function QuizGenerator({ paper }: QuizGeneratorProps) {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'quizzes'),
      where('paperId', '==', paper.id),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const fetchQuizzes = async () => {
      const snap = await getDocs(q);
      setQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz)));
    };
    fetchQuizzes();
  }, [paper.id, user]);

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const chunksSnapshot = await getDocs(collection(db, `papers/${paper.id}/chunks`));
      const content = chunksSnapshot.docs.slice(0, 5).map(doc => doc.data().content).join("\n");

      const prompt = `Generate a 5-question multiple choice quiz to test understanding of this research paper.
      
Content:
${content}

JSON structure:
{
  "title": "Quiz Title",
  "questions": [
    {
      "question": "The question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Why A is correct"
    }
  ]
}
Return ONLY the JSON.`;

      const text = await generateText(prompt, { json: true });

      const quizData = JSON.parse(text || '{}');
      const docRef = await addDoc(collection(db, 'quizzes'), {
        ...quizData,
        paperId: paper.id,
        userId: user?.uid,
        createdAt: Date.now()
      });

      const newQuiz = { id: docRef.id, ...quizData } as Quiz;
      setQuizzes([newQuiz, ...quizzes]);
      await logActivity(user!.uid, 'quiz', `Made a quiz for ${paper.title}`, paper.id);
      startQuiz(newQuiz);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIdx(0);
    setScore(0);
    setIsFinished(false);
    setSelectedOption(null);
  };

  const handleNext = () => {
    if (selectedOption === activeQuiz?.questions[currentQuestionIdx].correctAnswer) {
      setScore(s => s + 1);
    }

    if (currentQuestionIdx < (activeQuiz?.questions.length || 0) - 1) {
      setCurrentQuestionIdx(idx => idx + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
    }
  };

  if (activeQuiz) {
    if (isFinished) {
      return (
        <div className="p-10 max-w-2xl mx-auto flex flex-col items-center justify-center h-full text-center space-y-12">
           <div className="relative">
             <div className="p-8 bg-accent-soft rounded-full border border-accent/30 shadow-2xl animate-pulse">
               <Trophy className="w-20 h-20 text-accent-ink" />
             </div>
             <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center border-4 border-background text-accent-fg">
                <CheckCircle2 className="w-4 h-4" />
             </div>
           </div>
           
           <div className="space-y-3">
             <h2 className="text-4xl font-bold font-serif text-foreground">Quiz complete</h2>
             <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground">Score: {(score / activeQuiz.questions.length * 100).toFixed(0)}%</p>
             <p className="text-muted-foreground font-medium">You got {score} out of {activeQuiz.questions.length} correct.</p>
           </div>
           
           <div className="flex gap-6">
             <button 
              onClick={() => startQuiz(activeQuiz)}
              className="flex items-center gap-2 px-8 py-3 bg-background border border-border text-muted-foreground hover:text-foreground rounded-full font-bold transition-all text-[10px]"
             >
               Retake Analysis
             </button>
             <button 
              onClick={() => setActiveQuiz(null)}
              className="flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent-hover text-accent-fg rounded-full font-bold transition-all shadow-xl text-[10px]"
             >
               Return to Library
             </button>
           </div>
        </div>
      );
    }

    const question = activeQuiz.questions[currentQuestionIdx];

    return (
      <div className="p-10 max-w-3xl mx-auto space-y-10">
        <div className="flex items-center justify-between border-b border-border pb-6">
          <button onClick={() => setActiveQuiz(null)} className="text-muted-foreground hover:text-foreground text-[10px] font-bold flex items-center gap-2 transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to quizzes
          </button>
          <div className="text-[10px] font-bold text-muted-foreground font-mono">
            Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
             <span className="text-[10px] text-accent-ink font-bold">Question</span>
             <h3 className="text-2xl font-bold leading-tight text-foreground font-serif">{question.question}</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => setSelectedOption(i)}
                className={cn(
                  "p-6 text-left rounded-2xl border transition-all text-sm font-medium relative group",
                  selectedOption === i 
                    ? "bg-accent border-accent text-accent-fg shadow-lg " 
                    : "bg-muted border-border text-foreground/80 hover:border-muted-foreground/30 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border shrink-0 transition-colors",
                    selectedOption === i ? "bg-white text-accent-ink border-white" : "bg-background border-border text-muted-foreground"
                  )}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="flex-1 font-serif">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-border">
          <button
            disabled={selectedOption === null}
            onClick={handleNext}
            className="flex items-center gap-3 px-10 py-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-fg rounded-full font-bold transition-all shadow-xl text-[10px]"
          >
            {currentQuestionIdx === activeQuiz.questions.length - 1 ? 'Finish quiz' : 'Next question'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-12 pb-32">
      <div className="flex items-center justify-between border-b border-border pb-8">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-accent-soft rounded-full flex items-center justify-center border border-accent/30 shadow-inner">
            <ListChecks className="w-6 h-6 text-accent-ink" />
          </div>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">Practice quiz</h2>
            <p className="text-xs uppercase font-bold tracking-[0.25em] text-muted-foreground">Generated from your paper</p>
          </div>
        </div>
        <button 
          onClick={generateQuiz}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover rounded-full text-[10px] font-bold transition-all shadow-lg text-accent-fg"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Construct Exercise
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {quizzes.length === 0 && !loading ? (
          <div className="text-center py-32 bg-muted/20 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-6">
             <PlayCircle className="w-16 h-16 text-muted" />
             <div className="space-y-1">
               <p className="text-muted-foreground font-serif text-xl">No Assessments Pending</p>
               <p className="text-[10px] text-muted-foreground/60">Generate a quiz to verify your neural mapping of this manuscript</p>
             </div>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <div key={quiz.id} className="group bg-card border border-border p-8 rounded-xl flex items-center justify-between gap-6 hover:border-accent/40 hover:shadow-sm transition-all shadow-sm">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-muted rounded-2xl ring-1 ring-border group-hover:ring-accent/30 transition-all">
                  <ListChecks className="w-6 h-6 text-muted-foreground group-hover:text-accent-ink transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-foreground font-serif">{quiz.title || 'Practice quiz'}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">{quiz.questions.length} questions</p>
                </div>
              </div>
              <button 
                onClick={() => startQuiz(quiz)}
                className="px-8 py-3 bg-background border border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground rounded-full text-[10px] font-bold transition-all"
              >
                Launch Assessment
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
