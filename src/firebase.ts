// import { initializeApp } from 'firebase/app';
// import { getAuth } from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore';
// import firebaseConfig from '../firebase-blueprint.json';

// const app = initializeApp(firebaseConfig);
// export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
// export const auth = getAuth(app);


import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// ✅ Load config from environment (Netlify)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig)

// ✅ Export services
export const db = getFirestore(app)
export const auth = getAuth(app)
