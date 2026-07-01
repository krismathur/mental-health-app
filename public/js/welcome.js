const generateButton = document.getElementById("generatePlanButton");
const planText = document.getElementById("planText");
const planGrid = document.getElementById("planGrid");
const mainCard = document.getElementById("mainCard");

const settingsBtn = document.getElementById("settingsBtn");
const logoutBtn = document.getElementById("logoutBtn");
const settingsOverlay = document.getElementById("settingsOverlay");
const overlayBackdrop = document.getElementById("overlayBackdrop");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
let currentPlanStatus = "none";

loadProfileFromServer().then(loadCurrentPlan);

// Open settings and load saved profile data into the form
settingsBtn.addEventListener("click", function () {
    loadSettingsIntoForm();
    updateRegenerateButton();
    settingsOverlay.classList.remove("overlay-hidden");
});

logoutBtn.addEventListener("click", async function () {
    await fetch("/api/logout", {
        method: "POST"
    });

    window.location.href = "index.html";
});

closeSettingsBtn.addEventListener("click", closeSettings);
overlayBackdrop.addEventListener("click", closeSettings);

function closeSettings() {
    settingsOverlay.classList.add("overlay-hidden");
}

async function loadProfileFromServer() {
    try {
        const response = await fetch("/api/profile");

        if (!response.ok) {
            window.location.href = "onboarding.html";
            return false;
        }

        const data = await response.json();
        saveProfileToLocalStorage(data.profile);
        return true;
    } catch (error) {
        window.location.href = "onboarding.html";
        return false;
    }
}

function saveProfileToLocalStorage(profile) {
    localStorage.setItem("mindzone_name", profile.name);
    localStorage.setItem("mindzone_age", profile.age);
    localStorage.setItem("mindzone_sport", profile.sport);
    localStorage.setItem("mindzone_goal", profile.goal);
    localStorage.setItem("mindzone_challenge", profile.challenge);
    localStorage.setItem("mindzone_days", profile.days);
    localStorage.setItem("mindzone_mental_skill", profile.mental_skill);
    localStorage.setItem("mindzone_goal_commitment", profile.goal_commitment);
    localStorage.setItem("mindzone_confidence", profile.confidence);
    localStorage.setItem("mindzone_stress", profile.stress);
    localStorage.setItem("mindzone_focus", profile.focus);
    localStorage.setItem("mindzone_bounce", profile.bounce);
}

// Load profile from localStorage into the settings form
function loadSettingsIntoForm() {
    document.getElementById("settingsName").value = localStorage.getItem("mindzone_name") || "";
    document.getElementById("settingsAge").value = localStorage.getItem("mindzone_age") || "";
    document.getElementById("settingsSport").value = localStorage.getItem("mindzone_sport") || "";
    document.getElementById("settingsGoal").value = localStorage.getItem("mindzone_goal") || "";
    document.getElementById("settingsChallenge").value = localStorage.getItem("mindzone_challenge") || "";
    document.getElementById("settingsMentalSkill").value = localStorage.getItem("mindzone_mental_skill") || "";
    document.getElementById("settingsGoalCommitment").value = localStorage.getItem("mindzone_goal_commitment") || "";
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

// Read settings form and save to localStorage/database
async function saveSettingsFromForm() {
    const name = document.getElementById("settingsName").value.trim();
    const age = document.getElementById("settingsAge").value.trim();
    const sport = document.getElementById("settingsSport").value.trim();
    const goal = document.getElementById("settingsGoal").value.trim();
    const challenge = document.getElementById("settingsChallenge").value.trim();
    const mentalSkill = document.getElementById("settingsMentalSkill").value.trim();
    const goalCommitment = document.getElementById("settingsGoalCommitment").value.trim();
    const days = document.getElementById("settingsDays").value.trim();

    const confidence = document.querySelector('#settingsForm input[name="confidence"]:checked');
    const stress = document.querySelector('#settingsForm input[name="stress"]:checked');
    const focus = document.querySelector('#settingsForm input[name="focus"]:checked');
    const bounce = document.querySelector('#settingsForm input[name="bounce"]:checked');

    if (!name || !age || !sport || !goal || !challenge || !mentalSkill || !goalCommitment || !days || !confidence || !stress || !focus || !bounce) {
        alert("Please fill out every field before saving.");
        return false;
    }

    const mentalSkillNum = parseInt(mentalSkill, 10);
    const goalCommitmentNum = parseInt(goalCommitment, 10);

    if (mentalSkillNum < 1 || mentalSkillNum > 10 || goalCommitmentNum < 1 || goalCommitmentNum > 10) {
        alert("Ratings must be between 1 and 10.");
        return false;
    }

    localStorage.setItem("mindzone_name", name);
    localStorage.setItem("mindzone_age", age);
    localStorage.setItem("mindzone_sport", sport);
    localStorage.setItem("mindzone_goal", goal);
    localStorage.setItem("mindzone_challenge", challenge);
    localStorage.setItem("mindzone_mental_skill", mentalSkill);
    localStorage.setItem("mindzone_goal_commitment", goalCommitment);
    localStorage.setItem("mindzone_days", days);
    localStorage.setItem("mindzone_confidence", confidence.value);
    localStorage.setItem("mindzone_stress", stress.value);
    localStorage.setItem("mindzone_focus", focus.value);
    localStorage.setItem("mindzone_bounce", bounce.value);

    try {
        const response = await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                age,
                sport,
                goal,
                challenge,
                days,
                mentalSkill,
                goalCommitment,
                confidence: confidence.value,
                stress: stress.value,
                focus: focus.value,
                bounce: bounce.value
            })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.message);
            return false;
        }
    } catch (error) {
        alert("Could not save your profile. Please try again.");
        return false;
    }

    return true;
}

saveSettingsBtn.addEventListener("click", async function () {
    if (await saveSettingsFromForm()) {
        closeSettings();
    }
});

regenerateBtn.addEventListener("click", async function () {
    if (currentPlanStatus !== "approved") {
        alert("You can regenerate after your first plan is approved.");
        return;
    }

    if (!await saveSettingsFromForm()) {
        return;
    }
    closeSettings();
    await generatePlan("Regenerating your plan...");
});

generateButton.addEventListener("click", async function () {
    await generatePlan("Generating your plan...");
});

async function loadCurrentPlan(profileLoaded) {
    if (!profileLoaded) {
        return;
    }

    try {
        const response = await fetch("/api/my-plan");
        const data = await response.json();

        if (!response.ok) {
            showPlanMessage(data.message || "Could not load your plan.", "none");
            return;
        }

        currentPlanStatus = data.status;

        if (data.status === "approved") {
            renderPlan(data.plan);
        } else if (data.status === "pending") {
            showPlanMessage(data.message, "pending");
        } else if (data.status === "rejected") {
            showPlanMessage(data.message, "rejected");
        } else {
            showPlanMessage("Hit the button below and we'll build your daily mental training plan.", "none");
        }
    } catch (error) {
        showPlanMessage("Could not load your plan right now.", "none");
    }
}

function showPlanMessage(message, status) {
    currentPlanStatus = status;
    const waitingForApproval = status === "pending";

    mainCard.classList.remove("hidden");
    planGrid.hidden = true;
    planGrid.innerHTML = "";
    planText.textContent = message;
    generateButton.hidden = false;
    generateButton.disabled = waitingForApproval;
    generateButton.textContent = waitingForApproval ? "Waiting for Approval ⏳" : "Generate My Plan 🚀";
    updateRegenerateButton();
}

function updateRegenerateButton() {
    const canRegenerate = currentPlanStatus === "approved";
    regenerateBtn.hidden = !canRegenerate;
    regenerateBtn.disabled = !canRegenerate;
    regenerateBtn.textContent = "Regenerate Plan 🔄";
}

// Generate plan from localStorage data and wait for admin approval
async function generatePlan(loadingMessage) {
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
    const mentalSkill = localStorage.getItem("mindzone_mental_skill");
    const goalCommitment = localStorage.getItem("mindzone_goal_commitment");

    if (currentPlanStatus === "pending") {
        showPlanMessage("Your plan is already waiting for admin approval. You will have it within 24 hours or sooner.", "pending");
        return;
    }

    mainCard.classList.remove("hidden");
    planText.textContent = loadingMessage || "Generating your plan...";
    planGrid.hidden = true;
    planGrid.innerHTML = "";
    generateButton.hidden = false;
    generateButton.disabled = true;
    generateButton.textContent = "Generating... ✨";
    regenerateBtn.disabled = true;

    const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, age, sport, goal, challenge, days, confidence, stress, focus, bounce, mentalSkill, goalCommitment })
    });

    const data = await response.json();

    if (data.status === "pending") {
        showPlanMessage(data.message, "pending");
        return;
    }

    if (data.message) {
        showPlanMessage(data.message, currentPlanStatus);
        return;
    }

    showPlanMessage("Could not generate your plan.", currentPlanStatus);
}

function renderPlan(plan) {
    const entries = parsePlan(plan);

    if (entries.length === 0) {
        showPlanMessage(plan || "Could not parse the plan.", "approved");
        return;
    }

    // Hide the main card once a plan is ready
    currentPlanStatus = "approved";
    mainCard.classList.add("hidden");
    planGrid.innerHTML = "";

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
    updateRegenerateButton();
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
