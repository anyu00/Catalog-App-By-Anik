// Firebase Configuration & Initialization
// This file initializes Firebase and exports the database reference

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";

// Firebase Config - Replace with your own
const firebaseConfig = {
    apiKey: "AIzaSyADYPqT2qs_EVWah2KjplnojX5Ypyuu0QE",
    authDomain: "catalog-app-new-a7274.firebaseapp.com",
    databaseURL: "https://catalog-app-new-a7274-default-rtdb.firebaseio.com",
    projectId: "catalog-app-new-a7274",
    storageBucket: "catalog-app-new-a7274.appspot.com",
    messagingSenderId: "34747584227",
    appId: "1:34747584227:web:af270008cf3fedc318ffd6",
    measurementId: "G-M3KBC1NEZM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export database reference for use in other modules
export const db = getDatabase(app);

// Export auth reference for use in other modules
export const auth = getAuth(app);

// Export functions client for callable cloud functions
export const functionsClient = getFunctions(app);

// Export messaging for push notifications (try to initialize, but don't fail if unavailable)
let messagingInstance = null;
try {
    messagingInstance = getMessaging(app);
    console.log('✅ Firebase Messaging initialized');
} catch (error) {
    console.warn('⚠️ Firebase Messaging not available:', error.message);
}
export const messaging = messagingInstance;
