
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// <-- replace these values only if your project's config is different -->
const firebaseConfig = {
  apiKey: "AIzaSyCxUFLCmFTXq0PVEifOuZRjN2fTUjxwkHo",
  authDomain: "quizverse-424d1.firebaseapp.com",
  projectId: "quizverse-424d1",
  storageBucket: "quizverse-424d1.firebasestorage.app",
  messagingSenderId: "639596682165",
  appId: "1:639596682165:web:5c7dd93b2d5bf81db397fc",
  measurementId: "G-WQK8E1M5FQ"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
