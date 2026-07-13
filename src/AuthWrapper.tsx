import React, { useEffect, useState, createContext, useContext } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { LogIn, Loader2, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Sign in error:", error);
      
      const errorCode = error.code;
      const errorMessage = error.message;

      if (errorCode === 'auth/unauthorized-domain') {
        alert("This domain is not authorized. \n\n1. Go to Firebase Console -> Authentication -> Settings -> Authorized Domains.\n2. Add your Vercel URL (e.g., papermind-sand.vercel.app).");
      } else if (errorCode === 'auth/popup-blocked') {
        alert("Sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else if (errorCode === 'auth/popup-closed-by-user') {
        // Silently handle user closing the popup
      } else {
        alert(`Login Failed (${errorCode}).\n\nCommon fixes:\n1. Ensure Google Auth is enabled in Firebase Console.\n2. In Google Cloud Console -> Credentials, add your URL to 'Authorized JavaScript origins'.\n\nTechnical Details: ${errorMessage}`);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-accent-ink" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-4xl grid md:grid-cols-2 rounded-xl border border-border bg-card overflow-hidden shadow-sm"
        >
          {/* Left — the editorial pitch */}
          <div className="p-8 sm:p-12 flex flex-col justify-center bg-background border-b md:border-b-0 md:border-r border-border">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 bg-accent text-accent-fg rounded-lg flex items-center justify-center font-serif font-semibold text-xl">P</div>
              <span className="font-serif text-xl font-semibold text-foreground">PaperMind</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-foreground text-balance max-w-[15ch]">
              Read dense research papers, faster.
            </h1>
            <p className="text-muted-foreground mt-4 leading-relaxed max-w-[42ch]">
              Upload a paper and get a clear summary, a chat that answers from the paper&apos;s own text, and flashcards and quizzes to study from.
            </p>
            <div className="flex flex-col gap-2.5 mt-8 pt-6 border-t border-border">
              {['Structured summaries', 'Grounded chat', 'Flashcards & quizzes'].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-accent-ink shrink-0" strokeWidth={2.5} />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Right — sign in */}
          <div className="p-8 sm:p-12 flex flex-col justify-center gap-4">
            <p className="text-sm text-muted-foreground text-center">Sign in to your library</p>
            <button
              onClick={signIn}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-accent text-accent-fg font-semibold rounded-lg hover:bg-accent-hover transition-colors"
            >
              <LogIn className="w-5 h-5" />
              Continue with Google
            </button>
            <p className="text-xs text-muted-foreground/70 text-center">Your papers are private to your account.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
