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
    pauseTimeout: null,
    engine: null,
    lockedVoice: null
};

let meditationVoiceCache = null;
let meditationAudio = null;
let meditationAudioCache = new Map();
const MEDITATION_BREATH_PAUSE_MS = 3000;
const MEDITATION_AUDIO_PLAYBACK_RATE = 1.12;
const MEDITATION_BROWSER_RATE = 1.1;
const MEDITATION_BROWSER_PITCH = 0.96;

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
const fixVideoFullscreen = document.getElementById("fixVideoFullscreen");
const fixVideoFrame = document.getElementById("fixVideoFrame");
const fixVideoReason = document.getElementById("fixVideoReason");
const closeFixVideoBtn = document.getElementById("closeFixVideoBtn");

function resetFixResults() {
    closeFixVideoPlayer();
}

function openFixVideoPlayer(video) {
    if (!fixVideoFullscreen || !fixVideoFrame || !video || !video.embedUrl) {
        return;
    }

    if (fixVideoReason) {
        fixVideoReason.textContent = "Watch this moment.";
    }

    fixVideoFullscreen.classList.remove("is-playing");
    // Load with autoplay after a user click (submit) so browsers allow sound + playback.
    fixVideoFrame.src = video.embedUrl;
    fixVideoFullscreen.hidden = false;
    fixVideoFullscreen.classList.remove("fix-video-hidden");
    document.body.classList.add("fix-video-open");
    closeOverlay(fixOverlay);

    requestAnimationFrame(function () {
        fixVideoFullscreen.classList.add("is-playing");
    });
}

function closeFixVideoPlayer() {
    if (fixVideoFrame) {
        fixVideoFrame.src = "";
    }
    if (fixVideoFullscreen) {
        fixVideoFullscreen.hidden = true;
        fixVideoFullscreen.classList.add("fix-video-hidden");
        fixVideoFullscreen.classList.remove("is-playing");
    }
    document.body.classList.remove("fix-video-open");
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
    stopBreathingVoice();
}

function getBreathingCue(phase) {
    if (!phase) {
        return "";
    }

    if (phase.className === "breathe-in") {
        return "Breathe in";
    }

    if (phase.className === "breathe-out") {
        return "Breathe out";
    }

    if (phase.className === "breathe-hold") {
        return "Hold";
    }

    return String(phase.label || "").replace(/\s+/g, " ").trim();
}

function stopBreathingVoice() {
    if (!window.speechSynthesis) {
        return;
    }

    window.speechSynthesis.cancel();
}

function speakBreathingCue(text) {
    if (!window.speechSynthesis || !text) {
        return;
    }

    prepareMeditationSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getMeditationVoice();

    // Calm, steady pacing so the same coach voice stays consistent across exercises.
    utterance.rate = 0.9;
    utterance.pitch = 0.94;
    utterance.volume = 1;

    if (voice) {
        utterance.voice = voice;
        if (voice.lang) {
            utterance.lang = voice.lang;
        }
    } else {
        utterance.lang = "en-US";
    }

    window.speechSynthesis.speak(utterance);
}

function runBreathingPhase(phase) {
    breathingPhase.textContent = phase.label;
    breathingCircle.className = "breathing-circle " + phase.className;
    speakBreathingCue(getBreathingCue(phase));
}

function startBreathingSession() {
    if (!activeBreathingExercise) {
        return;
    }

    stopBreathingSession();
    prepareMeditationSpeech();
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
            speakBreathingCue("Nice work");
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
    // Keep the same voice for an active Meditation Journey session.
    if (meditationSession.active && (meditationSession.lockedVoice || meditationVoiceCache)) {
        return;
    }

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
    if (meditationSession.lockedVoice) {
        return meditationSession.lockedVoice;
    }

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

    if (!meditationSession.active) {
        loadMeditationVoices();
    }
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
    meditationSession.engine = null;
    meditationSession.lockedVoice = null;

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

function skipMeditationSegment(message) {
    if (!meditationSession.active) {
        return;
    }

    if (message) {
        setMeditationVoiceStatus(message);
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
    const voice = meditationSession.lockedVoice || getMeditationVoice();
    utterance.rate = MEDITATION_BROWSER_RATE;
    utterance.pitch = MEDITATION_BROWSER_PITCH;
    utterance.volume = 1;
    if (voice) {
        utterance.voice = voice;
        if (voice.lang) {
            utterance.lang = voice.lang;
        }
    } else {
        utterance.lang = "en-US";
    }

    setMeditationVoiceStatus("");
    setMeditationCircleState("speaking");

    let handled = false;

    utterance.onend = function () {
        if (handled || !meditationSession.active) {
            return;
        }
        handled = true;
        handleMeditationSegmentEnd(segment);
    };

    utterance.onerror = function () {
        if (handled || !meditationSession.active) {
            return;
        }
        handled = true;
        skipMeditationSegment("Could not play that line. Continuing...");
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

    if (meditationSession.engine !== "gemini") {
        return;
    }

    const nextSegment = meditationSession.program.segments[meditationSession.segmentIndex + 1];
    if (!nextSegment || meditationAudioCache.has(nextSegment.text)) {
        return;
    }

    fetchMeditationAudio(nextSegment.text).catch(function () {});
}

async function playGeminiMeditationAudio(segment, data) {
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
        // Stay on Gemini for the whole program — never switch to browser mid-session.
        skipMeditationSegment("Could not play that line. Continuing...");
    };

    await meditationAudio.play();
}

async function speakMeditationSegmentWithGemini(segment, isRetry) {
    setMeditationVoiceStatus("");
    setMeditationCircleState("speaking");

    try {
        const data = await fetchMeditationAudio(segment.text);
        await playGeminiMeditationAudio(segment, data);
    } catch (error) {
        if (!meditationSession.active) {
            return;
        }

        if (!isRetry) {
            // Clear a bad cache entry and retry Gemini once — do not fall back to browser.
            meditationAudioCache.delete(segment.text);
            await speakMeditationSegmentWithGemini(segment, true);
            return;
        }

        skipMeditationSegment("Could not play that line. Continuing...");
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

    if (meditationSession.engine === "gemini") {
        speakMeditationSegmentWithGemini(segment, false);
        return;
    }

    speakMeditationSegmentWithBrowser(segment);
}

async function startMeditationProgram(program) {
    stopMeditationSession();
    prepareMeditationSpeech();

    loadMeditationVoices();
    meditationSession.lockedVoice = getMeditationVoice();
    meditationSession.active = true;
    meditationSession.program = program;
    meditationSession.segmentIndex = 0;
    meditationSession.engine = "browser";
    showMeditationActiveView(program);
    setMeditationVoiceStatus("Preparing your coach voice...");

    const firstSegment = program.segments[0];
    if (firstSegment) {
        try {
            await fetchMeditationAudio(firstSegment.text);
            if (!meditationSession.active || meditationSession.program !== program) {
                return;
            }
            meditationSession.engine = "gemini";
        } catch (error) {
            if (!meditationSession.active || meditationSession.program !== program) {
                return;
            }
            meditationSession.engine = "browser";
        }
    }

    if (!meditationSession.active || meditationSession.program !== program) {
        return;
    }

    setMeditationVoiceStatus("");
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

if (closeFixVideoBtn) {
    closeFixVideoBtn.addEventListener("click", function () {
        closeFixVideoPlayer();
        completeMeditationActivity();
    });
}

fixSubmitBtn.addEventListener("click", async function () {
    const text = fixWhatWentWrongInput.value.trim();
    if (!text) {
        alert("Type what happened wrong today in sports before you submit.");
        return;
    }

    fixSubmitBtn.disabled = true;
    fixSubmitBtn.textContent = "Finding a 30s clip...";

    try {
        const response = await fetch("/api/fix-advice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ problem: text })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Could not find a video right now. Try again.");
            return;
        }

        if (!data.video || !data.video.embedUrl) {
            alert("Could not load a matching video. Please try again.");
            return;
        }

        openFixVideoPlayer(data.video);
    } catch (error) {
        alert("Something went wrong. Please try again.");
    } finally {
        fixSubmitBtn.disabled = false;
        fixSubmitBtn.textContent = "Show Matching Clip";
    }
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
    document.body.classList.add("overlay-open");
}

function closeOverlay(overlay) {
    overlay.classList.add("overlay-hidden");
    syncBodyOverlayState();
}

function syncBodyOverlayState() {
    const anyOpen = !!document.querySelector(".rewards-overlay:not(.rewards-hidden)")
        || !!document.querySelector(".video-overlay:not(.video-hidden)")
        || !!document.querySelector(".overlay:not(.overlay-hidden)");
    document.body.classList.toggle("overlay-open", anyOpen);
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

(function openFeatureFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const open = String(params.get("open") || "").toLowerCase();
    if (!open) {
        return;
    }

    function launch() {
        if (open === "visualization" || open === "visualisation" || open === "meditation") {
            prepareMeditationSpeech();
            resetMeditationView();
            openOverlay(meditationOverlay);
            return;
        }
        if (open === "fix" || open === "mistakes") {
            resetFixResults();
            openOverlay(fixOverlay);
            return;
        }
        if (open === "reset") {
            resetBreathingView();
            openOverlay(resetOverlay);
            return;
        }
        if (open === "choices" || open === "avatar" || open === "mental-choices") {
            restoreAvatarSelection();
            openOverlay(avatarOverlay);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            setTimeout(launch, 50);
        });
    } else {
        setTimeout(launch, 50);
    }
})();

