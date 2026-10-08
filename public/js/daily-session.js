"use strict";

const DAILY_SESSION_HISTORY_KEY = "mindzone_daily_session_history";
const DAILY_ROUTINES = [
    {
        name: "Calm before you begin",
        visualizationTitle: "Walk into your next moment calm.",
        visualizationLead: "Press play and picture yourself starting with a steady body and a clear mind.",
        visualizationLines: [
            "Sit tall and let your hands rest. Take one easy breath and notice the ground beneath you.",
            "Picture the place where you play {sport}. Notice the space, the sounds, and the people around you.",
            "See yourself arriving with time to get ready. Your movements are unhurried and steady.",
            "A nervous thought shows up before you begin. You notice it without letting it choose what happens next.",
            "Watch yourself breathe out slowly. Your face softens and your attention comes back to the present.",
            "Choose one simple first job: look up, find your position, or feel your feet.",
            "Picture yourself beginning the play with patience and control.",
            "See the moment again. This time, notice how your calm start helps the next action feel easier.",
            "Take one more slow breath. You do not need to know the whole game. You only need the first step.",
            "Say this quietly in your mind: Calm and ready. One step at a time."
        ],
        breathing: {
            title: "Six steady box breaths.",
            lead: "Follow all four sides: breathe in, hold, breathe out, and rest.",
            rounds: 6,
            complete: "Six box breaths complete",
            phases: [
                { cue: "Breathe in", seconds: 4, className: "is-inhaling" },
                { cue: "Hold", seconds: 4, className: "is-holding" },
                { cue: "Breathe out", seconds: 4, className: "is-exhaling" },
                { cue: "Rest", seconds: 4, className: "is-holding" }
            ]
        },
        releaseTitle: "What can you set down before you begin?",
        releaseChoices: ["Worry about starting", "Feeling rushed", "Needing to be perfect", "A nervous thought"],
        resetLabel: "PICK YOUR READY THOUGHT",
        resetChoices: ["Calm and ready.", "One step at a time.", "I trust my practice."]
    },
    {
        name: "Bounce back strong",
        visualizationTitle: "See yourself recover from a mistake.",
        visualizationLead: "Press play and practice what you will do immediately after something goes wrong.",
        visualizationLines: [
            "Sit tall and loosen your jaw and shoulders. Let one slow breath out.",
            "Picture the place where you play {sport}. See yourself fully involved in the action.",
            "Now picture one mistake. It is a small moment, not the whole story.",
            "Notice the first frustrated thought, then imagine it moving past like a cloud.",
            "Watch yourself take one long breath out and lift your eyes toward what is happening now.",
            "Choose the next useful action: move your feet, call to a teammate, or reset your position.",
            "Picture yourself making that next action with energy and courage.",
            "See how quickly the mistake becomes part of the past once you return to the play.",
            "Take one more slow breath and feel your body become ready again.",
            "Say this quietly in your mind: I can learn, reset, and keep going."
        ],
        breathing: {
            title: "Eight long-exhale breaths.",
            lead: "A longer breath out helps your body settle after a frustrating moment.",
            rounds: 8,
            complete: "Eight bounce-back breaths complete",
            phases: [
                { cue: "Breathe in", seconds: 4, className: "is-inhaling" },
                { cue: "Pause", seconds: 1, className: "is-holding" },
                { cue: "Breathe out", seconds: 7, className: "is-exhaling" }
            ]
        },
        releaseTitle: "What can stay in the last play?",
        releaseChoices: ["The last mistake", "The score", "A frustrated feeling", "A bad call"],
        resetLabel: "PICK YOUR BOUNCE-BACK THOUGHT",
        resetChoices: ["Next play.", "Learn and move.", "I can bounce back."]
    },
    {
        name: "Lock in your focus",
        visualizationTitle: "See yourself return to one clear job.",
        visualizationLead: "Press play and practice bringing your attention back when distractions appear.",
        visualizationLines: [
            "Sit tall and take one quiet breath. Notice one sound, then let it fade into the background.",
            "Picture the place where you play {sport}. There may be noise, movement, and people watching.",
            "See one distraction pull your attention away for a moment.",
            "Instead of fighting it, notice it and turn your eyes back to what matters now.",
            "Take a steady breath and feel both feet connect with the ground.",
            "Choose one clear job: watch the ball, hold your position, or finish your movement.",
            "Picture yourself doing that one job with full attention.",
            "Let everything else become quieter while you stay connected to the next action.",
            "Take one more breath and feel your focus become simple, not forced.",
            "Say this quietly in your mind: Right here. Right now. One clear job."
        ],
        breathing: {
            title: "Eight focus breaths.",
            lead: "Count evenly, then let the longer exhale clear extra noise from your mind.",
            rounds: 8,
            complete: "Eight focus breaths complete",
            phases: [
                { cue: "Breathe in", seconds: 3, className: "is-inhaling" },
                { cue: "Hold", seconds: 3, className: "is-holding" },
                { cue: "Breathe out", seconds: 6, className: "is-exhaling" }
            ]
        },
        releaseTitle: "What is pulling you away from right now?",
        releaseChoices: ["A distraction", "What happens later", "The crowd", "Trying to do everything"],
        resetLabel: "PICK YOUR FOCUS THOUGHT",
        resetChoices: ["Right here. Right now.", "See it and do it.", "One clear job."]
    },
    {
        name: "Reset and refocus",
        visualizationTitle: "See your next good play.",
        visualizationLead: "Press play, close your eyes if that feels comfortable, and follow the words.",
        visualizationLines: [
            "Sit tall and let your shoulders drop. Take one easy breath in, then breathe out slowly.",
            "Picture the place where you play {sport}. Notice the sounds, the colors, and your feet on the ground.",
            "Notice the equipment in your hands or near your feet. Feel your body balanced, loose, and ready.",
            "Now see one hard moment happen. Maybe you miss, lose focus, or feel nervous. The moment passes.",
            "Watch yourself take one slow breath. Your shoulders soften. Your eyes return to what is in front of you.",
            "See yourself notice one simple thing you can control: your effort, your next move, or where you look.",
            "Picture your next good play. See your body move with control. You do not need perfection. You only need the next step.",
            "Let the picture play one more time. This time, notice how calm and ready you look after the hard moment.",
            "Feel one more slow breath leave your body. Keep the useful part of the picture and let the rest drift away.",
            "Say this quietly in your mind: I can reset. I can learn. I am ready for the next play."
        ],
        breathing: {
            title: "Eight slow reset breaths.",
            lead: "Follow the circle. Nothing to get perfect—just make your exhale slow.",
            rounds: 8,
            complete: "Eight reset breaths complete",
            phases: [
                { cue: "Breathe in", seconds: 4, className: "is-inhaling" },
                { cue: "Hold", seconds: 2, className: "is-holding" },
                { cue: "Breathe out", seconds: 6, className: "is-exhaling" }
            ]
        },
        releaseTitle: "What can you leave behind?",
        releaseChoices: ["A mistake", "Worry about losing", "What other people think", "A tough feeling"],
        resetLabel: "PICK YOUR NEXT-PLAY THOUGHT",
        resetChoices: ["Next play.", "I can handle this.", "Breathe and begin again."]
    }
];

function getDailyRoutineIndex(dateKey) {
    const parts = String(dateKey).split("-").map(Number);
    const validDate = parts.length === 3 && parts.every(Number.isFinite);
    if (!validDate) { return 0; }
    const dayNumber = Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
    return ((dayNumber % DAILY_ROUTINES.length) + DAILY_ROUTINES.length) % DAILY_ROUTINES.length;
}

// Adapt today's fixed, offline routine to the athlete's saved sport and focus.
const practiceSport = String(window.MindZoneStorage.getItem("mindzone_sport") || "your sport").slice(0, 60);
const ACTIVE_DAILY_ROUTINE = DAILY_ROUTINES[getDailyRoutineIndex(todayKey())];
const VISUALIZATION_LINES = ACTIVE_DAILY_ROUTINE.visualizationLines.map(function (line) {
    return line.replace("{sport}", practiceSport);
});
let practiceFocus = null;
try { practiceFocus = JSON.parse(window.MindZoneStorage.getItem("mindzone_practice_focus") || "null"); } catch (error) { /* Generic practice remains available. */ }
const practiceParams = new URLSearchParams(window.location.search);
if (practiceFocus && practiceFocus.date === todayKey()
    && String(practiceFocus.planId) === practiceParams.get("planId")
    && practiceFocus.day === Number(practiceParams.get("day"))) {
    const focus = String(practiceFocus.title || "").slice(0, 120);
    const focusNode = document.getElementById("sessionFocus");
    focusNode.textContent = "Today's focus: " + focus;
    focusNode.hidden = !focus;
    VISUALIZATION_LINES[5] = "Keep today's focus in mind: " + focus + ". Picture one simple thing you can control: your effort, your next move, or where you look.";
}
const BREATH_ROUNDS = ACTIVE_DAILY_ROUTINE.breathing.rounds;

const stepNodes = {
    intro: document.getElementById("introStep"),
    visualize: document.getElementById("visualizeStep"),
    breathe: document.getElementById("breatheStep"),
    release: document.getElementById("releaseStep"),
    complete: document.getElementById("completeStep")
};

const stepLabel = document.getElementById("sessionStepLabel");
const timeLabel = document.getElementById("sessionTimeLabel");
const progressFill = document.getElementById("sessionProgressFill");
const beginSessionBtn = document.getElementById("beginSessionBtn");
const alreadyCompleteNote = document.getElementById("alreadyCompleteNote");
const visualizePlayBtn = document.getElementById("visualizePlayBtn");
const visualizeDoneBtn = document.getElementById("visualizeDoneBtn");
const visualizeReadBtn = document.getElementById("visualizeReadBtn");
const visualizeReadAlong = document.getElementById("visualizeReadAlong");
const visualizeStatus = document.getElementById("visualizeStatus");
const visualizeProgressFill = document.getElementById("visualizeProgressFill");
const visualizeProgressText = document.getElementById("visualizeProgressText");
const dailyRoutineName = document.getElementById("dailyRoutineName");
const visualizeTitle = document.getElementById("visualizeTitle");
const visualizeLead = document.getElementById("visualizeLead");
const breatheTitle = document.getElementById("breatheTitle");
const breatheLead = document.getElementById("breatheLead");
const breathCircle = document.getElementById("breathCircle");
const breathCount = document.getElementById("breathCount");
const breathCue = document.getElementById("breathCue");
const breathRound = document.getElementById("breathRound");
const breathStartBtn = document.getElementById("breathStartBtn");
const breathDoneBtn = document.getElementById("breathDoneBtn");
const resetPhraseArea = document.getElementById("resetPhraseArea");
const releaseChoices = document.getElementById("releaseChoices");
const releaseTitle = document.getElementById("releaseTitle");
const resetChoiceLabel = document.getElementById("resetChoiceLabel");
const resetChoices = document.getElementById("resetChoices");
const finishSessionBtn = document.getElementById("finishSessionBtn");
const savedResetPhrase = document.getElementById("savedResetPhrase");
const todayGameLink = document.getElementById("todayGameLink");

let visualizationIndex = 0;
let visualizationPlaying = false;
let visualizationPaused = false;
let visualizationUtterance = null;
let visualizationWatchdog = null;
let visualizationNextTimer = null;
let visualizationGeneration = 0;
let breathingTimer = null;
let selectedRelease = "";
let selectedReset = "";

function renderChoiceButtons(container, dataName, choices) {
    container.innerHTML = choices.map(function (choice) {
        return "<button type=\"button\" data-" + dataName + "=\"" + choice + "\">" + choice + "</button>";
    }).join("");
}

function renderDailyRoutine() {
    dailyRoutineName.textContent = "TODAY'S ROUTINE · " + ACTIVE_DAILY_ROUTINE.name;
    visualizeTitle.textContent = ACTIVE_DAILY_ROUTINE.visualizationTitle;
    visualizeLead.textContent = ACTIVE_DAILY_ROUTINE.visualizationLead;
    breatheTitle.textContent = ACTIVE_DAILY_ROUTINE.breathing.title;
    breatheLead.textContent = ACTIVE_DAILY_ROUTINE.breathing.lead;
    breathRound.textContent = BREATH_ROUNDS + " breaths to go";
    releaseTitle.textContent = ACTIVE_DAILY_ROUTINE.releaseTitle;
    resetChoiceLabel.textContent = ACTIVE_DAILY_ROUTINE.resetLabel;
    renderChoiceButtons(releaseChoices, "release", ACTIVE_DAILY_ROUTINE.releaseChoices);
    renderChoiceButtons(resetChoices, "reset", ACTIVE_DAILY_ROUTINE.resetChoices);
}

function todayKey() {
    if (window.AppTime && typeof window.AppTime.getToday === "function") {
        return window.AppTime.getToday();
    }
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
}

function getHistory() {
    try {
        const parsed = JSON.parse(window.MindZoneStorage.getItem(DAILY_SESSION_HISTORY_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function hasCompletedToday() {
    return getHistory().some(function (entry) { return entry && entry.date === todayKey(); });
}

function showStep(name, stepNumber) {
    Object.keys(stepNodes).forEach(function (key) {
        stepNodes[key].hidden = key !== name;
        stepNodes[key].classList.toggle("is-active", key === name);
    });

    const labels = {
        intro: ["Ready", "About 5 minutes", 0],
        visualize: ["Step 1 of 3", "Picture it", 16],
        breathe: ["Step 2 of 3", "Breathe", 50],
        release: ["Step 3 of 3", "Let it go", 82],
        complete: ["Complete", "Saved for today", 100]
    };
    const values = labels[name];
    stepLabel.textContent = values[0];
    timeLabel.textContent = values[1];
    progressFill.style.width = values[2] + "%";

    document.querySelectorAll("[data-step-dot]").forEach(function (dot) {
        const number = Number(dot.dataset.stepDot);
        dot.classList.toggle("is-current", number === stepNumber);
        dot.classList.toggle("is-done", stepNumber > number || name === "complete");
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelVisualization() {
    clearTimeout(visualizationWatchdog);
    clearTimeout(visualizationNextTimer);
    visualizationGeneration += 1;
    if (window.MeditationSpeech) {
        window.MeditationSpeech.cancel();
    } else if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    visualizationPlaying = false;
    visualizationPaused = false;
    visualizePlayBtn.textContent = "▶";
    visualizePlayBtn.setAttribute("aria-label", "Play visualization");
}

function updateVisualizationProgress() {
    const completed = Math.min(visualizationIndex, VISUALIZATION_LINES.length);
    const percent = (completed / VISUALIZATION_LINES.length) * 100;
    visualizeProgressFill.style.width = percent + "%";
    visualizeProgressText.textContent = completed + " / " + VISUALIZATION_LINES.length + " lines";
}

function finishVisualization() {
    cancelVisualization();
    visualizationIndex = VISUALIZATION_LINES.length;
    updateVisualizationProgress();
    visualizeReadAlong.textContent = "Nice work. Keep that picture of your next good play.";
    visualizeStatus.textContent = "Visualization complete";
    visualizeDoneBtn.disabled = false;
}

function speakVisualizationLine() {
    if (!visualizationPlaying || visualizationPaused) {
        return;
    }
    const generation = visualizationGeneration;
    if (visualizationIndex >= VISUALIZATION_LINES.length) {
        finishVisualization();
        return;
    }

    const text = VISUALIZATION_LINES[visualizationIndex];
    visualizeReadAlong.textContent = text;
    visualizeStatus.textContent = "Playing line " + (visualizationIndex + 1) + " of " + VISUALIZATION_LINES.length;
    updateVisualizationProgress();

    if (!window.MeditationSpeech && !("speechSynthesis" in window)) {
        cancelVisualization();
        visualizeStatus.textContent = "Audio is not available. Tap Read instead.";
        visualizeReadBtn.hidden = false;
        return;
    }

    let started = false;
    const callbacks = {
        onStart: function () {
            started = true;
            clearTimeout(visualizationWatchdog);
        },
        onEnd: function () {
            clearTimeout(visualizationWatchdog);
            if (!visualizationPlaying || generation !== visualizationGeneration) {
                return;
            }
            visualizationIndex += 1;
            updateVisualizationProgress();
            visualizationNextTimer = setTimeout(speakVisualizationLine, 900);
        },
        onError: function () {
            clearTimeout(visualizationWatchdog);
            if (generation !== visualizationGeneration) { return; }
            cancelVisualization();
            visualizeStatus.textContent = "Audio stopped. Tap Read instead to finish the words.";
            visualizeReadBtn.hidden = false;
        }
    };

    visualizationWatchdog = setTimeout(function () {
        if (!started && visualizationPlaying) {
            cancelVisualization();
            visualizeStatus.textContent = "Audio did not start. You can read the words instead.";
            visualizeReadBtn.hidden = false;
        }
    }, window.MeditationSpeech ? 12000 : 3000);

    if (window.MeditationSpeech) {
        window.MeditationSpeech.speak(text, callbacks);
        return;
    }

    visualizationUtterance = new SpeechSynthesisUtterance(text);
    visualizationUtterance.rate = 0.88;
    visualizationUtterance.pitch = 0.96;
    visualizationUtterance.lang = "en-US";
    visualizationUtterance.onstart = callbacks.onStart;
    visualizationUtterance.onend = callbacks.onEnd;
    visualizationUtterance.onerror = callbacks.onError;
    window.speechSynthesis.speak(visualizationUtterance);
}

function startVisualization() {
    if (visualizationIndex >= VISUALIZATION_LINES.length) {
        visualizationIndex = 0;
    }
    visualizationPlaying = true;
    visualizationPaused = false;
    visualizePlayBtn.textContent = "Ⅱ";
    visualizePlayBtn.setAttribute("aria-label", "Pause visualization");
    speakVisualizationLine();
}

function toggleVisualization() {
    if (!visualizationPlaying) {
        startVisualization();
        return;
    }
    if (visualizationPaused) {
        visualizationPaused = false;
        let resumed = false;
        if (window.MeditationSpeech) {
            resumed = window.MeditationSpeech.resume();
        } else if (window.speechSynthesis) {
            resumed = window.speechSynthesis.speaking || window.speechSynthesis.paused;
            window.speechSynthesis.resume();
        }
        if (!resumed) { speakVisualizationLine(); }
        visualizePlayBtn.textContent = "Ⅱ";
        visualizeStatus.textContent = "Playing";
        visualizePlayBtn.setAttribute("aria-label", "Pause visualization");
    } else {
        visualizationPaused = true;
        clearTimeout(visualizationNextTimer);
        if (window.MeditationSpeech) {
            window.MeditationSpeech.pause();
        } else if (window.speechSynthesis) {
            window.speechSynthesis.pause();
        }
        visualizePlayBtn.textContent = "▶";
        visualizeStatus.textContent = "Paused";
        visualizePlayBtn.setAttribute("aria-label", "Resume visualization");
    }
}

function speakPracticeCue(text) {
    if (window.MeditationSpeech) {
        window.MeditationSpeech.speak(text);
        return;
    }
    if (!window.speechSynthesis) {
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 0.96;
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function primePracticeBreathingVoice() {
    if (!window.MeditationSpeech || typeof window.MeditationSpeech.prime !== "function") {
        return;
    }
    const cues = ACTIVE_DAILY_ROUTINE.breathing.phases.map(function (phase) {
        return phase.cue;
    });
    cues.push("Your body is ready");
    window.MeditationSpeech.prime(cues);
}

function runBreathPhase(round, phaseIndex) {
    const phases = ACTIVE_DAILY_ROUTINE.breathing.phases;
    const phase = phases[phaseIndex];
    let remaining = phase.seconds;
    breathCircle.className = "breath-circle " + phase.className;
    breathCue.textContent = phase.cue;
    breathCount.textContent = String(remaining);
    speakPracticeCue(phase.cue);
    const remainingRounds = BREATH_ROUNDS - round;
    breathRound.textContent = remainingRounds + " breath" + (remainingRounds === 1 ? "" : "s") + " to go";

    clearInterval(breathingTimer);
    breathingTimer = setInterval(function () {
        remaining -= 1;
        breathCount.textContent = String(Math.max(remaining, 0));
        if (remaining > 0) {
            return;
        }

        clearInterval(breathingTimer);
        if (phaseIndex < phases.length - 1) {
            runBreathPhase(round, phaseIndex + 1);
            return;
        }
        if (round < BREATH_ROUNDS - 1) {
            runBreathPhase(round + 1, 0);
            return;
        }

        breathCircle.className = "breath-circle";
        breathCount.textContent = "Done";
        breathCue.textContent = "Your body is ready";
        breathRound.textContent = ACTIVE_DAILY_ROUTINE.breathing.complete;
        breathDoneBtn.hidden = false;
        speakPracticeCue("Your body is ready");
    }, 1000);
}

function selectOne(container, target) {
    container.querySelectorAll("button").forEach(function (button) {
        button.classList.toggle("is-selected", button === target);
        button.setAttribute("aria-pressed", String(button === target));
    });
}

function saveCompletion() {
    const history = getHistory();
    const today = todayKey();
    const existing = history.find(function (entry) { return entry && entry.date === today; });

    if (!existing) {
        history.push({ date: today });
        window.MindZoneStorage.setItem(DAILY_SESSION_HISTORY_KEY, JSON.stringify(history));
        if (typeof window.addRewardProgress === "function") {
            window.addRewardProgress({ xp: 20, stars: 0, activityCompletions: 1 });
        }
    }

    const params = new URLSearchParams(window.location.search);
    const planId = params.get("planId");
    const day = Number(params.get("day"));
    let progress = null;
    try { progress = JSON.parse(window.MindZoneStorage.getItem("mindzone_plan_progress") || "null"); } catch (error) { /* Start with a fresh plan. */ }
    const matchingPlan = progress && String(progress.planId) === String(planId);
    const lastDay = matchingPlan ? Number(progress.lastCompletedDay) || 0 : 0;
    if (planId && Number.isInteger(day) && day === lastDay + 1
        && (!matchingPlan || progress.lastCompletedDate !== today)) {
        window.MindZoneStorage.setItem("mindzone_plan_progress", JSON.stringify({
            planId: planId, lastCompletedDay: day, lastCompletedDate: today
        }));
    }

    savedResetPhrase.textContent = selectedReset || "Next play.";
    const game = params.get("game");
    if (game === "deep-diver") {
        todayGameLink.href = "deep-diver/index.html";
        todayGameLink.textContent = "Play Deep Diver (optional)";
    } else {
        todayGameLink.href = "game/index.html";
        todayGameLink.textContent = "Play Impossible Mountain (optional)";
    }
}

beginSessionBtn.addEventListener("click", function () { showStep("visualize", 1); });
visualizePlayBtn.addEventListener("click", toggleVisualization);
visualizeReadBtn.addEventListener("click", function () {
    cancelVisualization();
    visualizationIndex = 0;
    visualizeReadAlong.textContent = VISUALIZATION_LINES.join(" ");
    visualizeStatus.textContent = "Read at your own pace, then tap I finished reading.";
    visualizeDoneBtn.textContent = "I finished reading — Next: Breathe";
    updateVisualizationProgress();
    visualizeDoneBtn.disabled = false;
});
visualizeDoneBtn.addEventListener("click", function () {
    if (visualizeDoneBtn.disabled) { return; }
    cancelVisualization();
    primePracticeBreathingVoice();
    showStep("breathe", 2);
});
breathStartBtn.addEventListener("click", function () {
    breathStartBtn.hidden = true;
    runBreathPhase(0, 0);
});
breathDoneBtn.addEventListener("click", function () { showStep("release", 3); });

releaseChoices.addEventListener("click", function (event) {
    const button = event.target.closest("[data-release]");
    if (!button) { return; }
    selectedRelease = button.dataset.release;
    selectOne(event.currentTarget, button);
    resetPhraseArea.hidden = false;
});

resetChoices.addEventListener("click", function (event) {
    const button = event.target.closest("[data-reset]");
    if (!button) { return; }
    selectedReset = button.dataset.reset;
    selectOne(event.currentTarget, button);
    finishSessionBtn.disabled = !selectedRelease || !selectedReset;
});

finishSessionBtn.addEventListener("click", function () {
    if (!selectedRelease || !selectedReset || finishSessionBtn.disabled) { return; }
    finishSessionBtn.disabled = true;
    saveCompletion();
    showStep("complete", 4);
});

renderDailyRoutine();
alreadyCompleteNote.hidden = !hasCompletedToday();
if (hasCompletedToday()) {
    beginSessionBtn.textContent = "Practice again";
}
showStep("intro", 0);

window.addEventListener("pagehide", function () { cancelVisualization(); clearInterval(breathingTimer); });
