const AVATAR_STORAGE_KEY = "selectedAthleteAvatar";
const TRAINING_PROGRESS_KEY = "mentalTrainingProgress";
const TRAINING_QUESTION_KEY = "mentalTrainingQuestionIndex";
const TRAINING_SESSION_LEVEL_KEY = "mentalTrainingSessionLevel";
const TRAINING_SESSION_CORRECT_KEY = "mentalTrainingSessionCorrect";
const TRAINING_QUESTION_ORDER_KEY = "mentalTrainingQuestionOrder";

const mentalTrainingIntro = document.getElementById("mentalTrainingIntro");
const mentalTrainingMain = document.getElementById("mentalTrainingMain");
const mentalTrainingBottom = document.getElementById("mentalTrainingBottom");
const mentalTrainingFooter = document.getElementById("mentalTrainingFooter");
const closeMentalTrainingBtn = document.getElementById("closeMentalTrainingBtn");

if (closeMentalTrainingBtn) {
    closeMentalTrainingBtn.addEventListener("click", function () {
        window.location.href = "meditation.html";
    });
}

const PROGRESS_STEP = 5;

const PROGRESS_THEME_BY_LEAGUE = {
    NBA: {
        sport: "basketball",
        action: "shoot",
        actionLabel: "Shoot",
        finishLabel: "Hoop",
        finishClass: "finish-hoop",
        scoreLabel: "Swish!",
        ballClass: "ball-basketball"
    },
    MLB: {
        sport: "baseball",
        action: "swing",
        actionLabel: "Swing",
        finishLabel: "Crown",
        finishClass: "finish-crown",
        scoreLabel: "Home run!",
        ballClass: "ball-baseball"
    },
    MLS: {
        sport: "soccer",
        action: "kick",
        actionLabel: "Kick",
        finishLabel: "Goal",
        finishClass: "finish-goal",
        scoreLabel: "GOOOAL!",
        ballClass: "ball-soccer"
    },
    NFL: {
        sport: "football",
        action: "kick",
        actionLabel: "Kick",
        finishLabel: "Field Goal",
        finishClass: "finish-fieldgoal",
        scoreLabel: "It's good!",
        ballClass: "ball-football"
    }
};

let hasCelebratedScore = false;
let hasPlayedFirstAction = false;
let scoreAudioContext = null;

function getProgressTheme() {
    const league = String(savedAvatar && savedAvatar.league ? savedAvatar.league : "").trim().toUpperCase();
    return PROGRESS_THEME_BY_LEAGUE[league] || {
        sport: "general",
        action: "shoot",
        actionLabel: "Go",
        finishLabel: "Finish",
        finishClass: "finish-default",
        scoreLabel: "Nice!",
        ballClass: "ball-default"
    };
}

function getProgressFinishTarget() {
    const theme = getProgressTheme();
    return {
        label: theme.finishLabel,
        className: theme.finishClass
    };
}

function getScoreAudioContext() {
    if (!scoreAudioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            return null;
        }
        scoreAudioContext = new AudioCtx();
    }
    return scoreAudioContext;
}

function playToneBurst(frequencies, duration, type, volume) {
    const ctx = getScoreAudioContext();
    if (!ctx) {
        return;
    }

    if (ctx.state === "suspended") {
        ctx.resume();
    }

    const now = ctx.currentTime;
    frequencies.forEach(function (freq, index) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = type || "sine";
        oscillator.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime((volume || 0.08) / frequencies.length, now + 0.02 + index * 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
    });
}

function playCrowdCheer() {
    const ctx = getScoreAudioContext();
    if (!ctx) {
        return;
    }

    if (ctx.state === "suspended") {
        ctx.resume();
    }

    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 1.4);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(0.7, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 1.4);

    playToneBurst([523, 659, 784, 1046], 0.55, "triangle", 0.12);
}

function playCrowdOhh() {
    const ctx = getScoreAudioContext();
    if (!ctx) {
        return;
    }

    if (ctx.state === "suspended") {
        ctx.resume();
    }

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(420, now);
    oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.85);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.95);

    // Soft crowd "ohh" texture
    const bufferSize = Math.floor(ctx.sampleRate * 0.9);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
        data[i] = (Math.random() * 2 - 1) * 0.35 * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.1, now + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.9);
}

function launchConfetti() {
    const layer = document.createElement("div");
    layer.className = "mental-training-confetti-layer";
    layer.setAttribute("aria-hidden", "true");

    for (let i = 0; i < 42; i += 1) {
        const piece = document.createElement("span");
        piece.className = "mental-training-confetti-piece";
        piece.style.left = Math.random() * 100 + "%";
        piece.style.animationDelay = (Math.random() * 0.45) + "s";
        piece.style.animationDuration = (1.4 + Math.random() * 1.1) + "s";
        piece.style.background = ["#f6e05e", "#fc8181", "#63b3ed", "#68d391", "#f687b3", "#fff"][i % 6];
        layer.appendChild(piece);
    }

    document.body.appendChild(layer);
    setTimeout(function () {
        layer.remove();
    }, 2800);
}

function celebrateScore() {
    if (hasCelebratedScore || barProgress < 100) {
        return;
    }

    hasCelebratedScore = true;
    const theme = getProgressTheme();
    launchConfetti();
    playCrowdCheer();
    flashTrainingResult(theme.scoreLabel, "mental-training-flash-good");

    const track = mentalTrainingBottom && mentalTrainingBottom.querySelector(".mental-training-progress-track");
    if (track) {
        track.classList.add("is-scored", "score-" + theme.sport);
    }
}

function playMissReaction() {
    if (hasCelebratedScore || barProgress >= 100) {
        return;
    }

    playCrowdOhh();
}

const QUESTION_TIERS = [
    [
        { wrong: "Sleep in till 8", right: "Wake up at 5 to go work-out" },
        { wrong: "Scroll on your phone until you fall asleep", right: "Visualize your best game before bed" },
        { wrong: "Dwell on the mistake all game", right: "Do a 5-minute breathing exercise after a bad play" },
        { wrong: "Only think about what went wrong", right: "Write down 3 things you did well after practice" },
        { wrong: "Blame teammates for the loss", right: "Talk to your coach about what to fix" },
        { wrong: "Skip warm-up because you feel nervous", right: "Stick to your pre-game routine" },
        { wrong: "Eat fast food and candy all day", right: "Fuel your body with a healthy meal before game day" },
        { wrong: "Stay up late gaming the night before", right: "Get 8+ hours of sleep before a big game" },
        { wrong: "Make fun of them for missing a shot", right: "Encourage a struggling teammate" },
        { wrong: "Ignore how your body feels", right: "Practice mindfulness for 10 minutes" },
        { wrong: "Show up with no plan", right: "Set a small goal for today's practice" },
        { wrong: "Tell yourself you'll probably choke", right: "Reframe \"I'm nervous\" as \"I'm ready\"" },
        { wrong: "Delete the video and forget it happened", right: "Review game film to learn" },
        { wrong: "Leave immediately when practice ends", right: "Stretch and cool down after practice" },
        { wrong: "Only drink soda and energy drinks", right: "Drink water throughout the day" },
        { wrong: "Say the ref was unfair and quit trying", right: "Take accountability for your error" },
        { wrong: "Only practice what you're already good at", right: "Do extra reps on your weakest skill" },
        { wrong: "Yell at yourself and slam your equipment", right: "Use positive self-talk after a miss" },
        { wrong: "Rush and forget items on game day", right: "Prepare your gear the night before" },
        { wrong: "Expect everything without showing gratitude", right: "Thank your parents for supporting you" }
    ],
    [
        { wrong: "Sleep until 7 because you are tired", right: "Wake up at 5:30 for workout, stretch, and a healthy breakfast" },
        { wrong: "Replay your worst plays on your phone before bed", right: "Run your game plan and breathing routine before sleep" },
        { wrong: "Keep thinking about the mistake until the next day", right: "Reset with breathing and one clear focus cue right away" },
        { wrong: "Skip journaling because practice already ended", right: "Write 3 wins and 1 fix before you leave the gym" },
        { wrong: "Tell teammates they cost you the game", right: "Ask your coach what leadership move helps the team most" },
        { wrong: "Change your routine because pressure feels too high", right: "Keep the same routine and trust the reps you already built" },
        { wrong: "Grab quick junk food since you will burn it off later", right: "Eat a balanced pre-game meal with protein and hydration" },
        { wrong: "Stay up until 1 AM because you feel fine", right: "Shut down screens early and protect 8+ hours of sleep" },
        { wrong: "Stay quiet when a teammate is struggling", right: "Pull them aside and give one specific encouragement" },
        { wrong: "Push through pain without checking in", right: "Do a body scan and adjust intensity with intention" },
        { wrong: "Let the coach tell you what to focus on", right: "Set one measurable goal before practice starts" },
        { wrong: "Say \"I always mess up in clutch moments\"", right: "Use a clutch cue like \"calm eyes, quick feet\"" },
        { wrong: "Avoid film because it feels embarrassing", right: "Study one play and write how you will respond next time" },
        { wrong: "Skip cooldown to save five minutes", right: "Finish with stretch, breath work, and hydration" },
        { wrong: "Drink energy drinks to feel locked in", right: "Hydrate with water and electrolytes all day" },
        { wrong: "Argue with the ref and lose focus", right: "Control your response and lock back into the next play" },
        { wrong: "Train only your highlight skills in practice", right: "Spend the first 20 minutes on your weakest skill" },
        { wrong: "Punish yourself with negative self-talk", right: "Use one reset phrase and move to the next rep" },
        { wrong: "Pack your bag five minutes before you leave", right: "Pack gear, snacks, and clothes the night before" },
        { wrong: "Assume support is automatic", right: "Send a thank-you message to someone who helps you train" }
    ],
    [
        { wrong: "Skip the morning session because one rest day won't hurt", right: "Wake up at 5, train, journal, and fuel before school" },
        { wrong: "Watch stressful sports clips until you fall asleep", right: "Visualize two clutch plays and your calm response" },
        { wrong: "Carry the bad play into the next quarter", right: "Use a 30-second reset: breath, cue, next action" },
        { wrong: "End practice on a negative thought", right: "Log 3 strengths, 1 fix, and tomorrow's top priority" },
        { wrong: "Call out teammates publicly after a loss", right: "Lead a huddle focused on one team fix for next game" },
        { wrong: "Abandon your routine when the crowd gets loud", right: "Run your full routine exactly, even under pressure" },
        { wrong: "Eat whatever is fastest before a championship game", right: "Stick to your proven meal plan and hydration schedule" },
        { wrong: "Trade sleep for extra screen time the night before", right: "Protect sleep like it is part of your training plan" },
        { wrong: "Let a struggling teammate figure it out alone", right: "Coach them through one rep and rebuild their confidence" },
        { wrong: "Ignore stress signals to look tough", right: "Use a 10-minute mindfulness block and adjust workload" },
        { wrong: "Wait until halftime to change your mindset", right: "Set process goals before warm-ups and review at each break" },
        { wrong: "Accept \"I am just bad under pressure\"", right: "Train pressure reps and use a proven clutch self-talk script" },
        { wrong: "Only watch highlights where you looked good", right: "Break down your toughest turnover and script the fix" },
        { wrong: "Leave practice before recovery work", right: "Complete cooldown, mobility, and a 2-minute reflection" },
        { wrong: "Use caffeine instead of real hydration", right: "Track water intake and fuel consistently through the day" },
        { wrong: "Let one bad call decide your effort level", right: "Stay accountable and attack the next possession" },
        { wrong: "Avoid your weakness because it feels frustrating", right: "Do deliberate weak-skill reps until form improves" },
        { wrong: "Let frustration take over after back-to-back errors", right: "Pause, breathe, and execute your reset routine" },
        { wrong: "Wing game-day prep on the way to the field", right: "Follow a written pre-game checklist the night before" },
        { wrong: "Forget the people who sacrifice for your goals", right: "Thank your support system and name one way you will earn it" }
    ]
];

const TIER_LABELS = ["Rookie Choices", "Pro Choices", "Elite Choices"];

let savedAvatar = null;
let activeQuestions = [];
let currentQuestionIndex = 0;
let sessionCorrectCount = 0;
let barProgress = 0;
let isAnswering = false;
let missedQuestions = [];
let reviewQuestions = [];
let reviewIndex = 0;
let reviewStillWrong = [];
let isReviewMode = false;
let sessionRewardsGiven = false;

function getSessionLevel() {
    return Math.min(
        QUESTION_TIERS.length - 1,
        Math.max(0, parseInt(localStorage.getItem(TRAINING_SESSION_LEVEL_KEY), 10) || 0)
    );
}

function getTrainingProgress() {
    return Math.min(100, Math.max(0, parseInt(localStorage.getItem(TRAINING_PROGRESS_KEY), 10) || 0));
}

function getQuestionIndex() {
    return Math.max(0, parseInt(localStorage.getItem(TRAINING_QUESTION_KEY), 10) || 0);
}

function getSessionCorrectCount() {
    return Math.max(0, parseInt(localStorage.getItem(TRAINING_SESSION_CORRECT_KEY), 10) || 0);
}

function saveQuestionIndex(index) {
    localStorage.setItem(TRAINING_QUESTION_KEY, String(index));
}

function saveTrainingProgress(progress) {
    barProgress = Math.min(100, Math.max(0, progress));
    localStorage.setItem(TRAINING_PROGRESS_KEY, String(barProgress));
}

function saveSessionCorrectCount(count) {
    localStorage.setItem(TRAINING_SESSION_CORRECT_KEY, String(count));
}

function saveSessionLevel(level) {
    localStorage.setItem(TRAINING_SESSION_LEVEL_KEY, String(level));
}

function shuffleArray(items) {
    const copy = items.slice();

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
    }

    return copy;
}

function saveQuestionOrder(level, order) {
    localStorage.setItem(TRAINING_QUESTION_ORDER_KEY, JSON.stringify({
        level: level,
        order: order
    }));
}

function getSavedQuestionOrder(level) {
    const raw = localStorage.getItem(TRAINING_QUESTION_ORDER_KEY);
    if (!raw) {
        return null;
    }

    try {
        const saved = JSON.parse(raw);
        const tierLength = QUESTION_TIERS[level].length;

        if (
            saved &&
            saved.level === level &&
            Array.isArray(saved.order) &&
            saved.order.length === tierLength
        ) {
            return saved.order;
        }
    } catch (error) {
        return null;
    }

    return null;
}

function setActiveQuestionsForLevel(level, forceNewOrder) {
    const tier = QUESTION_TIERS[level];
    let order = forceNewOrder ? null : getSavedQuestionOrder(level);

    if (!order) {
        order = shuffleArray(tier.map(function (_, index) {
            return index;
        }));
        saveQuestionOrder(level, order);
    }

    activeQuestions = order.map(function (index) {
        return tier[index];
    });
}

function startNewSession(level) {
    currentQuestionIndex = 0;
    sessionCorrectCount = 0;
    barProgress = 0;
    hasCelebratedScore = false;
    hasPlayedFirstAction = false;
    missedQuestions = [];
    reviewQuestions = [];
    reviewIndex = 0;
    reviewStillWrong = [];
    isReviewMode = false;
    sessionRewardsGiven = false;
    saveQuestionIndex(0);
    saveTrainingProgress(0);
    saveSessionCorrectCount(0);
    setActiveQuestionsForLevel(level, true);
}

function updateBarProgress(isCorrect) {
    const before = barProgress;
    if (isCorrect) {
        saveTrainingProgress(barProgress + PROGRESS_STEP);
    } else {
        saveTrainingProgress(barProgress - PROGRESS_STEP);
    }

    return {
        before: before,
        after: barProgress,
        scored: before < 100 && barProgress >= 100
    };
}

function showTrainingContent() {
    mentalTrainingMain.classList.remove("mental-training-hidden");
    mentalTrainingFooter.classList.remove("mental-training-hidden");
    renderProgressBar();
    renderCurrentQuestion();
}

function hideIntroMessage() {
    mentalTrainingIntro.classList.add("mental-training-intro-fade-out");

    mentalTrainingIntro.addEventListener("animationend", function () {
        mentalTrainingIntro.remove();
        showTrainingContent();
    }, { once: true });
}

function renderFinishTarget(theme, finish, reachedFinish) {
    if (theme.finishClass === "finish-hoop") {
        return `
            <div class="mental-training-progress-finish finish-hoop${reachedFinish ? " is-reached" : ""}" title="${finish.label}">
                <div class="goal-graphic hoop-graphic" aria-hidden="true">
                    <span class="hoop-backboard"></span>
                    <span class="hoop-rim"></span>
                    <span class="hoop-net"></span>
                </div>
                <span class="mental-training-progress-finish-label">${finish.label}</span>
            </div>
        `;
    }

    if (theme.finishClass === "finish-goal") {
        return `
            <div class="mental-training-progress-finish finish-goal${reachedFinish ? " is-reached" : ""}" title="${finish.label}">
                <div class="goal-graphic soccer-goal-graphic" aria-hidden="true">
                    <span class="soccer-goal-frame"></span>
                    <span class="soccer-goal-net"></span>
                </div>
                <span class="mental-training-progress-finish-label">${finish.label}</span>
            </div>
        `;
    }

    if (theme.finishClass === "finish-fieldgoal") {
        return `
            <div class="mental-training-progress-finish finish-fieldgoal${reachedFinish ? " is-reached" : ""}" title="${finish.label}">
                <div class="goal-graphic fieldgoal-graphic" aria-hidden="true">
                    <span class="fg-upright fg-left"></span>
                    <span class="fg-upright fg-right"></span>
                    <span class="fg-crossbar"></span>
                    <span class="fg-base"></span>
                </div>
                <span class="mental-training-progress-finish-label">${finish.label}</span>
            </div>
        `;
    }

    if (theme.finishClass === "finish-crown") {
        return `
            <div class="mental-training-progress-finish finish-crown${reachedFinish ? " is-reached" : ""}" title="${finish.label}">
                <div class="goal-graphic crown-graphic" aria-hidden="true">
                    <span class="crown-band"></span>
                    <span class="crown-point crown-point-1"></span>
                    <span class="crown-point crown-point-2"></span>
                    <span class="crown-point crown-point-3"></span>
                    <span class="crown-jewel"></span>
                </div>
                <span class="mental-training-progress-finish-label">${finish.label}</span>
            </div>
        `;
    }

    return `
        <div class="mental-training-progress-finish finish-default${reachedFinish ? " is-reached" : ""}" title="${finish.label}">
            <div class="goal-graphic default-graphic" aria-hidden="true"></div>
            <span class="mental-training-progress-finish-label">${finish.label}</span>
        </div>
    `;
}

function playFirstActionAnimation() {
    if (hasPlayedFirstAction) {
        return;
    }

    hasPlayedFirstAction = true;
    const theme = getProgressTheme();
    const athlete = mentalTrainingBottom && mentalTrainingBottom.querySelector(".mental-training-progress-athlete");
    const ball = mentalTrainingBottom && mentalTrainingBottom.querySelector(".mental-training-progress-marker");

    if (athlete) {
        athlete.classList.add("is-acting", "action-" + theme.action);
        setTimeout(function () {
            athlete.classList.remove("is-acting", "action-shoot", "action-kick", "action-swing");
        }, 900);
    }

    if (ball) {
        ball.classList.add("is-launched", "launch-" + theme.sport);
        setTimeout(function () {
            ball.classList.remove("is-launched", "launch-basketball", "launch-soccer", "launch-baseball", "launch-football");
        }, 900);
    }
}

function renderProgressBar(options) {
    options = options || {};
    const theme = getProgressTheme();
    const finish = getProgressFinishTarget();
    const reachedFinish = barProgress >= 100;
    const avatarSrc = savedAvatar && savedAvatar.image ? savedAvatar.image : "";
    const avatarAlt = (savedAvatar && (savedAvatar.alt || savedAvatar.name)) || "Athlete";

    mentalTrainingBottom.innerHTML = `
        <p class="mental-training-progress-label">${barProgress}% Mental Training Complete</p>
        <div class="mental-training-progress-bar sport-${theme.sport}">
            <div class="mental-training-progress-athlete" title="${avatarAlt}">
                <img src="${avatarSrc}" alt="${avatarAlt}">
                <span class="athlete-action-burst" aria-hidden="true"></span>
            </div>
            <div class="mental-training-progress-track${reachedFinish ? " is-scored score-" + theme.sport : ""}">
                <div class="mental-training-progress-fill" style="width: ${barProgress}%"></div>
                <div class="mental-training-progress-marker ${theme.ballClass}" style="left: ${barProgress}%">
                    <span class="progress-ball-shape" aria-hidden="true"></span>
                </div>
                ${renderFinishTarget(theme, finish, reachedFinish)}
            </div>
        </div>
    `;

    if (options.playAction) {
        // Wait one frame so CSS can apply before animating.
        requestAnimationFrame(function () {
            playFirstActionAnimation();
        });
    }

    if (reachedFinish) {
        celebrateScore();
    }
}

function shuffleChoices(question) {
    const choices = [
        { text: question.wrong, isRight: false },
        { text: question.right, isRight: true }
    ];

    if (Math.random() > 0.5) {
        choices.reverse();
    }

    return choices;
}

function renderQuestionSet(question, label, countText, onChoice) {
    const choices = shuffleChoices(question);

    mentalTrainingMain.innerHTML = `
        <div class="mental-training-question-set">
            <p class="mental-training-tier-label">${label}</p>
            <p class="mental-training-choose-label">Choose 1</p>
            <div class="mental-training-choices">
                <button type="button" class="mental-training-choice" data-correct="${choices[0].isRight}">
                    ${choices[0].text}
                </button>
                <button type="button" class="mental-training-choice" data-correct="${choices[1].isRight}">
                    ${choices[1].text}
                </button>
            </div>
            <p class="mental-training-question-count">${countText}</p>
        </div>
    `;

    mentalTrainingMain.querySelectorAll(".mental-training-choice").forEach(function (choiceBtn) {
        choiceBtn.addEventListener("click", function () {
            onChoice(choiceBtn);
        });
    });
}

function renderSummaryScreen(extraMessage) {
    const total = activeQuestions.length;
    const passed = sessionCorrectCount >= 10;
    const scored = barProgress >= 100;
    const resultMessage = scored
        ? "You scored! Great choices today."
        : (passed ? "Great choices today." : "You can make better choices.");
    const resultClass = (scored || passed) ? "mental-training-result-pass" : "mental-training-result-fail";
    const currentLevel = getSessionLevel();
    const nextLevel = Math.min(QUESTION_TIERS.length - 1, currentLevel + 1);

    if (passed && !sessionRewardsGiven && typeof window.addRewardProgress === "function") {
        window.addRewardProgress({
            xp: 20,
            stars: 1,
            activityCompletions: 1
        });
        sessionRewardsGiven = true;
    }

    saveSessionLevel(nextLevel);
    saveQuestionIndex(total);

    const tierNote = nextLevel > currentLevel
        ? "<p class=\"mental-training-tier-note\">Next time you train, the choices get harder.</p>"
        : `<p class="mental-training-tier-note">You are on the hardest level: ${TIER_LABELS[currentLevel]}.</p>`;

    mentalTrainingMain.innerHTML = `
        <div class="mental-training-complete">
            <h3>Training Done</h3>
            <p class="mental-training-score">You got ${sessionCorrectCount} out of ${total} right.</p>
            <p class="mental-training-result-message ${resultClass}">${resultMessage}</p>
            ${extraMessage || ""}
            ${tierNote}
        </div>
    `;

    renderProgressBar();

    if (scored) {
        celebrateScore();
    } else {
        playMissReaction();
    }
}

function startMissedReview() {
    isReviewMode = true;
    reviewQuestions = shuffleArray(missedQuestions.slice());
    reviewIndex = 0;
    reviewStillWrong = [];
    renderMissedReviewQuestion();
}

function finishMissedReview() {
    isReviewMode = false;

    if (reviewStillWrong.length > 0) {
        flashTrainingResult("It's okay try again next time", "mental-training-flash-encourage");
        setTimeout(function () {
            renderSummaryScreen("<p class=\"mental-training-missed-note\">You missed some choices again, but keep training your athlete.</p>");
        }, 1800);
        return;
    }

    renderSummaryScreen("<p class=\"mental-training-missed-note\">Nice work fixing your missed choices.</p>");
}

function renderMissedReviewQuestion() {
    if (reviewIndex >= reviewQuestions.length) {
        finishMissedReview();
        return;
    }

    const question = reviewQuestions[reviewIndex];

    renderQuestionSet(
        question,
        "Missed Question Review",
        `Missed question ${reviewIndex + 1} of ${reviewQuestions.length}`,
        handleReviewChoice
    );
}

function showTrainingComplete() {
    renderSummaryScreen();

    if (missedQuestions.length === 0) {
        return;
    }

    setTimeout(function () {
        flashTrainingResult("Here are the questions you missed", "mental-training-flash-missed");
        setTimeout(startMissedReview, 1800);
    }, 1200);
}

function renderCurrentQuestion() {
    if (currentQuestionIndex >= activeQuestions.length) {
        showTrainingComplete();
        return;
    }

    const question = activeQuestions[currentQuestionIndex];
    const levelLabel = TIER_LABELS[getSessionLevel()];

    renderQuestionSet(
        question,
        levelLabel,
        `Question ${currentQuestionIndex + 1} of ${activeQuestions.length}`,
        handleChoice
    );
}

function flashTrainingResult(message, type) {
    const flash = document.createElement("div");
    flash.className = "mental-training-flash " + type;
    flash.textContent = message;
    document.body.appendChild(flash);

    setTimeout(function () {
        flash.remove();
    }, 1800);
}

function handleAnswer(choiceBtn, options) {
    if (isAnswering) {
        return;
    }

    isAnswering = true;
    const isCorrect = choiceBtn.dataset.correct === "true";

    mentalTrainingMain.querySelectorAll(".mental-training-choice").forEach(function (btn) {
        btn.disabled = true;
    });

    if (isCorrect) {
        choiceBtn.classList.add("mental-training-choice-correct");
        flashTrainingResult("Good", "mental-training-flash-good");
    } else {
        choiceBtn.classList.add("mental-training-choice-wrong");
        flashTrainingResult("Wrong", "mental-training-flash-wrong");
    }

    const progressResult = updateBarProgress(isCorrect);
    const playAction = isCorrect && !hasPlayedFirstAction && !isReviewMode;

    setTimeout(function () {
        isAnswering = false;
        renderProgressBar({ playAction: playAction });
        if (progressResult.after >= 100) {
            celebrateScore();
        }
        options.onResult(isCorrect);
    }, 1700);
}

function handleChoice(choiceBtn) {
    const question = activeQuestions[currentQuestionIndex];

    handleAnswer(choiceBtn, {
        onResult: function (isCorrect) {
            if (isCorrect) {
                sessionCorrectCount += 1;
                saveSessionCorrectCount(sessionCorrectCount);
            } else {
                missedQuestions.push(question);
            }

            currentQuestionIndex += 1;
            saveQuestionIndex(currentQuestionIndex);
            renderCurrentQuestion();
        }
    });
}

function handleReviewChoice(choiceBtn) {
    const question = reviewQuestions[reviewIndex];

    handleAnswer(choiceBtn, {
        onResult: function (isCorrect) {
            if (!isCorrect) {
                reviewStillWrong.push(question);
            }

            reviewIndex += 1;
            renderMissedReviewQuestion();
        }
    });
}

function loadMentalTrainingPage() {
    savedAvatar = JSON.parse(localStorage.getItem(AVATAR_STORAGE_KEY) || "null");
    if (!savedAvatar || !savedAvatar.name) {
        window.location.href = "meditation.html";
        return;
    }

    const sessionLevel = getSessionLevel();
    currentQuestionIndex = getQuestionIndex();
    sessionCorrectCount = getSessionCorrectCount();
    barProgress = getTrainingProgress();
    hasCelebratedScore = barProgress >= 100;
    hasPlayedFirstAction = barProgress > 0;

    if (currentQuestionIndex >= QUESTION_TIERS[sessionLevel].length) {
        startNewSession(sessionLevel);
    } else {
        setActiveQuestionsForLevel(sessionLevel, false);
    }

    renderProgressBar();
    setTimeout(hideIntroMessage, 4500);
}

loadMentalTrainingPage();
