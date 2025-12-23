// Configuration (Replace with your keys)
const firebaseConfig = { /* Your Config */ };
const GAS_URL = "https://script.google.com/macros/s/AKfycbxB2T81uHWi_ytjLJ6Z1WY1iopptGrIudfI_sceLqFQw4vz95t0Q_PRJEtP4ZwZkJzg/exec";

// 1. Authentication & Ban Logic
firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "/auth"; // Force sign-in
    } else {
        checkUserStatus(user.uid);
    }
});

async function checkUserStatus(uid) {
    const snapshot = await firebase.database().ref(`users/${uid}`).once('value');
    const userData = snapshot.val();

    if (userData.isBanned && Date.now() < userData.banUntil) {
        alert("Account Suspended. Ban expires: " + new Date(userData.banUntil));
        firebase.auth().signOut();
    }
    loadDailyRecipe();
}

// 2. Load and Format Recipe
async function loadDailyRecipe() {
    const snap = await firebase.database().ref('daily_recipes/today').once('value');
    const data = snap.val();
    
    // Parse Markdown to HTML via marked.js
    const html = marked.parse(data.content);
    document.getElementById('recipe-display-area').innerHTML = html;
}

// 3. Interactions
async function submitLike() {
    const payload = { type: 'LIKE', userId: firebase.auth().currentUser.uid, recipeId: 'today' };
    await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
    alert("Recipe Liked!");
}

function printRecipe() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Watermark
    doc.setTextColor(220);
    doc.setFontSize(40);
    doc.text("House Learning", 40, 150, { angle: 45 });
    
    // Content
    doc.setTextColor(0);
    doc.setFontSize(12);
    const content = document.getElementById('recipe-content').innerText;
    doc.text(content, 10, 20);
    doc.save("recipe.pdf");
}
