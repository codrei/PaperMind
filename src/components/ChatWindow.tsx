import React, { useState, useRef, useEffect } from 'react';
import { Paper, ChatMessage } from '../types';
import { Send, Bot, User as UserIcon, Loader2, Info, Quote } from 'lucide-react';
import { db, logActivity } from '../lib/firebase';
import { generateText, rankChunks } from '../lib/gemini';
import { collection, query, where, getDocs, addDoc, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../AuthWrapper';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ChatWindowProps {
  paper: Paper;
}

export function ChatWindow({ paper }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !paper) return;

    const q = query(
      collection(db, `papers/${paper.id}/messages`),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const m = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(m);
    });

    return unsubscribe;
  }, [user, paper]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // 1. Save user message
      await addDoc(collection(db, `papers/${paper.id}/messages`), {
        userId: user.uid,
        paperId: paper.id,
        role: 'user',
        content: userMessage,
        createdAt: Date.now(),
      });

      // 2. Perform RAG
      // a. Fetch chunks from Firestore
      const chunksSnapshot = await getDocs(collection(db, `papers/${paper.id}/chunks`));
      const chunks = chunksSnapshot.docs.map(doc => doc.data());
      
      // b. Retrieval: rank every chunk against the question, ground on the top 8
      const context = rankChunks(
        userMessage,
        chunks.map((c) => c.content as string),
      ).join("\n\n");

      // 3. Call Gemini
      const prompt = `You are a Research Assistant helping a student understand a research paper titled "${paper.title}".
      
Context from the paper:
${context}

User question: ${userMessage}

Instructions:
- Base your answer ONLY on the provided context if possible.
- If the answer isn't in the context, state that and use your general knowledge to explain the concept related to the paper.
- Use clear, academic yet accessible language.
- Format with markdown.`;

      const assistantMessage =
        (await generateText(prompt)) || "I'm sorry, I couldn't process that.";

      // 4. Save assistant message
      await addDoc(collection(db, `papers/${paper.id}/messages`), {
        userId: user.uid,
        paperId: paper.id,
        role: 'assistant',
        content: assistantMessage,
        createdAt: Date.now(),
      });
      
      await logActivity(user.uid, 'chat', `Inquired about ${paper.title}`, paper.id);

    } catch (error) {
      console.error(error);
      // Fallback
      await addDoc(collection(db, `papers/${paper.id}/messages`), {
        userId: user.uid,
        paperId: paper.id,
        role: 'assistant',
        content: "I encountered an error while processing your request. Please try again.",
        createdAt: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-8 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-6 max-w-sm mx-auto text-center">
            <div className="p-4 bg-background rounded-3xl border border-border shadow-md">
              <Bot className="w-10 h-10 text-indigo-500" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-serif text-foreground">Academic Dialogue Ready</p>
              <p className="text-xs font-bold uppercase tracking-widest leading-loose">Deep analysis of "{paper.title}" finalized. Inquire within.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full pt-6">
               {["What is the primary contribution?", "Deconstruct the methodology", "Synthesize the results"].map(q => (
                 <button 
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs p-3 bg-background border border-border rounded-full hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all font-bold uppercase tracking-tighter text-foreground"
                 >
                   {q}
                 </button>
               ))}
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={message.id}
            className={cn(
              "flex items-start gap-3 sm:gap-5 max-w-4xl",
              message.role === 'user' ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "p-2 rounded-xl border flex-shrink-0 shadow-sm",
              message.role === 'user' ? "bg-muted border-border text-foreground" : "bg-indigo-600/10 border-indigo-500/20 text-indigo-500"
            )}>
              {message.role === 'user' ? <UserIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Bot className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
            </div>
            
            <div className={cn(
              "p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-sm leading-relaxed shadow-sm",
              message.role === 'user' 
                ? "bg-card border border-border rounded-tr-none text-foreground font-medium" 
                : "bg-muted/50 border border-border rounded-tl-none text-foreground/90 font-serif"
            )}>
              <div className="prose dark:prose-invert prose-sm max-w-none">
                {message.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-2 last:mb-0">{line}</p>
                ))}
              </div>
              {message.role === 'assistant' && (
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                   <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest font-mono">Grounded Logic</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Assistant is synthesizing</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-8 border-t border-border bg-card/50">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-3 sm:gap-4">
          <div className="flex-1 bg-background border border-border rounded-2xl sm:rounded-3xl focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all shadow-sm relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Inquire about architecture, methodology, or results..."
              className="w-full bg-transparent p-4 sm:p-5 pr-12 sm:pr-14 text-sm focus:outline-none resize-none min-h-[50px] sm:min-h-[60px] max-h-32 text-foreground placeholder:text-muted-foreground/50"
              rows={1}
            />
            <div className="absolute right-2.5 bottom-2.5">
               <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 sm:p-3 bg-indigo-600 text-white rounded-xl sm:rounded-2xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </form>
        <p className="text-[9px] sm:text-[10px] text-center text-muted-foreground mt-4 sm:mt-6 uppercase tracking-[0.3em] font-bold">
          Generative Research Core • Gemini 3 • RAG v2
        </p>
      </div>
    </div>
  );
}
