import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export async function logActivity(userId: string, type: 'upload' | 'chat' | 'quiz' | 'flashcard', description: string, paperId?: string) {
  try {
    await addDoc(collection(db, `users/${userId}/activity`), {
      userId,
      type,
      description,
      paperId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
