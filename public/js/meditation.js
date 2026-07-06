const openMeditationBtn = document.getElementById("openMeditationBtn");
const meditationOverlay = document.getElementById("meditationOverlay");
const medOverlayBackdrop = document.getElementById("medOverlayBackdrop");
const closeMeditationBtn = document.getElementById("closeMeditationBtn");
const meditationFeatureArea = document.getElementById("meditationFeatureArea");
const meditationProgramList = document.getElementById("meditationProgramList");
const meditationProgramActive = document.getElementById("meditationProgramActive");
const meditationBackBtn = document.getElementById("meditationBackBtn");
const meditationProgramTitle = document.getElementById("meditationProgramTitle");
const meditationProgramSubtitle = document.getElementById("meditationProgramSubtitle");
const meditationVoiceCircle = document.getElementById("meditationVoiceCircle");
const meditationVoiceStatus = document.getElementById("meditationVoiceStatus");
const meditationStopBtn = document.getElementById("meditationStopBtn");

let meditationSession = {
    active: false,
    program: null,
    segmentIndex: 0,
    pauseTimeout: null
};

let meditationVoiceCache = null;
let meditationAudio = null;
let meditationUseGeminiVoice = true;
let meditationAudioCache = new Map();
const MEDITATION_BREATH_PAUSE_MS = 3000;
const MEDITATION_AUDIO_PLAYBACK_RATE = 1.12;

const PREFERRED_MEDITATION_VOICES = [
    "Samantha",
    "Karen",
    "Victoria",
    "Serena",
    "Flo",
    "Moira",
    "Google UK English Female",
    "Google US English",
    "Microsoft Zira",
    "Microsoft Jenny",
    "Microsoft Aria",
    "Alex",
    "Daniel",
    "Tessa"
];

const openAvatarBtn = document.getElementById("openAvatarBtn");
const avatarOverlay = document.getElementById("avatarOverlay");
const avatarOverlayBackdrop = document.getElementById("avatarOverlayBackdrop");
const closeAvatarBtn = document.getElementById("closeAvatarBtn");
const avatarPlayerCards = document.querySelectorAll(".avatar-player-card");
const avatarProceedBtn = document.getElementById("avatarProceedBtn");
const AVATAR_STORAGE_KEY = "selectedAthleteAvatar";

const openFixBtn = document.getElementById("openFixBtn");
const fixOverlay = document.getElementById("fixOverlay");
const fixOverlayBackdrop = document.getElementById("fixOverlayBackdrop");
const closeFixBtn = document.getElementById("closeFixBtn");
const fixSubmitBtn = document.getElementById("fixSubmitBtn");
const fixWhatWentWrongInput = document.getElementById("fixWhatWentWrongInput");
const fixResults = document.getElementById("fixResults");
const fixAdviceList = document.getElementById("fixAdviceList");
const fixSaveTipsBtn = document.getElementById("fixSaveTipsBtn");

const openSavedTipsBtn = document.getElementById("openSavedTipsBtn");
const savedTipsOverlay = document.getElementById("savedTipsOverlay");
const savedTipsBackdrop = document.getElementById("savedTipsBackdrop");
const closeSavedTipsBtn = document.getElementById("closeSavedTipsBtn");
const savedTipsList = document.getElementById("savedTipsList");

function resetFixResults() {
    fixResults.hidden = true;
    fixSaveTipsBtn.hidden = true;
    fixAdviceList.innerHTML = "";

    const title = fixResults.querySelector(".fix-results-title");
    if (title) {
        title.remove();
    }
}

function ensureFixResultsTitle() {
    if (fixResults.querySelector(".fix-results-title")) {
        return;
    }

    const title = document.createElement("h3");
    title.className = "fix-results-title";
    title.textContent = "What You Should Do ";

    const hint = document.createElement("span");
    hint.className = "fix-results-hint";
    hint.textContent = "(choose 1-4 tips by clicking stars)";
    title.appendChild(hint);

    fixResults.insertBefore(title, fixAdviceList);
}

const openResetBtn = document.getElementById("openResetBtn");
const resetOverlay = document.getElementById("resetOverlay");
const resetOverlayBackdrop = document.getElementById("resetOverlayBackdrop");
const closeResetBtn = document.getElementById("closeResetBtn");
const resetFeatureArea = document.getElementById("resetFeatureArea");
const resetExerciseList = document.getElementById("resetExerciseList");
const resetExerciseActive = document.getElementById("resetExerciseActive");
const resetBackBtn = document.getElementById("resetBackBtn");
const resetExerciseTitle = document.getElementById("resetExerciseTitle");
const resetExerciseSummary = document.getElementById("resetExerciseSummary");
const resetExerciseSteps = document.getElementById("resetExerciseSteps");
const breathingCircle = document.getElementById("breathingCircle");
const breathingPhase = document.getElementById("breathingPhase");
const breathingTimer = document.getElementById("breathingTimer");
const startBreathingBtn = document.getElementById("startBreathingBtn");
const finishBreathingBtn = document.getElementById("finishBreathingBtn");

const breathingExercises = [
    {
        id: "box",
        name: "Box Breathing",
        summary: "Used by athletes to stay calm under pressure.",
        steps: ["Breathe in through your nose for 4 seconds", "Hold your breath for 4 seconds", "Breathe out slowly for 4 seconds", "Hold empty for 4 seconds", "Repeat 4 rounds"],
        phases: [
            { label: "Breathe In", seconds: 4, className: "breathe-in" },
            { label: "Hold", seconds: 4, className: "breathe-hold" },
            { label: "Breathe Out", seconds: 4, className: "breathe-out" },
            { label: "Hold", seconds: 4, className: "breathe-hold" }
        ],
        rounds: 4
    },
    {
        id: "four-seven-eight",
        name: "4-7-8 Breathing",
        summary: "Great for slowing your heart rate fast.",
        steps: ["Breathe in for 4 seconds", "Hold for 7 seconds", "Breathe out for 8 seconds", "Repeat 4 rounds"],
        phases: [
            { label: "Breathe In", seconds: 4, className: "breathe-in" },
            { label: "Hold", seconds: 7, className: "breathe-hold" },
            { label: "Breathe Out", seconds: 8, className: "breathe-out" }
        ],
        rounds: 4
    },
    {
        id: "belly",
        name: "Belly Breathing",
        summary: "Helps you breathe deep instead of shallow.",
        steps: ["Put one hand on your chest and one on your belly", "Breathe in so your belly rises", "Breathe out and let your belly fall", "Repeat slow breaths for 5 rounds"],
        phases: [
            { label: "Belly In", seconds: 4, className: "breathe-in" },
            { label: "Breathe Out", seconds: 4, className: "breathe-out" }
        ],
        rounds: 5
    },
    {
        id: "equal",
        name: "Equal Breathing",
        summary: "Simple 5-5 breathing to balance your mind.",
        steps: ["Breathe in for 5 seconds", "Breathe out for 5 seconds", "Keep your breath smooth and steady", "Repeat 5 rounds"],
        phases: [
            { label: "Breathe In", seconds: 5, className: "breathe-in" },
            { label: "Breathe Out", seconds: 5, className: "breathe-out" }
        ],
        rounds: 5
    },
    {
        id: "resonant",
        name: "Resonant Breathing",
        summary: "About 6 breaths per minute for calm focus.",
        steps: ["Breathe in gently for 5 seconds", "Breathe out gently for 5 seconds", "Do not force it", "Repeat 6 rounds"],
        phases: [
            { label: "Breathe In", seconds: 5, className: "breathe-in" },
            { label: "Breathe Out", seconds: 5, className: "breathe-out" }
        ],
        rounds: 6
    },
    {
        id: "pursed-lip",
        name: "Pursed Lip Breathing",
        summary: "Helps you control your exhale and relax.",
        steps: ["Breathe in through your nose for 2 seconds", "Purse your lips like you are blowing out candles", "Breathe out slowly for 4 seconds", "Repeat 5 rounds"],
        phases: [
            { label: "Breathe In", seconds: 2, className: "breathe-in" },
            { label: "Breathe Out", seconds: 4, className: "breathe-out" }
        ],
        rounds: 5
    },
    {
        id: "triangle",
        name: "Triangle Breathing",
        summary: "Three-step breathing without the second hold.",
        steps: ["Breathe in for 4 seconds", "Hold for 4 seconds", "Breathe out for 4 seconds", "Repeat 4 rounds"],
        phases: [
            { label: "Breathe In", seconds: 4, className: "breathe-in" },
            { label: "Hold", seconds: 4, className: "breathe-hold" },
            { label: "Breathe Out", seconds: 4, className: "breathe-out" }
        ],
        rounds: 4
    },
    {
        id: "physiological-sigh",
        name: "Physiological Sigh",
        summary: "Fast reset when stress spikes quickly.",
        steps: ["Take a normal breath in through your nose", "Take one more small sip of air in", "Breathe out long through your mouth", "Repeat 3 rounds"],
        phases: [
            { label: "Breathe In", seconds: 2, className: "breathe-in" },
            { label: "Sip More Air", seconds: 1, className: "breathe-in" },
            { label: "Long Exhale", seconds: 6, className: "breathe-out" }
        ],
        rounds: 3
    },
    {
        id: "coherent",
        name: "Coherent Breathing",
        summary: "Smooth breathing to reset your nervous system.",
        steps: ["Breathe in for 5 seconds", "Breathe out for 5 seconds", "Keep your shoulders relaxed", "Repeat 6 rounds"],
        phases: [
            { label: "Breathe In", seconds: 5, className: "breathe-in" },
            { label: "Breathe Out", seconds: 5, className: "breathe-out" }
        ],
        rounds: 6
    },
    {
        id: "lions-breath",
        name: "Lion's Breath",
        summary: "Fun release breath to let frustration out.",
        steps: ["Breathe in through your nose", "Open your mouth wide and stick out your tongue", "Breathe out with a loud ha sound", "Repeat 4 rounds"],
        phases: [
            { label: "Breathe In", seconds: 3, className: "breathe-in" },
            { label: "Ha Breath Out", seconds: 3, className: "breathe-out" }
        ],
        rounds: 4
    }
];

let activeBreathingExercise = null;
let breathingIntervalId = null;

function renderBreathingExercises() {
    resetExerciseList.innerHTML = "";

    breathingExercises.forEach(function (exercise) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "reset-exercise-card";
        card.innerHTML = `<h4>${exercise.name}</h4><p>${exercise.summary}</p>`;
        card.addEventListener("click", function () {
            openBreathingExercise(exercise);
        });
        resetExerciseList.appendChild(card);
    });
}

function openBreathingExercise(exercise) {
    stopBreathingSession();
    activeBreathingExercise = exercise;

    resetExerciseTitle.textContent = exercise.name;
    resetExerciseSummary.textContent = exercise.summary;
    resetExerciseSteps.innerHTML = "";

    exercise.steps.forEach(function (step) {
        const item = document.createElement("li");
        item.textContent = step;
        resetExerciseSteps.appendChild(item);
    });

    breathingPhase.textContent = "Press Start when you are ready";
    breathingTimer.textContent = "";
    breathingCircle.className = "breathing-circle";
    startBreathingBtn.disabled = false;
    startBreathingBtn.textContent = "Start";
    startBreathingBtn.hidden = false;
    finishBreathingBtn.hidden = true;

    resetFeatureArea.classList.remove("reset-view-list");
    resetFeatureArea.classList.add("reset-view-active");
}

function showBreathingExerciseList() {
    stopBreathingSession();
    activeBreathingExercise = null;

    resetFeatureArea.classList.remove("reset-view-active");
    resetFeatureArea.classList.add("reset-view-list");
    resetFeatureArea.scrollTop = 0;

    breathingPhase.textContent = "Press Start when you are ready";
    breathingTimer.textContent = "";
    breathingCircle.className = "breathing-circle";
    startBreathingBtn.disabled = false;
    startBreathingBtn.textContent = "Start";
    startBreathingBtn.hidden = false;
    finishBreathingBtn.hidden = true;
}

function resetBreathingView() {
    showBreathingExerciseList();
}

function stopBreathingSession() {
    if (breathingIntervalId) {
        clearInterval(breathingIntervalId);
        breathingIntervalId = null;
    }
}

function runBreathingPhase(phase) {
    breathingPhase.textContent = phase.label;
    breathingCircle.className = "breathing-circle " + phase.className;
}

function startBreathingSession() {
    if (!activeBreathingExercise) {
        return;
    }

    stopBreathingSession();
    startBreathingBtn.disabled = true;
    finishBreathingBtn.hidden = true;

    const exercise = activeBreathingExercise;
    let round = 0;
    let phaseIndex = 0;
    let secondsLeft = exercise.phases[0].seconds;

    runBreathingPhase(exercise.phases[0]);
    breathingTimer.textContent = secondsLeft;

    breathingIntervalId = setInterval(function () {
        secondsLeft -= 1;
        breathingTimer.textContent = secondsLeft;

        if (secondsLeft > 0) {
            return;
        }

        phaseIndex += 1;

        if (phaseIndex >= exercise.phases.length) {
            phaseIndex = 0;
            round += 1;
        }

        if (round >= exercise.rounds) {
            stopBreathingSession();
            breathingPhase.textContent = "Nice work. You finished this exercise.";
            breathingTimer.textContent = "";
            breathingCircle.className = "breathing-circle";
            startBreathingBtn.disabled = false;
            startBreathingBtn.textContent = "Start Again";
            finishBreathingBtn.hidden = false;
            return;
        }

        const nextPhase = exercise.phases[phaseIndex];
        secondsLeft = nextPhase.seconds;
        runBreathingPhase(nextPhase);
        breathingTimer.textContent = secondsLeft;
    }, 1000);
}

renderBreathingExercises();
renderMeditationPrograms();

if (window.speechSynthesis) {
    loadMeditationVoices();
    window.speechSynthesis.onvoiceschanged = function () {
        loadMeditationVoices();
    };
}

function scoreMeditationVoice(voice) {
    if (!voice.lang.startsWith("en")) {
        return -1;
    }

    let score = 0;
    const name = voice.name;

    if (voice.localService) {
        score += 4;
    }

    PREFERRED_MEDITATION_VOICES.forEach(function (preferredName, index) {
        if (name.includes(preferredName)) {
            score += 24 - index;
        }
    });

    if (name.includes("Premium") || name.includes("Enhanced") || name.includes("Natural")) {
        score += 6;
    }

    if (name.includes("Female")) {
        score += 2;
    }

    if (name.includes("Compact")) {
        score -= 4;
    }

    return score;
}

function loadMeditationVoices() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
        return;
    }

    let bestVoice = null;
    let bestScore = -1;

    voices.forEach(function (voice) {
        const score = scoreMeditationVoice(voice);
        if (score > bestScore) {
            bestScore = score;
            bestVoice = voice;
        }
    });

    meditationVoiceCache = bestVoice || voices.find(function (voice) {
        return voice.lang.startsWith("en");
    }) || null;
}

function getMeditationVoice() {
    if (meditationVoiceCache) {
        return meditationVoiceCache;
    }

    loadMeditationVoices();
    return meditationVoiceCache;
}

function prepareMeditationSpeech() {
    if (!window.speechSynthesis) {
        return;
    }

    loadMeditationVoices();
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
}

function renderMeditationPrograms() {
    if (!meditationProgramList) {
        return;
    }

    meditationProgramList.innerHTML = MEDITATION_PROGRAM_SECTIONS.map(function (section) {
        const cards = section.programs.map(function (program) {
            return `
                <button type="button" class="meditation-program-card" data-program-id="${program.id}">
                    <h3>${program.name}</h3>
                    <p>${program.subtitle}</p>
                    <span class="meditation-program-duration">${program.duration}</span>
                </button>
            `;
        }).join("");

        return `
            <section class="meditation-program-section">
                <h3 class="meditation-program-section-title">${section.label}</h3>
                <div class="meditation-program-section-grid">${cards}</div>
            </section>
        `;
    }).join("");

    meditationProgramList.querySelectorAll(".meditation-program-card").forEach(function (card) {
        card.addEventListener("click", function () {
            const program = MEDITATION_PROGRAMS.find(function (item) {
                return item.id === card.dataset.programId;
            });
            if (program) {
                startMeditationProgram(program);
            }
        });
    });
}

function showMeditationProgramList() {
    stopMeditationSession();
    if (meditationFeatureArea) {
        meditationFeatureArea.classList.remove("meditation-view-active");
        meditationFeatureArea.classList.add("meditation-view-list");
    }
}

function showMeditationActiveView(program) {
    if (meditationFeatureArea) {
        meditationFeatureArea.classList.remove("meditation-view-list");
        meditationFeatureArea.classList.add("meditation-view-active");
    }

    meditationProgramTitle.textContent = program.name;
    meditationProgramSubtitle.textContent = program.subtitle;
    setMeditationVoiceStatus("");
    setMeditationCircleState("speaking");
}

function setMeditationVoiceStatus(message) {
    if (meditationVoiceStatus) {
        meditationVoiceStatus.textContent = message;
    }
}

function setMeditationCircleState(state) {
    if (!meditationVoiceCircle) {
        return;
    }

    meditationVoiceCircle.classList.remove("speaking", "breathing");
    if (state) {
        meditationVoiceCircle.classList.add(state);
    }
}

function softenMeditationText(text) {
    return text
        .replace(/\. /g, ".  ")
        .replace(/, /g, ",  ");
}

function stopMeditationSession() {
    meditationSession.active = false;
    meditationSession.program = null;
    meditationSession.segmentIndex = 0;

    if (meditationSession.pauseTimeout) {
        clearTimeout(meditationSession.pauseTimeout);
        meditationSession.pauseTimeout = null;
    }

    if (meditationAudio) {
        meditationAudio.pause();
        meditationAudio.onended = null;
        meditationAudio.onerror = null;
        meditationAudio.src = "";
        meditationAudio = null;
    }

    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    meditationAudioCache.clear();
    setMeditationCircleState("");
}

function handleMeditationSegmentEnd(segment) {
    if (!meditationSession.active) {
        return;
    }

    if (segment.pauseAfter > 0) {
        setMeditationVoiceStatus("");
        setMeditationCircleState("breathing");
        prefetchNextMeditationSegment();
        meditationSession.pauseTimeout = setTimeout(function () {
            meditationSession.segmentIndex += 1;
            speakMeditationSegment();
        }, MEDITATION_BREATH_PAUSE_MS);
        return;
    }

    meditationSession.segmentIndex += 1;
    speakMeditationSegment();
}

function speakMeditationSegmentWithBrowser(segment) {
    if (!window.speechSynthesis) {
        setMeditationVoiceStatus("Voice playback is not supported in this browser.");
        return;
    }

    prepareMeditationSpeech();

    const utterance = new SpeechSynthesisUtterance(softenMeditationText(segment.text));
    const voice = getMeditationVoice();
    utterance.rate = 1.1;
    utterance.pitch = 0.96;
    utterance.volume = 1;
    if (voice) {
        utterance.voice = voice;
    }

    setMeditationVoiceStatus("");
    setMeditationCircleState("speaking");

    utterance.onend = function () {
        handleMeditationSegmentEnd(segment);
    };

    utterance.onerror = function () {
        if (meditationSession.active) {
            setMeditationVoiceStatus("Could not play audio. Try again.");
            setMeditationCircleState("");
        }
    };

    window.speechSynthesis.speak(utterance);
}

async function fetchMeditationAudio(text) {
    if (meditationAudioCache.has(text)) {
        return meditationAudioCache.get(text);
    }

    const response = await fetch("/api/meditation-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text })
    });

    if (!response.ok) {
        throw new Error("TTS request failed");
    }

    const data = await response.json();
    if (!data.audioBase64) {
        throw new Error("No audio returned");
    }

    meditationAudioCache.set(text, data);
    return data;
}

function prefetchNextMeditationSegment() {
    if (!meditationSession.active || !meditationSession.program) {
        return;
    }

    const nextSegment = meditationSession.program.segments[meditationSession.segmentIndex + 1];
    if (!nextSegment || meditationAudioCache.has(nextSegment.text)) {
        return;
    }

    fetchMeditationAudio(nextSegment.text).catch(function () {});
}

async function speakMeditationSegmentWithGemini(segment) {
    setMeditationVoiceStatus("");
    setMeditationCircleState("speaking");

    try {
        const data = await fetchMeditationAudio(segment.text);

        if (!meditationSession.active) {
            return;
        }

        if (meditationAudio) {
            meditationAudio.pause();
            meditationAudio.onended = null;
            meditationAudio.onerror = null;
            meditationAudio.src = "";
            meditationAudio = null;
        }

        meditationAudio = new Audio("data:" + data.mimeType + ";base64," + data.audioBase64);
        meditationAudio.playbackRate = MEDITATION_AUDIO_PLAYBACK_RATE;

        meditationAudio.onended = function () {
            handleMeditationSegmentEnd(segment);
        };

        meditationAudio.onplaying = function () {
            prefetchNextMeditationSegment();
        };

        meditationAudio.onerror = function () {
            if (!meditationSession.active) {
                return;
            }

            meditationUseGeminiVoice = false;
            speakMeditationSegmentWithBrowser(segment);
        };

        await meditationAudio.play();
    } catch (error) {
        if (!meditationSession.active) {
            return;
        }

        meditationUseGeminiVoice = false;
        speakMeditationSegmentWithBrowser(segment);
    }
}

function speakMeditationSegment() {
    if (!meditationSession.active || !meditationSession.program) {
        return;
    }

    const segment = meditationSession.program.segments[meditationSession.segmentIndex];
    if (!segment) {
        finishMeditationProgram();
        return;
    }

    if (meditationUseGeminiVoice) {
        speakMeditationSegmentWithGemini(segment);
        return;
    }

    speakMeditationSegmentWithBrowser(segment);
}

function startMeditationProgram(program) {
    stopMeditationSession();
    prepareMeditationSpeech();
    meditationUseGeminiVoice = true;
    meditationSession.active = true;
    meditationSession.program = program;
    meditationSession.segmentIndex = 0;
    showMeditationActiveView(program);

    if (program.segments[0]) {
        fetchMeditationAudio(program.segments[0].text).catch(function () {});
    }

    speakMeditationSegment();
}

function finishMeditationProgram() {
    stopMeditationSession();
    setMeditationVoiceStatus("Session complete. Great mental training today.");
    completeMeditationActivity();
}

function resetMeditationView() {
    showMeditationProgramList();
    setMeditationVoiceStatus("Choose a program to begin");
}

openMeditationBtn.addEventListener("click", function () {
    prepareMeditationSpeech();
    resetMeditationView();
    openOverlay(meditationOverlay);
});

openAvatarBtn.addEventListener("click", function () {
    restoreAvatarSelection();
    openOverlay(avatarOverlay);
});

openFixBtn.addEventListener("click", function () {
    resetFixResults();
    openOverlay(fixOverlay);
});

if (openSavedTipsBtn) {
    openSavedTipsBtn.addEventListener("click", function () {
        renderSavedTips();
        openOverlay(savedTipsOverlay);
    });
}

if (closeSavedTipsBtn) {
    closeSavedTipsBtn.addEventListener("click", function () {
        closeOverlay(savedTipsOverlay);
    });
}

if (savedTipsBackdrop) {
    savedTipsBackdrop.addEventListener("click", function () {
        closeOverlay(savedTipsOverlay);
    });
}

openResetBtn.addEventListener("click", function () {
    resetBreathingView();
    openOverlay(resetOverlay);
});

closeMeditationBtn.addEventListener("click", function () {
    resetMeditationView();
    closeOverlay(meditationOverlay);
});
medOverlayBackdrop.addEventListener("click", function () {
    resetMeditationView();
    closeOverlay(meditationOverlay);
});

if (meditationBackBtn) {
    meditationBackBtn.addEventListener("click", function () {
        resetMeditationView();
    });
}

if (meditationStopBtn) {
    meditationStopBtn.addEventListener("click", function () {
        stopMeditationSession();
        setMeditationVoiceStatus("Session stopped.");
    });
}

closeAvatarBtn.addEventListener("click", function () {
    closeOverlay(avatarOverlay);
});
avatarOverlayBackdrop.addEventListener("click", function () {
    closeOverlay(avatarOverlay);
});

function getAvatarCardData(card) {
    const column = card.closest(".avatar-league-column");
    const league = column ? column.querySelector(".avatar-league-label").textContent.trim() : "";
    const nameEl = card.querySelector(".avatar-player-name");
    const imgEl = card.querySelector("img");

    return {
        league: league,
        name: nameEl ? nameEl.textContent.trim() : "",
        image: imgEl ? imgEl.getAttribute("src") : "",
        alt: imgEl ? imgEl.getAttribute("alt") : ""
    };
}

function selectAvatarCard(card) {
    avatarPlayerCards.forEach(function (playerCard) {
        playerCard.classList.remove("selected");
        playerCard.setAttribute("aria-pressed", "false");
    });

    card.classList.add("selected");
    card.setAttribute("aria-pressed", "true");
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(getAvatarCardData(card)));
}

function restoreAvatarSelection() {
    const saved = JSON.parse(localStorage.getItem(AVATAR_STORAGE_KEY) || "null");
    if (!saved) {
        return;
    }

    avatarPlayerCards.forEach(function (card) {
        const data = getAvatarCardData(card);
        const isSelected = data.name === saved.name && data.league === saved.league;
        card.classList.toggle("selected", isSelected);
        card.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });
}

avatarPlayerCards.forEach(function (card) {
    const data = getAvatarCardData(card);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-pressed", "false");
    card.setAttribute("aria-label", "Select " + data.name + " from " + data.league);

    card.addEventListener("click", function () {
        selectAvatarCard(card);
    });

    card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectAvatarCard(card);
        }
    });
});

restoreAvatarSelection();

avatarProceedBtn.addEventListener("click", function () {
    const selectedCard = document.querySelector(".avatar-player-card.selected");
    if (!selectedCard) {
        alert("Pick 1 athlete before you proceed.");
        return;
    }

    selectAvatarCard(selectedCard);
    window.location.href = "avatar.html";
});

closeFixBtn.addEventListener("click", function () {
    resetFixResults();
    closeOverlay(fixOverlay);
});
fixOverlayBackdrop.addEventListener("click", function () {
    resetFixResults();
    closeOverlay(fixOverlay);
});

fixSubmitBtn.addEventListener("click", async function () {
    const text = fixWhatWentWrongInput.value.trim();
    if (!text) {
        alert("Type something that went wrong before you submit.");
        return;
    }

    fixSubmitBtn.disabled = true;
    fixSubmitBtn.textContent = "Getting advice...";
    fixResults.hidden = true;
    fixSaveTipsBtn.hidden = true;
    fixAdviceList.innerHTML = "";

    try {
        const response = await fetch("/api/fix-advice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ problem: text })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Could not get advice right now. Try again.");
            return;
        }

        data.advice.forEach(function (tip) {
            const item = document.createElement("li");
            item.className = "fix-advice-item";

            const starBtn = document.createElement("button");
            starBtn.type = "button";
            starBtn.className = "fix-tip-star";
            starBtn.setAttribute("aria-label", "Select this tip");
            starBtn.textContent = "☆";

            const tipText = document.createElement("span");
            tipText.className = "fix-tip-text";
            tipText.textContent = tip;

            starBtn.addEventListener("click", function () {
                toggleFixTipStar(starBtn);
            });

            item.appendChild(starBtn);
            item.appendChild(tipText);
            fixAdviceList.appendChild(item);
        });

        ensureFixResultsTitle();
        fixResults.hidden = false;
        fixSaveTipsBtn.hidden = false;
    } catch (error) {
        alert("Something went wrong. Please try again.");
    } finally {
        fixSubmitBtn.disabled = false;
        fixSubmitBtn.textContent = "Submit";
    }
});

fixSaveTipsBtn.addEventListener("click", function () {
    const selectedTips = [];

    fixAdviceList.querySelectorAll(".fix-advice-item").forEach(function (item) {
        const starBtn = item.querySelector(".fix-tip-star");
        if (starBtn && starBtn.classList.contains("selected")) {
            selectedTips.push(item.querySelector(".fix-tip-text").textContent);
        }
    });

    if (selectedTips.length < 1) {
        alert("Choose at least 1 tip by clicking the stars.");
        return;
    }

    const savedTips = JSON.parse(localStorage.getItem("savedFixTips") || "[]");
    savedTips.push({
        savedAt: new Date().toISOString(),
        problem: fixWhatWentWrongInput.value.trim(),
        tips: selectedTips
    });
    localStorage.setItem("savedFixTips", JSON.stringify(savedTips));
    completeMeditationActivity();
    alert("Your tips were saved!");
});

closeResetBtn.addEventListener("click", function () {
    resetBreathingView();
    closeOverlay(resetOverlay);
});
resetOverlayBackdrop.addEventListener("click", function () {
    resetBreathingView();
    closeOverlay(resetOverlay);
});

resetBackBtn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    showBreathingExerciseList();
});

startBreathingBtn.addEventListener("click", function () {
    startBreathingSession();
});

finishBreathingBtn.addEventListener("click", function () {
    completeMeditationActivity();
    resetBreathingView();
    alert("Great reset! You finished your breathing exercise.");
});

function openOverlay(overlay) {
    overlay.classList.remove("overlay-hidden");
}

function closeOverlay(overlay) {
    overlay.classList.add("overlay-hidden");
}

function getSelectedFixTipCount() {
    return fixAdviceList.querySelectorAll(".fix-tip-star.selected").length;
}

function toggleFixTipStar(starBtn) {
    const isSelected = starBtn.classList.contains("selected");

    if (!isSelected && getSelectedFixTipCount() >= 4) {
        alert("You can only choose up to 4 tips.");
        return;
    }

    starBtn.classList.toggle("selected", !isSelected);
    starBtn.textContent = isSelected ? "☆" : "⭐";
    starBtn.setAttribute("aria-label", isSelected ? "Select this tip" : "Unselect this tip");
}

function completeMeditationActivity() {
    if (typeof window.addRewardProgress === "function") {
        window.addRewardProgress({
            xp: 20,
            stars: 1,
            activityCompletions: 1
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function renderSavedTips() {
    const savedTips = JSON.parse(localStorage.getItem("savedFixTips") || "[]");

    if (savedTips.length === 0) {
        savedTipsList.innerHTML = `
            <p class="saved-tips-empty">No saved tips yet. Use Fix What Went Wrong to save tips.</p>
        `;
        return;
    }

    const cards = savedTips.slice().reverse().map(function (entry) {
        const date = new Date(entry.savedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        });

        const tipsHtml = entry.tips.map(function (tip) {
            return `<li class="saved-tip-item">${escapeHtml(tip)}</li>`;
        }).join("");

        return `
            <article class="saved-tips-card">
                <p class="saved-tips-date">${date}</p>
                <p class="saved-tips-problem"><span>What went wrong:</span> ${escapeHtml(entry.problem)}</p>
                <ul class="saved-tips-items">${tipsHtml}</ul>
            </article>
        `;
    }).join("");

    savedTipsList.innerHTML = cards;
}
