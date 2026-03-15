// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCuB-h9wLXVO2qLjeoGNaGU3B3RXWlZ_KE",
  authDomain: "eduhub-34f3e.firebaseapp.com",
  projectId: "eduhub-34f3e",
  storageBucket: "eduhub-34f3e.firebasestorage.app",
  messagingSenderId: "419215619223",
  appId: "1:419215619223:web:b1b089a5e05a53860ee5d2",
  measurementId: "G-JV5JLFD259"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);