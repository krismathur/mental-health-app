const AVATAR_STORAGE_KEY = "selectedAthleteAvatar";
const TRAINING_PROGRESS_KEY = "mentalTrainingProgress";
const TRAINING_QUESTION_KEY = "mentalTrainingQuestionIndex";
const TRAINING_SESSION_LEVEL_KEY = "mentalTrainingSessionLevel";
const TRAINING_SESSION_CORRECT_KEY = "mentalTrainingSessionCorrect";

const mentalTrainingIntro = document.getElementById("mentalTrainingIntro");
const mentalTrainingMain = document.getElementById("mentalTrainingMain");
const mentalTrainingBottom = document.getElementById("mentalTrainingBottom");
const mentalTrainingFooter = document.getElementById("mentalTrainingFooter");

const PROGRESS_STEP = 5;

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

function setActiveQuestionsForLevel(level) {
    activeQuestions = QUESTION_TIERS[level];
}

function startNewSession(level) {
    currentQuestionIndex = 0;
    sessionCorrectCount = 0;
    barProgress = 0;
    missedQuestions = [];
    reviewQuestions = [];
    reviewIndex = 0;
    reviewStillWrong = [];
    isReviewMode = false;
    sessionRewardsGiven = false;
    saveQuestionIndex(0);
    saveTrainingProgress(0);
    saveSessionCorrectCount(0);
    setActiveQuestionsForLevel(level);
}

function updateBarProgress(isCorrect) {
    if (isCorrect) {
        saveTrainingProgress(barProgress + PROGRESS_STEP);
    } else {
        saveTrainingProgress(barProgress - PROGRESS_STEP);
    }
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

function renderProgressBar() {
    mentalTrainingBottom.innerHTML = `
        <p class="mental-training-progress-label">${barProgress}% Mental Training Complete</p>
        <div class="mental-training-progress-bar">
            <div class="mental-training-progress-track">
                <div class="mental-training-progress-fill" style="width: ${barProgress}%"></div>
                <div class="mental-training-progress-avatar" style="left: ${barProgress}%">
                    <img src="${savedAvatar.image}" alt="${savedAvatar.alt || savedAvatar.name}">
                </div>
            </div>
        </div>
    `;
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
    const resultMessage = passed ? "Great choices today." : "You can make better choices.";
    const resultClass = passed ? "mental-training-result-pass" : "mental-training-result-fail";
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
}

function startMissedReview() {
    isReviewMode = true;
    reviewQuestions = missedQuestions.slice();
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

    updateBarProgress(isCorrect);

    setTimeout(function () {
        isAnswering = false;
        renderProgressBar();
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
    setActiveQuestionsForLevel(sessionLevel);
    currentQuestionIndex = getQuestionIndex();
    sessionCorrectCount = getSessionCorrectCount();
    barProgress = getTrainingProgress();

    if (currentQuestionIndex >= activeQuestions.length) {
        startNewSession(sessionLevel);
    }

    renderProgressBar();
    setTimeout(hideIntroMessage, 4500);
}

loadMentalTrainingPage();
