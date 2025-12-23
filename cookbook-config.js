// Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDoXSwni65CuY1_32ZE8B1nwfQO_3VNpTw",
  authDomain: "contract-center-llc-10.firebaseapp.com",
  projectId: "contract-center-llc-10",
  storageBucket: "contract-center-llc-10.firebasestorage.app",
  messagingSenderId: "323221512767",
  appId: "1:323221512767:web:6421260f875997dbf64e8a",
  measurementId: "G-S2RJ0C6BWH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Combined Google Apps Script endpoint for likes, ratings, and reports
// Deploy CookbookInteractions.gs as a web app and paste the URL here
const GSCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJSKuahtatMEGdsNQ_kzu52LWVpWQnm5yb9yHvLwTrocW8bOZOUJKRh6rZWunNdZLe7w/exec";

