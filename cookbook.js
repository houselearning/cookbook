// DOM elements
const userInfoEl = document.getElementById("user-info");
const logoutBtn = document.getElementById("logout-btn");
const cookbookMain = document.getElementById("cookbook-main");
const blockedOverlay = document.getElementById("blocked-overlay");
const blockedMessageEl = document.getElementById("blocked-message");

const tabs = document.querySelectorAll(".hl-tab");
const listTitleEl = document.getElementById("list-title");
const recipeListEl = document.getElementById("recipe-list");
const recipeTitleEl = document.getElementById("recipe-title");
const recipeInfoEl = document.getElementById("recipe-info");
const recipeContentEl = document.getElementById("recipe-content");

const printBtn = document.getElementById("print-btn");
const likeBtn = document.getElementById("like-btn");
const favoriteBtn = document.getElementById("favorite-btn");
const rateBtn = document.getElementById("rate-btn");
const reportBtn = document.getElementById("report-btn");

const ratingModal = document.getElementById("rating-modal");
const ratingSubmit = document.getElementById("rating-submit");
const ratingCancel = document.getElementById("rating-cancel");
const starContainer = document.getElementById("star-container");
const ratingComment = document.getElementById("rating-comment");

const reportModal = document.getElementById("report-modal");
const reportSubmit = document.getElementById("report-submit");
const reportCancel = document.getElementById("report-cancel");
const reportText = document.getElementById("report-text");

const assignedTab = document.getElementById("assigned-tab");

// App state
let currentUser = null;
let currentRole = null;
let currentTab = "daily"; // daily | my | assigned
let currentRecipes = [];
let currentRecipe = null;
let selectedStars = 0;

// Auth state listener
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    console.log("DEBUG: No user logged in");
    showBlocked("You must be signed in to view the HouseLearning Cookbook.");
    cookbookMain.style.display = "none";
    return;
  }

  console.log("DEBUG: User logged in:", user.uid);

  try {
    console.log("DEBUG: Reading cookbook_users/" + user.uid);
    const userDoc = await db.collection("cookbook_users").doc(user.uid).get();
    console.log("DEBUG: cookbook_users read OK:", userDoc.exists);

    console.log("DEBUG: Reading settings/global");
    const settingsDoc = await db.collection("settings").doc("global").get();
    console.log("DEBUG: settings/global read OK:", settingsDoc.exists);

    console.log("DEBUG: Loading recipes…");
    await loadRecipesForTab("daily");
    console.log("DEBUG: Recipes loaded OK");

  } catch (err) {
    console.error("DEBUG: Firestore read failed:", err);
    showBlocked("Error initializing cookbook.");
    cookbookMain.style.display = "none";
  }
});


  currentUser = user;
  userInfoEl.textContent = user.email || user.displayName || "User";

  try {
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    currentRole = userData.role || "student";

    // Check banned
    if (userData.banned) {
      const expires = userData.banExpiresAt?.toDate?.() || null;
      let message = "Your account is banned from using the Cookbook.";
      if (expires) {
        message += ` Ban expires on ${expires.toLocaleString()}.`;
      }
      showBlocked(message);
      cookbookMain.style.display = "none";
      return;
    }

    // Check global Cookbook block
    const settingsDoc = await db.collection("settings").doc("global").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    if (settings.cookbookBlocked && currentRole !== "admin" && currentRole !== "teacher") {
      showBlocked("The Cookbook is currently unavailable. Please check back later.");
      cookbookMain.style.display = "none";
      return;
    }

    // Show main UI
    cookbookMain.style.display = "block";
    blockedOverlay.classList.add("hidden");

    // Hide Assigned tab for non-students/teachers if desired
    if (currentRole !== "student" && currentRole !== "teacher") {
      assignedTab.style.display = "none";
    }

    await loadRecipesForTab("daily");
  } catch (err) {
    console.error("Error initializing cookbook:", err);
    showBlocked("An error occurred while loading the Cookbook.");
    cookbookMain.style.display = "none";
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  auth.signOut();
});

// Show blocked overlay
function showBlocked(message) {
  blockedMessageEl.textContent = message;
  blockedOverlay.classList.remove("hidden");
}

// Tab switching
tabs.forEach((tab) => {
  tab.addEventListener("click", async () => {
    const tabName = tab.dataset.tab;
    if (tabName === currentTab) return;
    currentTab = tabName;

    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    if (tabName === "daily") listTitleEl.textContent = "Daily Recipes";
    if (tabName === "my") listTitleEl.textContent = "My Recipes";
    if (tabName === "assigned") listTitleEl.textContent = "Assigned Recipes";

    await loadRecipesForTab(tabName);
  });
});

// Load recipes for current tab
async function loadRecipesForTab(tabName) {
  recipeListEl.innerHTML = "";
  currentRecipes = [];
  currentRecipe = null;
  recipeTitleEl.textContent = "Select a recipe";
  recipeInfoEl.textContent = "";
  recipeContentEl.innerHTML = "";

  let query = db.collection("recipes").where("blocked", "==", false);

  if (tabName === "daily") {
    query = query.where("type", "==", "daily").orderBy("createdAt", "desc").limit(30);
  } else if (tabName === "my") {
    const favSnap = await db.collection("favorites").doc(currentUser.uid).collection("recipes").get();
    const favIds = favSnap.docs.map((d) => d.id);
    if (favIds.length === 0) {
      recipeListEl.innerHTML = "<li>No favorites yet.</li>";
      return;
    }
    query = query.where(firebase.firestore.FieldPath.documentId(), "in", favIds);
  } else if (tabName === "assigned") {
    if (currentRole !== "student" && currentRole !== "teacher") {
      recipeListEl.innerHTML = "<li>Assigned recipes are only for students and teachers.</li>";
      return;
    }
    query = query
      .where("type", "==", "assigned")
      .orderBy("createdAt", "desc")
      .limit(50);
  }

  const snap = await query.get();
  if (snap.empty) {
    recipeListEl.innerHTML = "<li>No recipes found.</li>";
    return;
  }

  currentRecipes = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderRecipeList();
}

// Render left recipe list
function renderRecipeList() {
  recipeListEl.innerHTML = "";
  currentRecipes.forEach((recipe) => {
    const li = document.createElement("li");
    li.className = "recipe-list-item";
    li.dataset.id = recipe.id;

    const titleEl = document.createElement("div");
    titleEl.className = "recipe-list-item-title";
    titleEl.textContent = recipe.title;

    const metaEl = document.createElement("div");
    metaEl.className = "recipe-list-item-meta";
    const dateStr = recipe.createdAt?.toDate?.().toLocaleDateString() || "";
    metaEl.textContent = `${recipe.type === "daily" ? "Daily" : "Assigned"} • ${dateStr}`;

    li.appendChild(titleEl);
    li.appendChild(metaEl);

    li.addEventListener("click", () => selectRecipe(recipe.id));

    recipeListEl.appendChild(li);
  });
}

// Select a recipe
function selectRecipe(recipeId) {
  const recipe = currentRecipes.find((r) => r.id === recipeId);
  if (!recipe) return;
  currentRecipe = recipe;

  document.querySelectorAll(".recipe-list-item").forEach((li) => {
    li.classList.toggle("active", li.dataset.id === recipeId);
  });

  recipeTitleEl.textContent = recipe.title;
  const createdAtStr = recipe.createdAt?.toDate?.().toLocaleString() || "";
  recipeInfoEl.textContent = `AI generated • ${createdAtStr}`;

  recipeContentEl.innerHTML = recipe.html || "<p>No content.</p>";
}

/* ------------ Interactions ------------ */

// Print to PDF with watermark
printBtn.addEventListener("click", () => {
  if (!currentRecipe) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "pt", "a4");

  // Watermark
  doc.setGState(doc.GState({ opacity: 0.08 }));
  doc.setFontSize(60);
  doc.setTextColor(150, 150, 150);
  doc.text("House Learning", 80, 300, { angle: 30 });
  doc.setGState(doc.GState({ opacity: 1 }));

  // Title
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(currentRecipe.title, 40, 80);

  // Content (simple: innerText from HTML)
  const text = recipeContentEl.innerText || "";
  const lines = doc.splitTextToSize(text, 500);
  doc.setFontSize(12);
  doc.text(lines, 40, 110);

  doc.save(`${currentRecipe.title.replace(/\s+/g, "_")}.pdf`);
});

// Like (Google Apps Script + Sheets)
likeBtn.addEventListener("click", async () => {
  if (!currentRecipe) return;
  try {
    await fetch(GSCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "like",
        userId: currentUser.uid,
        recipeId: currentRecipe.id,
        timestamp: new Date().toISOString()
      })
    });
    alert("Like recorded. Thank you!");
  } catch (err) {
    console.error("Error liking recipe:", err);
    alert("Failed to record like.");
  }
});

// Favorite (Firestore)
favoriteBtn.addEventListener("click", async () => {
  if (!currentRecipe) return;
  try {
    const favRef = db
      .collection("favorites")
      .doc(currentUser.uid)
      .collection("recipes")
      .doc(currentRecipe.id);

    await favRef.set({ favoritedAt: firebase.firestore.FieldValue.serverTimestamp() });
    alert("Recipe added to your favorites.");
  } catch (err) {
    console.error("Error favoriting recipe:", err);
    alert("Failed to favorite recipe.");
  }
});

/* Rating modal logic */

starContainer.addEventListener("click", (e) => {
  const value = e.target.dataset.value;
  if (!value) return;
  selectedStars = parseInt(value, 10);
  updateStars();
});

function updateStars() {
  document.querySelectorAll("#star-container .star").forEach((star) => {
    const value = parseInt(star.dataset.value, 10);
    star.classList.toggle("selected", value <= selectedStars);
  });
}

rateBtn.addEventListener("click", () => {
  if (!currentRecipe) return;
  ratingModal.classList.remove("hidden");
  selectedStars = 0;
  ratingComment.value = "";
  updateStars();
});

ratingCancel.addEventListener("click", () => {
  ratingModal.classList.add("hidden");
});

ratingSubmit.addEventListener("click", async () => {
  if (!currentRecipe || selectedStars === 0) {
    alert("Please select a star rating before submitting.");
    return;
  }

  try {
    await fetch(GSCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rate",
        userId: currentUser.uid,
        recipeId: currentRecipe.id,
        rating: selectedStars,
        comment: ratingComment.value,
        timestamp: new Date().toISOString()
      })
    });
    ratingModal.classList.add("hidden");
    alert("Rating submitted. Thank you!");
  } catch (err) {
    console.error("Error submitting rating:", err);
    alert("Failed to submit rating.");
  }
});

/* Report modal logic */

reportBtn.addEventListener("click", () => {
  if (!currentRecipe) return;
  reportText.value = "";
  reportModal.classList.remove("hidden");
});

reportCancel.addEventListener("click", () => {
  reportModal.classList.add("hidden");
});

reportSubmit.addEventListener("click", async () => {
  if (!currentRecipe) return;
  const reason = reportText.value.trim();
  if (!reason) {
    alert("Please explain the issue before submitting a report.");
    return;
  }

  try {
    await fetch(GSCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "report",
        userId: currentUser.uid,
        recipeId: currentRecipe.id,
        reason,
        timestamp: new Date().toISOString()
      })
    });
    reportModal.classList.add("hidden");
    alert("Report submitted. The community team will review in 2–3 days.");
  } catch (err) {
    console.error("Error submitting report:", err);
    alert("Failed to submit report.");
  }
});
