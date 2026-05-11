export interface Paper {
  id: string;
  userId: string;
  title: string;
  abstract?: string;
  keyContributions?: string[];
  methodology?: string;
  results?: string;
  limitations?: string;
  futureWork?: string;
  architectureDescription?: string;
  status: 'processing' | 'completed' | 'error';
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  paperId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  sources?: string[];
}

export interface Quiz {
  id: string;
  paperId: string;
  userId: string;
  title: string;
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }[];
  createdAt: number;
}

export interface Flashcard {
  id: string;
  paperId: string;
  userId: string;
  front: string;
  back: string;
  createdAt: number;
}
