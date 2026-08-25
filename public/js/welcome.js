// Reflow the dashboard layout so Mood Check-in becomes a full-width strip on top.
(function reflowWelcomeLayout() {
    const page = document.querySelector(".page");
    const topRow = document.querySelector(".top-row");
    const mood = document.getElementById("emotionCheckinSection");
    const dashboardName = document.getElementById("dashboardName");

    if (dashboardName) {
        const savedName = localStorage.getItem("mindzone_name");
        if (savedName) {
            dashboardName.textContent = savedName;
        }
    }

    if (page && topRow && mood) {
        page.insertBefore(mood, topRow);
    }
})();

const generateButton = document.getElementById("generatePlanButton");
const planText = document.getElementById("planText");
const planView = document.getElementById("planView");
const mainCard = document.getElementById("mainCard");
const planIntro = document.getElementById("planIntro");
const pageContainer = document.querySelector(".page");

const settingsBtn = document.getElementById("settingsBtn");
const settingsOverlay = document.getElementById("settingsOverlay");
const overlayBackdrop = document.getElementById("overlayBackdrop");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
const emotionCheckinSection = document.getElementById("emotionCheckinSection");
const weeklyReflectionSection = document.getElementById("weeklyReflectionSection");
const weeklyReflectionDueBadge = document.getElementById("weeklyReflectionDueBadge");
const weeklyReflectionWaitNotice = document.getElementById("weeklyReflectionWaitNotice");
const saveMoodBtn = document.getElementById("saveMoodBtn");
const emotionCells = document.querySelectorAll(".emotion-cell");
const moodSavedPopup = document.getElementById("moodSavedPopup");
const moodTrendBtn = document.getElementById("moodTrendBtn");
const moodTrendOverlay = document.getElementById("moodTrendOverlay");
const moodTrendBackdrop = document.getElementById("moodTrendBackdrop");
const closeMoodTrendBtn = document.getElementById("closeMoodTrendBtn");
const moodTrendSummary = document.getElementById("moodTrendSummary");
const moodTrendWeek = document.getElementById("moodTrendWeek");
const weeklyReflectionInput = document.getElementById("weeklyReflectionInput");
const weeklyReflectionNotice = document.getElementById("weeklyReflectionNotice");
const saveWeeklyReflectionBtn = document.getElementById("saveWeeklyReflectionBtn");
const MOOD_STORAGE_KEY = "mindzone_mood_today";
const MOOD_HISTORY_KEY = "mindzone_mood_history";
const WEEKLY_REFLECTION_KEY = "mindzone_weekly_reflection";
const WEEKLY_REFLECTION_SCHEDULE_KEY = "mindzone_weekly_reflection_schedule";
const MOOD_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const POSITIVE_MOODS = ["Happy", "Calm", "Excited", "Proud"];
const TOUGH_MOODS = ["Anxious", "Sad", "Angry", "Stressed", "Tired"];
const AFTER_LOGIN_FLAG = "mindzone_after_login";
const PENDING_WEEKLY_REFLECTION_FLAG = "mindzone_pending_weekly_reflection";
const VIDEO_LIBRARY_MATCHES = [
    { number: 1, keywords: ["visualiz", "mental rehearsal", "imagery", "rehearsal", "picture in your mind", "see yourself", "imagine"] },
    { number: 2, keywords: ["pregame", "prepare", "mental prep", "before game", "before practice", "breath", "breathing", "warm up", "routine"] },
    { number: 3, keywords: ["clutch", "big moment", "pressure moment", "locked in", "crunch time", "important game"] },
    { number: 4, keywords: ["nerv", "pressure", "anxiety", "anxious", "stress", "worried", "reset", "calm down", "overwhelmed"] },
    { number: 5, keywords: ["confidence", "confident", "winner", "self-belief", "believe in", "work ethic", "self-talk"] },
    { number: 6, keywords: ["mental toughness", "daily exercise", "practice daily", "mental habit", "every day", "build habit"] },
    { number: 7, keywords: ["mental health", "self-care", "prioritize", "wellbeing", "well-being", "take care"] },
    { number: 8, keywords: ["self-doubt", "doubt", "accountability", "leadership", "team", "preparation"] },
    { number: 9, keywords: ["failure", "fear", "illusion", "try again", "bounce back", "mistake", "bad game", "recover", "comeback"] },
    { number: 10, keywords: ["mamba", "discipline", "resilience", "grit", "mindset", "get better", "keep going", "never give up"] }
];
let moodSavedPopupTimer = null;
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
    .finally(function () {
        finishWelcomeInit();
        updateMoodCheckinUI();
        maybeOpenAfterLoginPrompts();
    });

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

const welcomePageParams = new URLSearchParams(window.location.search);
if (welcomePageParams.get("open") === "settings" && settingsBtn) {
    setTimeout(function () {
        settingsBtn.click();
    }, 0);
}

function closeSettings() {
    settingsOverlay.classList.add("overlay-hidden");
}

function scrollToDashboardSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) {
        return;
    }

    let node = section;
    while (node) {
        if (node.tagName === "DETAILS") {
            node.open = true;
        }
        node = node.parentElement;
    }

    const highlightTarget = section.classList.contains("tool-card")
        || section.classList.contains("tool-details")
        || section.classList.contains("tool-block")
        ? section
        : section.closest(".tool-card, .tool-details, .tool-block") || section;

    highlightTarget.classList.add("is-highlighted");
    highlightTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(function () {
        highlightTarget.classList.remove("is-highlighted");
    }, 2200);
}

window.scrollToDashboardSection = scrollToDashboardSection;

function openEmotionCheckin() {
    updateMoodCheckinUI();
    if (hasCompletedMoodCheckinToday()) {
        return;
    }
    restoreSavedMoodSelection();
    scrollToDashboardSection("emotionCheckinSection");
}

function ensureReflectionScheduleFromHistory() {
    const schedule = getReflectionSchedule();
    if (schedule.firstCheckinDate) {
        return;
    }

    const history = getMoodHistory();
    if (!history.length) {
        return;
    }

    const firstDate = history[0].date;
    schedule.firstCheckinDate = firstDate;
    schedule.nextDueDate = addDaysToDateString(firstDate, 1);

    const entry = getWeeklyReflectionEntry();
    if (entry && entry.savedOn && entry.savedOn >= schedule.nextDueDate) {
        schedule.lastReflectionDate = entry.savedOn;
        schedule.nextDueDate = addDaysToDateString(entry.savedOn, 7);
    }

    saveReflectionSchedule(schedule);
}

function maybeOpenAfterLoginPrompts() {
    if (sessionStorage.getItem(AFTER_LOGIN_FLAG) !== "1") {
        return;
    }

    sessionStorage.removeItem(AFTER_LOGIN_FLAG);
    sessionStorage.setItem("mindzone_login_handled", "1");

    if (!getMoodForDate(getTodayDateString())) {
        setTimeout(openEmotionCheckin, 400);
    }
}

function closeEmotionCheckin() {
    if (window.MeditationSpeech) {
        window.MeditationSpeech.cancel();
    }
    clearEmotionSpeakState();
}

function clearEmotionSpeakState() {
    document.querySelectorAll(".emotion-speak-btn.is-speaking").forEach(function (button) {
        button.classList.remove("is-speaking");
    });
}

function speakMoodLabel(cell) {
    if (!cell || !window.MeditationSpeech) {
        return;
    }

    const moodName = cell.dataset.emotion;
    if (!moodName) {
        return;
    }

    const speakButton = cell.querySelector(".emotion-speak-btn");
    clearEmotionSpeakState();

    window.MeditationSpeech.speak(moodName, {
        onStart: function () {
            if (speakButton) {
                speakButton.classList.add("is-speaking");
            }
        },
        onEnd: function () {
            if (speakButton) {
                speakButton.classList.remove("is-speaking");
            }
        },
        onError: function () {
            if (speakButton) {
                speakButton.classList.remove("is-speaking");
            }
        }
    });
}

function selectEmotionCell(cell) {
    emotionCells.forEach(function (otherCell) {
        otherCell.classList.remove("is-selected");
    });
    cell.classList.add("is-selected");
    updateSaveMoodButton();
}

function getTodayDateString() {
    return AppTime.getToday();
}

function getMoodHistory() {
    const savedHistory = localStorage.getItem(MOOD_HISTORY_KEY);
    if (savedHistory) {
        try {
            const history = JSON.parse(savedHistory);
            if (Array.isArray(history)) {
                return history;
            }
        } catch (error) {
            localStorage.removeItem(MOOD_HISTORY_KEY);
        }
    }

    const legacyMood = localStorage.getItem(MOOD_STORAGE_KEY);
    if (legacyMood) {
        try {
            const mood = JSON.parse(legacyMood);
            if (mood && mood.date && mood.emotion) {
                return [mood];
            }
        } catch (error) {
            localStorage.removeItem(MOOD_STORAGE_KEY);
        }
    }

    return [];
}

function saveMoodHistoryEntry(mood) {
    const history = getMoodHistory().filter(function (entry) {
        return entry.date !== mood.date;
    });
    history.push(mood);
    history.sort(function (a, b) {
        return a.date.localeCompare(b.date);
    });

    if (history.length > 90) {
        history.splice(0, history.length - 90);
    }

    localStorage.setItem(MOOD_HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(mood));
}

function getMoodForDate(dateString) {
    return getMoodHistory().find(function (entry) {
        return entry.date === dateString;
    }) || null;
}

function getCurrentWeekDates() {
    return AppTime.getWeekDates();
}

function getCurrentWeekKey() {
    return AppTime.getWeekKey();
}

function addDaysToDateString(dateString, days) {
    const date = new Date(dateString + "T12:00:00");
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}

function getReflectionSchedule() {
    const saved = localStorage.getItem(WEEKLY_REFLECTION_SCHEDULE_KEY);
    if (!saved) {
        return {
            firstCheckinDate: "",
            nextDueDate: "",
            lastReflectionDate: ""
        };
    }

    try {
        const parsed = JSON.parse(saved);
        return {
            firstCheckinDate: parsed.firstCheckinDate || "",
            nextDueDate: parsed.nextDueDate || "",
            lastReflectionDate: parsed.lastReflectionDate || ""
        };
    } catch (error) {
        localStorage.removeItem(WEEKLY_REFLECTION_SCHEDULE_KEY);
        return {
            firstCheckinDate: "",
            nextDueDate: "",
            lastReflectionDate: ""
        };
    }
}

function saveReflectionSchedule(schedule) {
    localStorage.setItem(WEEKLY_REFLECTION_SCHEDULE_KEY, JSON.stringify(schedule));
}

function scheduleWeeklyReflectionAfterCheckin() {
    const today = getTodayDateString();
    const schedule = getReflectionSchedule();

    if (!schedule.firstCheckinDate) {
        schedule.firstCheckinDate = today;
        schedule.nextDueDate = addDaysToDateString(today, 1);
        saveReflectionSchedule(schedule);
        updateWeeklyReflectionUI();
    }
}

function getWeeklyReflectionEntry() {
    const saved = localStorage.getItem(WEEKLY_REFLECTION_KEY);
    if (!saved) {
        return null;
    }

    try {
        return JSON.parse(saved);
    } catch (error) {
        localStorage.removeItem(WEEKLY_REFLECTION_KEY);
        return null;
    }
}

function isWeeklyReflectionDue() {
    const schedule = getReflectionSchedule();
    if (!schedule.nextDueDate) {
        return false;
    }

    return getTodayDateString() >= schedule.nextDueDate;
}

function hasCompletedReflectionForCurrentCycle() {
    const entry = getWeeklyReflectionEntry();
    const schedule = getReflectionSchedule();

    if (!entry || !entry.savedOn || !schedule.nextDueDate) {
        return false;
    }

    return entry.savedOn >= schedule.nextDueDate;
}

function updateWeeklyReflectionUI() {
    const due = isWeeklyReflectionDue();
    const completed = hasCompletedReflectionForCurrentCycle();
    const schedule = getReflectionSchedule();
    const entry = getWeeklyReflectionEntry();

    if (weeklyReflectionDueBadge) {
        weeklyReflectionDueBadge.hidden = !(due && !completed);
    }

    if (weeklyReflectionWaitNotice) {
        weeklyReflectionWaitNotice.hidden = !!schedule.firstCheckinDate || due;
    }

    if (weeklyReflectionInput) {
        weeklyReflectionInput.disabled = false;
        weeklyReflectionInput.readOnly = completed;

        if (completed && entry && entry.text) {
            weeklyReflectionInput.value = entry.text;
        }
    }

    if (saveWeeklyReflectionBtn) {
        saveWeeklyReflectionBtn.disabled = completed || !due;
    }

    if (weeklyReflectionSection) {
        weeklyReflectionSection.classList.toggle("is-due", due && !completed);

        if (weeklyReflectionSection.tagName === "DETAILS" && due && !completed) {
            weeklyReflectionSection.open = true;
        }
    }
}

function openWeeklyReflection() {
    if (weeklyReflectionInput && !hasCompletedReflectionForCurrentCycle()) {
        weeklyReflectionInput.value = "";
    }

    if (weeklyReflectionNotice) {
        weeklyReflectionNotice.hidden = true;
    }

    if (weeklyReflectionSection && weeklyReflectionSection.tagName === "DETAILS") {
        weeklyReflectionSection.open = true;
    }

    scrollToDashboardSection("weeklyReflectionSection");
}

function closeWeeklyReflection() {
    // Inline panel stays visible; nothing to close.
}

function saveWeeklyReflection() {
    if (!weeklyReflectionInput) {
        return;
    }

    const text = weeklyReflectionInput.value.trim();
    if (!text) {
        return;
    }

    if (!isWeeklyReflectionDue()) {
        if (weeklyReflectionWaitNotice) {
            weeklyReflectionWaitNotice.hidden = false;
        }
        return;
    }

    if (hasCompletedReflectionForCurrentCycle()) {
        if (weeklyReflectionNotice) {
            weeklyReflectionNotice.hidden = false;
        }
        return;
    }

    const today = getTodayDateString();
    localStorage.setItem(WEEKLY_REFLECTION_KEY, JSON.stringify({
        text: text,
        savedOn: today
    }));

    const schedule = getReflectionSchedule();
    schedule.lastReflectionDate = today;
    schedule.nextDueDate = addDaysToDateString(today, 7);
    saveReflectionSchedule(schedule);

    sessionStorage.removeItem(PENDING_WEEKLY_REFLECTION_FLAG);
    updateWeeklyReflectionUI();

    if (weeklyReflectionInput) {
        weeklyReflectionInput.value = text;
    }
}

function hasCompletedMoodCheckinToday() {
    return !!getMoodForDate(getTodayDateString());
}

function updateMoodCheckinUI() {
    if (!emotionCheckinSection) {
        return;
    }

    const completed = hasCompletedMoodCheckinToday();
    emotionCheckinSection.hidden = completed;

    if (!completed) {
        restoreSavedMoodSelection();
    }
}

function getWeekMoodEntries() {
    return getCurrentWeekDates().map(function (dateString) {
        const date = new Date(dateString + "T12:00:00");
        return {
            date: dateString,
            dayName: MOOD_DAY_NAMES[date.getDay()],
            mood: getMoodForDate(dateString)
        };
    });
}

function getOverallMoodSummary(weekEntries) {
    const loggedEntries = weekEntries.filter(function (entry) {
        return entry.mood;
    });

    if (!loggedEntries.length) {
        return {
            headline: "No check-ins yet",
            message: "Use Mood Check-in to save how you feel each day. Your weekly trend will show up here."
        };
    }

    const counts = {};
    loggedEntries.forEach(function (entry) {
        const emotion = entry.mood.emotion;
        counts[emotion] = (counts[emotion] || 0) + 1;
    });

    const ranked = Object.keys(counts).sort(function (a, b) {
        return counts[b] - counts[a];
    });
    const topEmotion = ranked[0];
    const topEntry = loggedEntries.find(function (entry) {
        return entry.mood.emotion === topEmotion;
    });
    const topEmoji = topEntry ? topEntry.mood.emoji : "";

    let positiveCount = 0;
    let toughCount = 0;
    loggedEntries.forEach(function (entry) {
        if (POSITIVE_MOODS.includes(entry.mood.emotion)) {
            positiveCount += 1;
        }
        if (TOUGH_MOODS.includes(entry.mood.emotion)) {
            toughCount += 1;
        }
    });

    let message = "You logged " + topEmotion.toLowerCase() + " most often this week.";
    if (positiveCount >= toughCount + 2) {
        message = "Overall, this has been a positive week for you. " + topEmoji + " " + topEmotion + " showed up the most.";
    } else if (toughCount >= positiveCount + 2) {
        message = "This week has felt heavier overall. Checking in is a strong step — " + topEmotion.toLowerCase() + " came up most.";
    } else if (loggedEntries.length >= 3) {
        message = "You have had a mixed week. Your most common mood was " + topEmotion.toLowerCase() + ".";
    }

    return {
        headline: "Your overall mood: " + topEmotion + " " + topEmoji,
        message: message
    };
}

function renderMoodTrend() {
    if (!moodTrendSummary || !moodTrendWeek) {
        return;
    }

    const weekEntries = getWeekMoodEntries();
    const summary = getOverallMoodSummary(weekEntries);

    moodTrendWeek.innerHTML = weekEntries.map(function (entry) {
        if (!entry.mood) {
            return `
                <div class="mood-trend-day is-empty">
                    <p class="mood-trend-day-name">${escapeHtml(entry.dayName)}</p>
                    <div class="mood-trend-day-box">
                        <span class="mood-trend-day-empty">—</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="mood-trend-day">
                <p class="mood-trend-day-name">${escapeHtml(entry.dayName)}</p>
                <div class="mood-trend-day-box">
                    <span class="mood-trend-day-emoji" aria-hidden="true">${escapeHtml(entry.mood.emoji)}</span>
                    <span class="mood-trend-day-label">${escapeHtml(entry.mood.emotion)}</span>
                </div>
            </div>
        `;
    }).join("");

    moodTrendSummary.innerHTML = `
        <p class="mood-trend-headline">${escapeHtml(summary.headline)}</p>
        <p class="mood-trend-message">${escapeHtml(summary.message)}</p>
        <p class="mood-trend-tip">Keep logging daily — small check-ins build a clearer picture of your mental game.</p>
    `;
}

function openMoodTrend() {
    renderMoodTrend();
    if (moodTrendOverlay) {
        moodTrendOverlay.classList.remove("overlay-hidden");
    }
}

function closeMoodTrend() {
    if (moodTrendOverlay) {
        moodTrendOverlay.classList.add("overlay-hidden");
    }
}

function findMatchingVideoNumbers(text) {
    const lower = String(text).toLowerCase();
    const matches = [];

    VIDEO_LIBRARY_MATCHES.forEach(function (video) {
        if (video.keywords.some(function (keyword) {
            return lower.includes(keyword);
        })) {
            matches.push(video.number);
        }
    });

    return matches.filter(function (number, index, list) {
        return list.indexOf(number) === index;
    });
}

function getDayEntryText(dayEntry) {
    return [
        dayEntry.title,
        dayEntry.daySummary,
        dayEntry.whatToDo,
        dayEntry.sportTryIt,
        dayEntry.thinkAboutIt,
        dayEntry.youAreDoneWhen
    ].flat().filter(Boolean).map(String).join(" ");
}

function findBestVideoNumber(text) {
    const matches = findMatchingVideoNumbers(text);
    if (matches.length) {
        return matches[0];
    }

    const lower = String(text).toLowerCase();
    const fallbacks = [
        [["visual", "imagin"], 1],
        [["focus", "concentrat"], 2],
        [["clutch", "big game"], 3],
        [["nerv", "anx", "stress", "pressur", "calm", "breath"], 4],
        [["confiden", "believe"], 5],
        [["habit", "daily", "every day"], 6],
        [["health", "care"], 7],
        [["doubt", "team", "leader"], 8],
        [["mistake", "bounce", "fail", "bad game"], 9],
        [["discipline", "better", "keep going"], 10]
    ];

    for (let i = 0; i < fallbacks.length; i++) {
        const words = fallbacks[i][0];
        const number = fallbacks[i][1];
        if (words.some(function (word) {
            return lower.includes(word);
        })) {
            return number;
        }
    }

    return null;
}

function formatPlanStepText(text) {
    const trimmed = String(text).trim();
    const matches = findMatchingVideoNumbers(trimmed);

    if (!matches.length) {
        return trimmed;
    }

    if (matches.length === 1) {
        return trimmed + " Look in the video library for video number " + matches[0] + ".";
    }

    return trimmed + " Look in the video library for video numbers " + matches.join(", ") + ".";
}

function planCardHasVideoHint(card) {
    return card.textContent.indexOf("Look in the video library for video number") !== -1;
}

function appendPlanVideoHint(card, dayEntry) {
    if (planCardHasVideoHint(card)) {
        return;
    }

    const bestVideo = findBestVideoNumber(getDayEntryText(dayEntry));
    if (!bestVideo) {
        return;
    }

    const hint = document.createElement("p");
    hint.className = "plan-sentence plan-video-hint";
    hint.textContent = "Look in the video library for video number " + bestVideo + ".";
    card.appendChild(hint);
}

function daysToWeeks(daysValue) {
    const days = parseInt(daysValue, 10);
    if (!days || days < 1) {
        return "";
    }

    return String(Math.max(1, Math.round(days / 7)));
}

function weeksToDays(weeksValue) {
    const weeks = parseInt(weeksValue, 10);
    if (!weeks || weeks < 1) {
        return "";
    }

    return String(weeks * 7);
}

function getSelectedEmotionCell() {
    return document.querySelector(".emotion-cell.is-selected");
}

function updateSaveMoodButton() {
    if (!saveMoodBtn) {
        return;
    }

    saveMoodBtn.disabled = !getSelectedEmotionCell();
}

function restoreSavedMoodSelection() {
    emotionCells.forEach(function (cell) {
        cell.classList.remove("is-selected");
    });

    const savedMood = getMoodForDate(getTodayDateString());
    if (savedMood && savedMood.emotion) {
        emotionCells.forEach(function (cell) {
            if (cell.dataset.emotion === savedMood.emotion) {
                cell.classList.add("is-selected");
            }
        });
    }

    updateSaveMoodButton();
}

function saveMoodToday() {
    const selectedCell = getSelectedEmotionCell();
    if (!selectedCell) {
        return;
    }

    const mood = {
        date: getTodayDateString(),
        emotion: selectedCell.dataset.emotion,
        emoji: selectedCell.dataset.emoji || selectedCell.dataset.emotion || ""
    };

    localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(mood));
    saveMoodHistoryEntry(mood);
    scheduleWeeklyReflectionAfterCheckin();
    updateMoodCheckinUI();
    closeEmotionCheckin();
    showMoodSavedPopup();
}

function showMoodSavedPopup() {
    if (!moodSavedPopup) {
        return;
    }

    moodSavedPopup.classList.remove("mood-saved-popup-hidden");
    clearTimeout(moodSavedPopupTimer);
    moodSavedPopupTimer = setTimeout(function () {
        moodSavedPopup.classList.add("mood-saved-popup-hidden");
    }, 1600);
}

if (saveMoodBtn) {
    saveMoodBtn.addEventListener("click", saveMoodToday);
}

const viewMoodTrendBtn = document.getElementById("viewMoodTrendBtn");
if (viewMoodTrendBtn) {
    viewMoodTrendBtn.addEventListener("click", function () {
        clearTimeout(moodSavedPopupTimer);
        if (moodSavedPopup) {
            moodSavedPopup.classList.add("mood-saved-popup-hidden");
        }
        openMoodTrend();
    });
}

if (moodTrendBtn) {
    moodTrendBtn.addEventListener("click", function (event) {
        event.preventDefault();
        openMoodTrend();
    });
}

if (closeMoodTrendBtn) {
    closeMoodTrendBtn.addEventListener("click", closeMoodTrend);
}

if (moodTrendBackdrop) {
    moodTrendBackdrop.addEventListener("click", closeMoodTrend);
}

if (saveWeeklyReflectionBtn) {
    saveWeeklyReflectionBtn.addEventListener("click", saveWeeklyReflection);
}

updateMoodCheckinUI();

emotionCells.forEach(function (cell) {
    const pickButton = cell.querySelector(".emotion-pick-btn");
    const speakButton = cell.querySelector(".emotion-speak-btn");

    if (pickButton) {
        pickButton.addEventListener("click", function () {
            selectEmotionCell(cell);
        });
    }

    if (speakButton) {
        speakButton.addEventListener("click", function (event) {
            event.stopPropagation();
            speakMoodLabel(cell);
        });
    }
});

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
    document.getElementById("settingsWeeks").value = daysToWeeks(localStorage.getItem("mindzone_days"));

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
    const weeks = document.getElementById("settingsWeeks").value.trim();

    const confidence = document.querySelector('#settingsForm input[name="confidence"]:checked');
    const stress = document.querySelector('#settingsForm input[name="stress"]:checked');
    const focus = document.querySelector('#settingsForm input[name="focus"]:checked');
    const bounce = document.querySelector('#settingsForm input[name="bounce"]:checked');

    if (!name || !age || !sport || !goal || !challenge || !mentalSkill || !goalCommitment || !weeks || !confidence || !stress || !focus || !bounce) {
        alert("Please fill out every field before saving.");
        return false;
    }

    const mentalSkillNum = parseInt(mentalSkill, 10);
    const goalCommitmentNum = parseInt(goalCommitment, 10);
    const weeksNum = parseInt(weeks, 10);

    if (mentalSkillNum < 1 || mentalSkillNum > 10 || goalCommitmentNum < 1 || goalCommitmentNum > 10) {
        alert("Ratings must be between 1 and 10.");
        return false;
    }

    if (weeksNum < 1 || weeksNum > 4) {
        alert("Plan length must be between 1 and 4 weeks.");
        return false;
    }

    const days = weeksToDays(weeks);

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
        } else {
            showPlanMessage("Visualization, Understanding your mistakes, Resetting your mind, and Good mental choices are the four steps to great mental strength.", "none");
        }
    } catch (error) {
        showPlanMessage("Could not load your plan right now.", "none");
    }
}

function restorePlanIntroToPage() {
    const toolPlan = document.querySelector(".tool-plan");
    const topLeft = document.querySelector(".top-left");
    const restoreParent = toolPlan || topLeft || pageContainer;

    if (!planIntro || !restoreParent) {
        return;
    }

    if (planIntro.parentElement === restoreParent) {
        planIntro.classList.remove("plan-intro--in-card");
        return;
    }

    restoreParent.insertBefore(planIntro, restoreParent.firstChild);
    planIntro.classList.remove("plan-intro--in-card");
}

function attachPlanIntroToWeeklyGoal(card) {
    // Keep the page title above the plan boxes instead of moving it into the card.
    restorePlanIntroToPage();
}

function showPlanMessage(message, status) {
    currentPlanStatus = status;
    restorePlanIntroToPage();

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

    if (status === "approved") {
        generateButton.textContent = "Regenerate My Plan 🔄";
        return;
    }

    generateButton.textContent = "Generate My Plan 🚀";
}

// Generate a plan from the saved onboarding profile.
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

    isGeneratingPlan = true;
    mainCard.classList.remove("hidden");
    planText.textContent = loadingMessage || "Generating your plan...";
    restorePlanIntroToPage();
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
    return AppTime.getToday();
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
    restorePlanIntroToPage();
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
    attachPlanIntroToWeeklyGoal(card);

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
        : splitSentences(String(content || ""));

    sentences.forEach(function (sentence) {
        const paragraph = document.createElement("p");
        paragraph.className = className || "plan-sentence";
        paragraph.textContent = sentence.trim();
        container.appendChild(paragraph);
    });
}

function splitSentences(text){
    const matches = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
    return matches ? matches.map(function (sentence) { return sentence.trim(); }).filter(Boolean) : [];
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

    items.forEach(function (item) {
        const paragraph = document.createElement("p");
        paragraph.className = "plan-sentence";
        paragraph.textContent = formatPlanStepText(item);
        section.appendChild(paragraph);
    });

    card.appendChild(section);
}

const DAILY_GAMES = [
    {
        name: "The Impossible Mountain",
        href: "game/index.html",
        detail: "Practice recovering from mistakes, setbacks, and tough moments.",
        keywords: ["mistake", "bounce", "setback", "resilien", "fail", "recover", "confidence"]
    },
    {
        name: "Deep Diver",
        href: "deep-diver/index.html",
        detail: "Practice staying calm, focused, and in control under pressure.",
        keywords: ["calm", "stress", "pressure", "breath", "anx", "nerv", "focus", "concentrat"]
    },
    {
        name: "Lantern Walk",
        href: "lantern-walk/index.html",
        detail: "Practice making healthy mental choices and looking after yourself.",
        keywords: ["self-care", "look after", "rest", "routine", "choice", "habit", "balance", "kind"]
    }
];

function getDailyGame(dayEntry) {
    const dayNumber = parseInt(dayEntry && dayEntry.day, 10) || 1;
    const fallbackGame = DAILY_GAMES[(dayNumber - 1) % DAILY_GAMES.length];
    const planTheme = [
        dayEntry && dayEntry.title,
        dayEntry && dayEntry.daySummary,
        dayEntry && dayEntry.sportTryIt,
        dayEntry && dayEntry.thinkAboutIt
    ].flat().filter(Boolean).join(" ").toLowerCase();

    let bestGame = fallbackGame;
    let bestScore = 0;

    DAILY_GAMES.forEach(function (game) {
        const score = game.keywords.reduce(function (total, keyword) {
            return total + (planTheme.includes(keyword) ? 1 : 0);
        }, 0);

        if (score > bestScore) {
            bestGame = game;
            bestScore = score;
        }
    });

    return bestGame;
}

function appendMindZoneFeatures(card, dayEntry) {
    const titleTheme = String(dayEntry && dayEntry.title ? dayEntry.title : "today's focus").trim();
    const dailyGame = getDailyGame(dayEntry);
    const features = [
        {
            name: "Visualization",
            detail: "Complete a guided session connected to " + titleTheme + ".",
            href: "meditation.html?open=visualization",
            tone: "viz"
        },
        {
            name: "Understanding your mistakes",
            detail: "Write one sports mistake from practice or a game and watch the matching clip.",
            href: "meditation.html?open=fix",
            tone: "fix"
        },
        {
            name: "Resetting your mind",
            detail: "Do one breathing exercise to calm your body and clear your head.",
            href: "meditation.html?open=reset",
            tone: "reset"
        },
        {
            name: "Good mental choices",
            detail: "Practice the good mental choice with your athlete avatar.",
            href: "meditation.html?open=choices",
            tone: "choices"
        },
        {
            name: "Today's Game: " + dailyGame.name,
            detail: dailyGame.detail,
            href: dailyGame.href,
            tone: "game",
            cta: "Play today's game →"
        }
    ];

    const section = document.createElement("div");
    section.className = "plan-section plan-features-section";

    const heading = document.createElement("h3");
    heading.textContent = "Today's 5 Activities";
    section.appendChild(heading);

    const intro = document.createElement("p");
    intro.className = "plan-sentence plan-features-intro";
    intro.textContent = "Complete all four MindZone tools and today's assigned game.";
    section.appendChild(intro);

    const list = document.createElement("div");
    list.className = "plan-features-list";

    features.forEach(function (feature) {
        const item = document.createElement("a");
        item.className = "plan-feature-item plan-feature-" + feature.tone;
        item.href = feature.href;
        item.setAttribute("aria-label", "Open " + feature.name);
        item.innerHTML =
            "<span class=\"plan-feature-copy\">" +
                "<strong>" + escapeHtml(feature.name) + "</strong>" +
                "<span>" + escapeHtml(feature.detail) + "</span>" +
                "<em class=\"plan-feature-cta\">" + escapeHtml(feature.cta || "Click to open →") + "</em>" +
            "</span>" +
            "<span class=\"plan-feature-arrow\" aria-hidden=\"true\">→</span>";
        list.appendChild(item);
    });

    section.appendChild(list);
    card.appendChild(section);
}

function appendPlanCoachingDetails(card, dayEntry) {
    const details = document.createElement("details");
    details.className = "plan-coaching-details";

    const summary = document.createElement("summary");
    summary.innerHTML =
        "<span><strong>Want more guidance?</strong>" +
        "<small>Open your step-by-step coaching details.</small></span>" +
        "<span class=\"coaching-details-icon\" aria-hidden=\"true\">+</span>";
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "plan-coaching-details-body";
    appendPlanParagraphs(body, "Today's Focus", dayEntry.daySummary);
    appendPlanParagraphs(body, "Step-by-Step Help", dayEntry.whatToDo);
    appendPlanParagraphs(body, "Try It in Your Sport", dayEntry.sportTryIt);
    appendPlanParagraphs(body, "Think About It", dayEntry.thinkAboutIt);

    const doneWhen = normalizePlanFieldList(dayEntry.youAreDoneWhen);
    doneWhen.push("Finish today's assigned MindZone game before checking off your plan.");
    appendPlanParagraphs(body, "You Are Done When", doneWhen);

    details.appendChild(body);
    card.appendChild(details);
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
        <div>
            <p class="daily-plan-kicker">TODAY · DAY ${dayEntry.day}</p>
            <h2>${escapeHtml(dayEntry.title || "Mental Training")}</h2>
        </div>
        <span class="daily-plan-duration">${escapeHtml(dayEntry.duration || "20–30 min")}</span>
    `;
    card.appendChild(header);

    appendMindZoneFeatures(card, dayEntry);
    appendPlanCoachingDetails(card, dayEntry);

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
