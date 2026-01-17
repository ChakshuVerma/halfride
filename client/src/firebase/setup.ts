import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCSxgs99itMFeZl3-hEl8vZtgbX0naRpDI",
  authDomain: "halfride-c5355.firebaseapp.com",
  projectId: "halfride-c5355",
  storageBucket: "halfride-c5355.firebasestorage.app",
  messagingSenderId: "165014340584",
  appId: "1:165014340584:web:606f7fdde25d1862d51a5d",
  measurementId: "G-30VJCF121R"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);