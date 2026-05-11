import React, { useEffect, useState, createContext, useContext } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { LogIn, Loader2 } from 'lucide-react';
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-12"
        >
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center font-bold text-3xl text-white shadow-2xl shadow-indigo-500/20">P</div>
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-foreground font-serif">
              PaperMind AI
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Synthesize, learn, and master complex academic papers with generative intelligence.
            </p>
          </div>
          
          <button
            onClick={signIn}
            className="flex items-center justify-center gap-3 w-full py-4 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30"
          >
            <LogIn className="w-5 h-5" />
            Continue with Google
          </button>
          
          <div className="grid grid-cols-3 gap-8 pt-10 border-t border-border">
            <div className="text-center space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold">PDF</div>
              <div className="text-lg font-serif">Library</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold">RAG</div>
              <div className="text-lg font-serif">Retrieval</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold">LLM</div>
              <div className="text-lg font-serif">Analysis</div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
