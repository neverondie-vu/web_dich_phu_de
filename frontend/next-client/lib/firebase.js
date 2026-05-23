import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDTYgLmLa5iFw9sNAbVKTi8xFObJR4Ed3g",
  authDomain: "autosub-a03c4.firebaseapp.com",
  projectId: "autosub-a03c4",
  storageBucket: "autosub-a03c4.firebasestorage.app",
  messagingSenderId: "440199919147",
  appId: "1:440199919147:web:fea3c01cd60650bb579c6e",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
