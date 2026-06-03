const generateButton = document.getElementById("generatePlanButton");
const planText = document.getElementById("planText");
const planGrid = document.getElementById("planGrid");
const mainCard = document.getElementById("mainCard");

const settingsBtn = document.getElementById("settingsBtn");
const settingsOverlay = document.getElementById("settingsOverlay");
const overlayBackdrop = document.getElementById("overlayBackdrop");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const regenerateBtn = document.getElementById("regenerateBtn");

// Open settings and load saved profile data into the form
settingsBtn.addEventListener("click", function () {
    loadSettingsIntoForm();
    settingsOverlay.classList.remove("overlay-hidden");
});

closeSettingsBtn.addEventListener("click", closeSettings);
overlayBackdrop.addEventListener("click", closeSettings);

function closeSettings() {
    settingsOverlay.classList.add("overlay-hidden");
}

// Load profile from localStorage into the settings form
function loadSettingsIntoForm() {
    document.getElementById("settingsName").value = localStorage.getItem("mindzone_name") || "";
    document.getElementById("settingsAge").value = localStorage.getItem("mindzone_age") || "";
    document.getElementById("settingsSport").value = localStorage.getItem("mindzone_sport") || "";
    document.getElementById("settingsGoal").value = localStorage.getItem("mindzone_goal") || "";
    document.getElementById("settingsChallenge").value = localStorage.getItem("mindzone_challenge") || "";
    document.getElementById("settingsDays").value = localStorage.getItem("mindzone_days") || "";

    setStarRating("confidence", localStorage.getItem("mindzone_confidence"));
    setStarRating("stress", localStorage.getItem("mindzone_stress"));
    setStarRating("focus", localStorage.getItem("mindzone_focus"));
    setStarRating("bounce", localStorage.getItem("mindzone_bounce"));
}

// Check the right star radio button for a saved value
function setStarRating(name, value) {
    const radios = document.querySelectorAll('#settingsForm input[name="' + name + '"]');
    for (const radio of radios) {
        radio.checked = radio.value === value;
    }
}

// Read settings form and save to localStorage
function saveSettingsFromForm() {
    const name = document.getElementById("settingsName").value.trim();
    const age = document.getElementById("settingsAge").value.trim();
    const sport = document.getElementById("settingsSport").value.trim();
    const goal = document.getElementById("settingsGoal").value.trim();
    const challenge = document.getElementById("settingsChallenge").value.trim();
    const days = document.getElementById("settingsDays").value.trim();

    const confidence = document.querySelector('#settingsForm input[name="confidence"]:checked');
    const stress = document.querySelector('#settingsForm input[name="stress"]:checked');
    const focus = document.querySelector('#settingsForm input[name="focus"]:checked');
    const bounce = document.querySelector('#settingsForm input[name="bounce"]:checked');

    if (!name || !age || !sport || !goal || !challenge || !days || !confidence || !stress || !focus || !bounce) {
        alert("Please fill out every field before saving.");
        return false;
    }

    localStorage.setItem("mindzone_name", name);
    localStorage.setItem("mindzone_age", age);
    localStorage.setItem("mindzone_sport", sport);
    localStorage.setItem("mindzone_goal", goal);
    localStorage.setItem("mindzone_challenge", challenge);
    localStorage.setItem("mindzone_days", days);
    localStorage.setItem("mindzone_confidence", confidence.value);
    localStorage.setItem("mindzone_stress", stress.value);
    localStorage.setItem("mindzone_focus", focus.value);
    localStorage.setItem("mindzone_bounce", bounce.value);

    return true;
}

saveSettingsBtn.addEventListener("click", function () {
    if (saveSettingsFromForm()) {
        closeSettings();
    }
});

regenerateBtn.addEventListener("click", async function () {
    if (!saveSettingsFromForm()) {
        return;
    }
    closeSettings();
    await generatePlan();
});

generateButton.addEventListener("click", async function () {
    await generatePlan();
});

// Generate plan from localStorage data and show it on the page
async function generatePlan() {
    const name = localStorage.getItem("mindzone_name");
    const age = localStorage.getItem("mindzone_age");
    const sport = localStorage.getItem("mindzone_sport");
    const goal = localStorage.getItem("mindzone_goal");
    const challenge = localStorage.getItem("mindzone_challenge");
    const days = parseInt(localStorage.getItem("mindzone_days"), 10) || 0;
    const confidence = localStorage.getItem("mindzone_confidence");
    const stress = localStorage.getItem("mindzone_stress");
    const focus = localStorage.getItem("mindzone_focus");
    const bounce = localStorage.getItem("mindzone_bounce");

    planText.textContent = "Generating your plan...";
    planGrid.hidden = true;
    planGrid.innerHTML = "";
    generateButton.disabled = true;
    regenerateBtn.disabled = true;

    const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, age, sport, goal, challenge, days, confidence, stress, focus, bounce })
    });

    const data = await response.json();

    if (data.message && !data.plan) {
        planText.textContent = data.message;
        generateButton.disabled = false;
        regenerateBtn.disabled = false;
        return;
    }

    const entries = parsePlan(data.plan);

    if (entries.length === 0) {
        planText.textContent = data.plan || "Could not parse the plan.";
        generateButton.disabled = false;
        regenerateBtn.disabled = false;
        return;
    }

    // Hide the main card once a plan is ready
    mainCard.classList.add("hidden");

    planGrid.classList.toggle("two-col", entries.length > 10);

    for (const entry of entries) {
        const row = document.createElement("div");
        row.className = "plan-row";

        const dayEl = document.createElement("div");
        dayEl.className = "plan-day";
        dayEl.textContent = "Day " + entry.day;

        const recEl = document.createElement("div");
        recEl.className = "plan-rec";
        recEl.textContent = entry.text;

        row.appendChild(dayEl);
        row.appendChild(recEl);
        planGrid.appendChild(row);
    }

    planGrid.hidden = false;
    generateButton.disabled = false;
    regenerateBtn.disabled = false;
}

function parsePlan(raw) {
    if (!raw) return [];
    const lines = raw.split(/\r?\n/);
    const out = [];
    for (const line of lines) {
        const cleaned = line.replace(/[“”"]/g, "").trim();
        const match = cleaned.match(/^Day\s+(\d+)\s*[:\-]\s*(.+)$/i);
        if (match) {
            out.push({ day: parseInt(match[1], 10), text: match[2].trim() });
        }
    }
    return out;
}
