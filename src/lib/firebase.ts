import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Google Analytics for Firebase: page views, active users, and the custom
// events below. Guarded because some environments (old browsers, blockers)
// don't support it — the app must never break over analytics.
let analytics: Analytics | null = null;
isSupported()
  .then((ok) => {
    if (ok) analytics = getAnalytics(app);
  })
  .catch(() => {});

export async function logActivity(userId: string, type: 'upload' | 'chat' | 'quiz' | 'flashcard', description: string, paperId?: string) {
  // Aggregate usage event (anonymous counts in the Analytics dashboard)
  if (analytics) {
    try {
      logEvent(analytics, `paper_${type}`);
    } catch {
      // analytics failures are never allowed to affect the app
    }
  }

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
