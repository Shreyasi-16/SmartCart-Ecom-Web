// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCS_-3PxS4eOKOE8ULNJtYvwOtXIB5os30",
  authDomain: "smartcart-b5466.firebaseapp.com",
  projectId: "smartcart-b5466",
  storageBucket: "smartcart-b5466.firebasestorage.app",
  messagingSenderId: "710495720438",
  appId: "1:710495720438:web:b9db249a0295723321add7",
  measurementId: "G-466ZQVGJ9R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


export default app;