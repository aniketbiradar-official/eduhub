import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { initializeFirestore, persistentLocalCache } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyCuB-h9wLXVO2qLjeoGNaGU3B3RXWlZ_KE",
  authDomain: "eduhub-34f3e.firebaseapp.com",
  projectId: "eduhub-34f3e",
  storageBucket: "eduhub-34f3e.firebasestorage.app",
  messagingSenderId: "419215619223",
  appId: "1:419215619223:web:b1b089a5e05a53860ee5d2"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const auth    = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db      = initializeFirestore(app, {
  experimentalForceLongPolling: true,
})
export const storage = getStorage(app)