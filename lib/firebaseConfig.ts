// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBD3hE3PS1hyVFNAqx566lbqZuiwlQFmZ8",
  authDomain: "firestore-admin-panel-7ae00.firebaseapp.com",
  projectId: "firestore-admin-panel-7ae00",
  storageBucket: "firestore-admin-panel-7ae00.firebasestorage.app",
  messagingSenderId: "763962893140",
  appId: "1:763962893140:web:75a4cabbe3e0816dc45ec1",
  measurementId: "G-99ZKKF9Y85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth and db
export const auth = getAuth(app);
export const db = getFirestore(app);