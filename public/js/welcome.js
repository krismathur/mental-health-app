const generateButton = document.getElementById("generatePlanButton");
const planText = document.getElementById("planText");
const planView = document.getElementById("planView");
const mainCard = document.getElementById("mainCard");

const settingsBtn = document.getElementById("settingsBtn");
const settingsOverlay = document.getElementById("settingsOverlay");
const overlayBackdrop = document.getElementById("overlayBackdrop");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
let currentPlanStatus = "none";
let currentPlanId = null;
let currentPlanText = null;
let currentPlanData = null;
let isGeneratingPlan = false;

function finishWelcomeInit() {
    if (generateButton && !generateButton.classList.contains("is-loading") && !isGeneratingPlan) {
        setGenerateButtonState(currentPlanStatus, false);
    }
}

loadProfileFromServer()
    .then(function (profileLoaded) {
        if (profileLoaded && !profileIsComplete(getProfileFromStorage())) {
            showPlanMessage("Your profile is missing some info. Finish onboarding, then come back to generate your plan.", "none");
            return false;
        }
        return loadCurrentPlan(profileLoaded);
    })
    .finally(finishWelcomeInit);

// Safety net: never leave the button stuck disabled if profile/plan load hangs
setTimeout(finishWelcomeInit, 6000);

// Open settings and load saved profile data into the form
if (settingsBtn && settingsOverlay) {
    settingsBtn.addEventListener("click", function () {
        loadSettingsIntoForm();
        updateRegenerateButton();
        settingsOverlay.classList.remove("overlay-hidden");
    });
}

if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener("click", closeSettings);
}

if (overlayBackdrop) {
    overlayBackdrop.addEventListener("click", closeSettings);
}

function closeSettings() {
    settingsOverlay.classList.add("overlay-hidden");
}

async function loadProfileFromServer() {
    try {
        const response = await fetch("/api/profile");

        if (response.status === 401) {
            window.location.href = "auth.html";
            return false;
        }

        if (!response.ok) {
            window.location.href = "onboarding.html";
            return false;
        }

        const data = await response.json();
        saveProfileToLocalStorage(data.profile);
        return true;
    } catch (error) {
        showPlanMessage("Could not load your profile. Check your connection and try again.", "none");
        return false;
    }
}

function saveProfileToLocalStorage(profile) {
    localStorage.setItem("mindzone_name", profile.name || "");
    localStorage.setItem("mindzone_age", profile.age || "");
    localStorage.setItem("mindzone_sport", profile.sport || "");
    localStorage.setItem("mindzone_goal", profile.goal || "");
    localStorage.setItem("mindzone_challenge", profile.challenge || "");
    localStorage.setItem("mindzone_days", profile.days != null ? String(profile.days) : "");
    localStorage.setItem("mindzone_mental_skill", profile.mental_skill != null ? String(profile.mental_skill) : "");
    localStorage.setItem("mindzone_goal_commitment", profile.goal_commitment != null ? String(profile.goal_commitment) : "");
    localStorage.setItem("mindzone_confidence", profile.confidence != null ? String(profile.confidence) : "");
    localStorage.setItem("mindzone_stress", profile.stress != null ? String(profile.stress) : "");
    localStorage.setItem("mindzone_focus", profile.focus != null ? String(profile.focus) : "");
    localStorage.setItem("mindzone_bounce", profile.bounce != null ? String(profile.bounce) : "");
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
    const stored = value == null ? "" : String(value);
    const radios = document.querySelectorAll('#settingsForm input[name="' + name + '"]');
    for (const radio of radios) {
        radio.checked = radio.value === stored;
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

if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", async function () {
        if (await saveSettingsFromForm()) {
            closeSettings();
        }
    });
}

if (regenerateBtn) {
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
}

if (generateButton) {
    generateButton.addEventListener("click", async function () {
        await generatePlan("Generating your plan...");
    });
}

async function loadCurrentPlan(profileLoaded) {
    if (!profileLoaded) {
        return;
    }

    try {
        const response = await fetch("/api/my-plan");

        if (response.status === 401) {
            window.location.href = "auth.html";
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            showPlanMessage(data.message || "Could not load your plan.", "none");
            return;
        }

        currentPlanStatus = data.status || "none";

        if (data.status === "approved") {
            try {
                renderPlan(data.plan, data.planId);
            } catch (error) {
                showPlanMessage("We loaded your plan but could not show it. Tap below to generate a fresh one.", "none");
            }
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

    if (mainCard) {
        mainCard.classList.remove("hidden");
    }
    if (planView) {
        planView.hidden = true;
        planView.innerHTML = "";
    }
    if (planText) {
        planText.textContent = message;
    }
    setGenerateButtonState(status, false);
    updateRegenerateButton();
}

function updateRegenerateButton() {
    if (!regenerateBtn) {
        return;
    }

    const canRegenerate = currentPlanStatus === "approved";
    regenerateBtn.hidden = !canRegenerate;
    regenerateBtn.disabled = !canRegenerate;
    regenerateBtn.textContent = "Regenerate Plan 🔄";
}

function getProfileFromStorage() {
    return {
        name: localStorage.getItem("mindzone_name"),
        age: localStorage.getItem("mindzone_age"),
        sport: localStorage.getItem("mindzone_sport"),
        goal: localStorage.getItem("mindzone_goal"),
        challenge: localStorage.getItem("mindzone_challenge"),
        days: parseInt(localStorage.getItem("mindzone_days"), 10) || 0,
        confidence: localStorage.getItem("mindzone_confidence"),
        stress: localStorage.getItem("mindzone_stress"),
        focus: localStorage.getItem("mindzone_focus"),
        bounce: localStorage.getItem("mindzone_bounce"),
        mentalSkill: localStorage.getItem("mindzone_mental_skill"),
        goalCommitment: localStorage.getItem("mindzone_goal_commitment")
    };
}

function profileIsComplete(profile) {
    return !!(
        profile.name &&
        profile.age &&
        profile.sport &&
        profile.goal &&
        profile.challenge &&
        profile.days >= 1 &&
        profile.confidence &&
        profile.stress &&
        profile.focus &&
        profile.bounce &&
        profile.mentalSkill &&
        profile.goalCommitment
    );
}

function setGenerateButtonState(status, isLoading) {
    if (!generateButton) {
        return;
    }

    generateButton.hidden = false;
    generateButton.classList.toggle("is-loading", !!isLoading);

    if (isLoading) {
        generateButton.disabled = true;
        generateButton.textContent = "Generating... ✨";
        return;
    }

    generateButton.disabled = false;

    if (status === "pending") {
        generateButton.textContent = "Check If Plan Is Ready 🔄";
        return;
    }

    if (status === "approved") {
        generateButton.textContent = "Regenerate My Plan 🔄";
        return;
    }

    generateButton.textContent = "Generate My Plan 🚀";
}

// Generate plan from localStorage data and wait for admin approval
async function generatePlan(loadingMessage) {
    if (isGeneratingPlan) {
        return;
    }

    let profile = getProfileFromStorage();

    if (!profileIsComplete(profile)) {
        const loaded = await loadProfileFromServer();
        if (loaded) {
            profile = getProfileFromStorage();
        }
    }

    if (!profileIsComplete(profile)) {
        alert("Please finish onboarding first so we know your sport, goals, and ratings.");
        window.location.href = "onboarding.html";
        return;
    }

    if (currentPlanStatus === "pending") {
        mainCard.classList.remove("hidden");
        planText.textContent = "Checking if your plan is ready...";
        setGenerateButtonState("pending", true);
        try {
            await loadCurrentPlan(true);
        } finally {
            setGenerateButtonState(currentPlanStatus, false);
        }
        return;
    }

    isGeneratingPlan = true;
    mainCard.classList.remove("hidden");
    planText.textContent = loadingMessage || "Generating your plan...";
    planView.hidden = true;
    planView.innerHTML = "";
    setGenerateButtonState(currentPlanStatus, true);
    if (regenerateBtn) {
        regenerateBtn.disabled = true;
    }

    try {
        const response = await fetch("/api/generate-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile)
        });

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            showPlanMessage("Something went wrong while generating your plan. Please try again.", currentPlanStatus);
            return;
        }

        if (response.status === 401) {
            showPlanMessage("Your session expired. Please log in again.", "none");
            setTimeout(function () {
                window.location.href = "auth.html";
            }, 1200);
            return;
        }

        if (data.status === "approved" && data.plan && data.planId) {
            currentPlanStatus = "approved";
            try {
                renderPlan(data.plan, data.planId);
            } catch (renderError) {
                showPlanMessage("Your plan was created but could not be shown. Please refresh and try again.", "none");
            }
            return;
        }

        if (data.status === "pending") {
            showPlanMessage(data.message, "pending");
            return;
        }

        if (data.message) {
            showPlanMessage(data.message, currentPlanStatus === "approved" ? "approved" : "none");
            return;
        }

        showPlanMessage("Could not generate your plan.", currentPlanStatus === "approved" ? "approved" : "none");
    } catch (error) {
        showPlanMessage("Could not reach the server. Make sure MindZone is running and try again.", currentPlanStatus === "approved" ? "approved" : "none");
    } finally {
        isGeneratingPlan = false;
        if (generateButton && generateButton.classList.contains("is-loading")) {
            setGenerateButtonState(currentPlanStatus, false);
        }
        if (regenerateBtn) {
            regenerateBtn.disabled = currentPlanStatus !== "approved";
        }
    }
}

function getTodayDateKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + month + "-" + day;
}

function loadPlanProgress(planId) {
    const raw = localStorage.getItem("mindzone_plan_progress");
    if (!raw) {
        return { planId: planId, lastCompletedDay: 0, lastCompletedDate: null };
    }

    try {
        const progress = JSON.parse(raw);
        if (progress.planId != null && planId != null && String(progress.planId) !== String(planId)) {
            return { planId: planId, lastCompletedDay: 0, lastCompletedDate: null };
        }

        return {
            planId: planId,
            lastCompletedDay: progress.lastCompletedDay || 0,
            lastCompletedDate: progress.lastCompletedDate || null
        };
    } catch (error) {
        return { planId: planId, lastCompletedDay: 0, lastCompletedDate: null };
    }
}

function savePlanProgress(progress) {
    localStorage.setItem("mindzone_plan_progress", JSON.stringify(progress));
}

function getPlanViewState(progress, totalDays) {
    const today = getTodayDateKey();
    const nextDay = progress.lastCompletedDay + 1;

    if (progress.lastCompletedDay >= totalDays) {
        return { mode: "finished" };
    }

    if (progress.lastCompletedDay > 0 && progress.lastCompletedDate === today) {
        return {
            mode: "waiting",
            completedDay: progress.lastCompletedDay,
            nextDay: nextDay
        };
    }

    const dayToShow = progress.lastCompletedDay === 0 ? 1 : nextDay;
    return {
        mode: "active",
        day: Math.min(dayToShow, totalDays)
    };
}

function renderPlan(planText, planId) {
    currentPlanId = planId;
    currentPlanText = planText;
    currentPlanData = parsePlan(planText);

    if (!currentPlanData || currentPlanData.days.length === 0) {
        showPlanMessage("We couldn't read your saved plan. Tap below to generate a fresh one.", "none");
        return;
    }

    currentPlanStatus = "approved";
    mainCard.classList.add("hidden");
    planView.hidden = false;
    planView.innerHTML = "";

    const progress = loadPlanProgress(planId);
    const viewState = getPlanViewState(progress, currentPlanData.days.length);

    planView.appendChild(createWeeklyGoalCard(currentPlanData.weeklyGoal));

    if (viewState.mode === "finished") {
        planView.appendChild(createPlanFinishedCard());
    } else if (viewState.mode === "waiting") {
        planView.appendChild(createWaitingCard(viewState.completedDay, viewState.nextDay));
    } else {
        const dayEntry = currentPlanData.days.find(function (entry) {
            return entry.day === viewState.day;
        }) || currentPlanData.days[viewState.day - 1];

        if (!dayEntry) {
            showPlanMessage("We couldn't find today's plan step. Tap below to generate a fresh one.", "none");
            return;
        }

        planView.appendChild(createDailyPlanCard(dayEntry, progress));
    }

    generateButton.disabled = false;
    setGenerateButtonState("approved", false);
    updateRegenerateButton();
}

function createWeeklyGoalCard(weeklyGoal) {
    const card = document.createElement("section");
    card.className = "weekly-goal-card";

    const label = document.createElement("p");
    label.className = "weekly-goal-label";
    label.textContent = "This Week";

    card.appendChild(label);
    appendSentenceBlock(card, weeklyGoal, "weekly-goal-text");
    return card;
}

function appendSentenceBlock(container, content, className) {
    const sentences = Array.isArray(content)
        ? content
        : String(content || "").split(/(?<=[.!?])\s+/).filter(Boolean);

    sentences.forEach(function (sentence) {
        const paragraph = document.createElement("p");
        paragraph.className = className || "plan-sentence";
        paragraph.textContent = sentence.trim();
        container.appendChild(paragraph);
    });
}

function appendPlanParagraphs(card, title, items) {
    if (!items || !items.length) {
        return;
    }

    const section = document.createElement("div");
    section.className = title === "Today's Steps"
        ? "plan-section plan-steps-section"
        : "plan-section";

    const heading = document.createElement("h3");
    heading.textContent = title;
    section.appendChild(heading);

    items.forEach(function (item, index) {
        const paragraph = document.createElement("p");
        paragraph.className = "plan-sentence";
        paragraph.textContent = String(item).trim();
        section.appendChild(paragraph);
    });

    card.appendChild(section);
}

function createWaitingCard(completedDay, nextDay) {
    const card = document.createElement("section");
    card.className = "plan-waiting-card";
    card.innerHTML = `
        <div class="plan-waiting-icon">✅</div>
        <h2>Day ${completedDay} complete!</h2>
        <p>Great work today. Come back tomorrow for your Day ${nextDay} plan.</p>
        <p class="plan-waiting-note">One day at a time builds real mental strength.</p>
    `;
    return card;
}

function createPlanFinishedCard() {
    const card = document.createElement("section");
    card.className = "plan-finished-card";
    card.innerHTML = `
        <div class="plan-waiting-icon">🏆</div>
        <h2>You finished your plan!</h2>
        <p>You completed every day. Update your settings and regenerate if you want a new plan.</p>
    `;
    return card;
}

function createDailyPlanCard(dayEntry, progress) {
    const card = document.createElement("section");
    card.className = "daily-plan-card";

    const header = document.createElement("div");
    header.className = "daily-plan-header";
    header.innerHTML = `
        <p class="daily-plan-kicker">Today · Day ${dayEntry.day}</p>
        <h2>${escapeHtml(dayEntry.title || "Mental Training")}</h2>
    `;
    card.appendChild(header);

    if (dayEntry.daySummary && dayEntry.daySummary.length) {
        const summaryLines = Array.isArray(dayEntry.daySummary)
            ? dayEntry.daySummary
            : [String(dayEntry.daySummary)];
        const summarySection = document.createElement("div");
        summarySection.className = "plan-section plan-summary-section";
        summaryLines.slice(0, 2).forEach(function (sentence) {
            const paragraph = document.createElement("p");
            paragraph.className = "plan-sentence plan-summary-sentence";
            paragraph.textContent = String(sentence).trim();
            summarySection.appendChild(paragraph);
        });
        card.appendChild(summarySection);
    }

    const allSteps = []
        .concat(dayEntry.whatToDo || [])
        .concat(dayEntry.sportTryIt || [])
        .concat(dayEntry.thinkAboutIt || []);

    appendPlanParagraphs(card, "Today's Steps", allSteps);

    if (dayEntry.youAreDoneWhen) {
        const doneLine = document.createElement("p");
        doneLine.className = "plan-done-line";
        doneLine.textContent = Array.isArray(dayEntry.youAreDoneWhen)
            ? dayEntry.youAreDoneWhen.join(" ")
            : String(dayEntry.youAreDoneWhen);
        card.appendChild(doneLine);
    }

    const completeWrap = document.createElement("label");
    completeWrap.className = "daily-complete-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute("aria-label", "Mark day " + dayEntry.day + " complete");

    const checkVisual = document.createElement("span");
    checkVisual.className = "custom-check";

    const completeText = document.createElement("span");
    completeText.className = "daily-complete-text";
    completeText.textContent = "I finished today's plan";

    completeWrap.appendChild(checkbox);
    completeWrap.appendChild(checkVisual);
    completeWrap.appendChild(completeText);
    card.appendChild(completeWrap);

    checkbox.addEventListener("change", function () {
        if (!checkbox.checked) {
            return;
        }

        savePlanProgress({
            planId: progress.planId,
            lastCompletedDay: dayEntry.day,
            lastCompletedDate: getTodayDateKey()
        });

        card.classList.add("daily-plan-card-complete");
        setTimeout(function () {
            renderPlan(currentPlanText, currentPlanId);
        }, 500);
    });

    return card;
}

function normalizePlanFieldList(value) {
    if (Array.isArray(value)) {
        return value.map(String).filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
        return [value.trim()];
    }
    return [];
}

function parsePlan(raw) {
    if (!raw) {
        return null;
    }

    const cleaned = raw.replace(/```json|```/g, "").trim();

    try {
        const parsed = JSON.parse(cleaned);
        if (parsed.weeklyGoal && Array.isArray(parsed.days) && parsed.days.length) {
            parsed.days = parsed.days.map(function (day, index) {
                return {
                    day: day.day || index + 1,
                    title: day.title || "Day " + (index + 1),
                    duration: day.duration || "20-30 minutes",
                    daySummary: normalizePlanFieldList(day.daySummary || day.summary),
                    whatToDo: normalizePlanFieldList(day.whatToDo || day.mainWork),
                    sportTryIt: normalizePlanFieldList(day.sportTryIt || day.sportApplication),
                    thinkAboutIt: normalizePlanFieldList(day.thinkAboutIt || day.reflection),
                    youAreDoneWhen: day.youAreDoneWhen || day.completionCheck || ""
                };
            });
            return parsed;
        }
    } catch (error) {
        // Fall back to legacy one-line format below.
    }

    const lines = raw.split(/\r?\n/);
    const days = [];

    for (const line of lines) {
        const cleanedLine = line.replace(/[“”"]/g, "").trim();
        const match = cleanedLine.match(/^Day\s+(\d+)\s*[:\-]\s*(.+)$/i);
        if (match) {
            const legacySentence = match[2].trim();
            days.push({
                day: parseInt(match[1], 10),
                title: "Daily Training",
                duration: "20-25 minutes",
                daySummary: [
                    "Today you will work on one mental skill that helps you in your sport.",
                    "Take your time and read each step before you start.",
                    "You do not have to be perfect. Just try your best and finish each step."
                ],
                whatToDo: [legacySentence],
                sportTryIt: [],
                thinkAboutIt: [],
                youAreDoneWhen: "You finished every step you could do today and you checked off today's plan."
            });
        }
    }

    if (!days.length) {
        return null;
    }

    return {
        weeklyGoal: "This week you will build stronger mental habits one day at a time. Each day has simple steps you can actually do. Keep showing up and you will get better.",
        days: days
    };
}

function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
