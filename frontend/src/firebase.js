// ---------------------------------------------------------------
// Firebase setup for Outfit Rater.
// These values are NOT secret - they are meant to live in the
// frontend. Your data is protected by Firestore security rules,
// not by hiding these values.
//
// >>> Replace the PASTE_... placeholders with YOUR project's config
//     (from the Firebase Console). Everything else can stay as-is.
// ---------------------------------------------------------------

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCks43P6s6fzA6WIk7hi9S92pej2YJHeY0",
  authDomain: "outfitrater-ba33f.firebaseapp.com",
  projectId: "outfitrater-ba33f",
  storageBucket: "outfitrater-ba33f.firebasestorage.app",
  messagingSenderId: "903874545716",
  appId: "1:903874545716:web:0f990b2fdb3d8797f32261",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
// Always let the user pick which Google account to use
googleProvider.setCustomParameters({ prompt: "select_account" });
