import { useState, useEffect } from 'react';
import { AuthProvider, AuthWrapper, useAuth } from './AuthWrapper';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PaperDetail } from './components/PaperDetail';
import { Paper } from './types';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Toaster, toast } from 'sonner';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <AuthProvider>
      <AuthWrapper>
        <div className={theme}>
          <MainApp theme={theme} toggleTheme={toggleTheme} />
        </div>
        <Toaster theme={theme} position="top-center" />
      </AuthWrapper>
    </AuthProvider>
  );
}

function MainApp({ theme, toggleTheme }: { theme: 'dark' | 'light', toggleTheme: () => void }) {
  const { user } = useAuth();
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'papers'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Paper));
      setPapers(p);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      toast.error("Failed to load papers");
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const selectedPaper = papers.find(p => p.id === selectedPaperId);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans relative">
      <Sidebar 
        papers={papers} 
        onSelectPaper={(id) => {
          setSelectedPaperId(id);
          setIsSidebarOpen(false);
        }} 
        selectedPaperId={selectedPaperId} 
        theme={theme}
        toggleTheme={toggleTheme}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 relative overflow-auto bg-background flex flex-col">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2" onClick={() => setSelectedPaperId(null)}>
            <div className="bg-accent w-7 h-7 rounded-lg flex items-center justify-center font-bold text-accent-fg text-xs">P</div>
            <span className="font-bold text-lg font-serif">PaperMind</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors border border-border"
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className="w-full h-0.5 bg-foreground rounded-full"></span>
              <span className="w-full h-0.5 bg-foreground rounded-full"></span>
              <span className="w-full h-0.5 bg-foreground rounded-full"></span>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {selectedPaperId ? (
            <PaperDetail 
              paper={selectedPaper} 
              onBack={() => setSelectedPaperId(null)} 
            />
          ) : (
            <Dashboard 
              papers={papers} 
              isLoading={isLoading}
              onSelectPaper={setSelectedPaperId} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
