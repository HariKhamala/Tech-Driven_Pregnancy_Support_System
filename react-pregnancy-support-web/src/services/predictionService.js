// src/services/predictionService.js
import { db } from '../firebase/config';

export const storePrediction = async (userId, prediction) => {
  const docRef = doc(db, `users/${userId}/predictions`, Date.now().toString());
  await setDoc(docRef, {
    ...prediction,
    timestamp: serverTimestamp()
  });
  
  // Mark watch data as processed
  const watchRef = doc(db, `users/${userId}/watchData`, prediction.watchDataId);
  await updateDoc(watchRef, { processed: true });
};