import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {

  apiKey: "AIzaSyChSDbTBUCejXzcR4X4lZ6KJd_fuqKBXL0",

  authDomain: "pregnancy-support-e7b75.firebaseapp.com",

  projectId: "pregnancy-support-e7b75",

  storageBucket: "pregnancy-support-e7b75.firebasestorage.app",

  messagingSenderId: "576168284006",

  appId: "1:576168284006:web:a18ddaa772622b515942a7",

  measurementId: "G-HVRBWHE27V"

};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app); 