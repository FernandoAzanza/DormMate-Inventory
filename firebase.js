// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Import Firebase Storage

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAEgRM1t3tKYusYhzSXefY_dL3izhZW348",
    authDomain: "dorm-inventory.firebaseapp.com",
    projectId: "dorm-inventory",
    storageBucket: "dorm-inventory.appspot.com",
    messagingSenderId: "587297269953",
    appId: "1:587297269953:web:ee55b2a3159cf3e9808c40",
    measurementId: "G-72D08G0K1T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const storage = getStorage(app); // Initialize Firebase Storage

export { firestore, storage }
