import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const firebaseConfig = {
        apiKey: "AIzaSyDoXSwni65CuY1_32ZE8B1nwfQO_3VNpTw",
  authDomain: "contract-center-llc-10.firebaseapp.com",
  projectId: "contract-center-llc-10",
  storageBucket: "contract-center-llc-10.firebasestorage.app",
  messagingSenderId: "323221512767",
  appId: "1:323221512767:web:6421260f875997dbf64e8a",
  measurementId: "G-S2RJ0C6BWH"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const GAS_URL = "https://script.google.com/macros/s/AKfycbwGTnULFpGISqlRnxyxpgNz9cMeC6RDFitw5w9ycZa72ZMZ64JnSQ32sNapsQyXhHq9JA/exec";

let currentRecipe = null;
let currentUID = "USER_ID_FROM_AUTH"; // Integration point for Firebase Auth

// --- CORE FUNCTIONS ---

window.setSection = async (section) => {
    // 1. Role Based Access Check
    const userSnap = await get(ref(db, `users/${currentUID}`));
    const userData = userSnap.val();
    
    if (section === 'assigned' && userData.role === 'guest') {
        alert("Access restricted to Students and Teachers.");
        return;
    }

    // 2. Load Content
    if (section === 'daily') {
        const recipeSnap = await get(ref(db, 'daily_recipes/today'));
        currentRecipe = recipeSnap.val();
        renderRecipe(currentRecipe);
    }
    // Update UI tabs
    document.querySelectorAll('.sections button').forEach(b => b.classList.remove('active'));
    document.getElementById(`nav-${section}`).classList.add('active');
};

function renderRecipe(data) {
    const html = marked.parse(data.content);
    document.getElementById('recipe-body-html').innerHTML = html;
}

// --- INTERACTIONS ---

window.handleLike = async () => {
    // Likes go to Google Sheets
    await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ type: 'LIKE', userId: currentUID, recipeId: currentRecipe.id })
    });
    alert("Liked! Data saved to House Learning Sheets.");
};

window.handleFavorite = async () => {
    // Favorites go to Firebase (Non-Firestore)
    const favRef = ref(db, `users/${currentUID}/favorites/${currentRecipe.id}`);
    await set(favRef, true);
    alert("Added to My Recipes!");
};

window.handlePrint = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Watermark
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(60);
    doc.text("House Learning", 35, 150, { angle: 45 });
    
    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    const text = document.getElementById('recipe-body-html').innerText;
    const splitText = doc.splitTextToSize(text, 180);
    doc.text(splitText, 15, 20);
    doc.save("Recipe.pdf");
};

// --- REPORTING & PROGRESSIVE BANS ---

window.openReport = () => {
    const reason = prompt("Describe the issue with this recipe:");
    if (reason) processReport(reason);
};

async function processReport(reason) {
    const userRef = ref(db, `users/${currentUID}`);
    const snap = await get(userRef);
    const data = snap.val() || { offenses: 0 };

    // This logic is usually handled by the Community Team, but here is the automated response:
    alert("Report submitted. Community Team will respond in 2-3 days.");
    
    // Example of triggering a ban if the report is flagged as "False" by an admin later:
    // This part would be in your Admin Dashboard logic.
}

// Initial Boot
window.setSection('daily');
