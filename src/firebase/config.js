// Firebase configuration
// Replace with your actual Firebase project config to enable leaderboard features.
// The app works without Firebase — all quiz/game features are fully local.

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
}

let app, db

try {
  app = initializeApp(firebaseConfig)
  db  = getFirestore(app)
} catch (e) {
  console.warn('Firebase not configured — leaderboard disabled')
}

export { db }
