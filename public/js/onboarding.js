/*
 * Onboarding.
 *
 * The form is eleven questions long, which is a lot to hand a twelve-year-old
 * as one scroll, so it runs as a three-step wizard. The progress bar at the top
 * of the page already showed steps; until now it never moved, which made it
 * decoration. It tracks the real position now.
 *
 * Validation is done here rather than by the browser because a `required`
 * field inside a hidden step cannot be focused, and Chrome responds to that by
 * refusing to submit while reporting nothing the user can see.
 */
const form = document.getElementById("onboardingForm");
const button = document.getElementById("submitBtn");
const nextButton = document.getElementById("nextBtn");
const backButton = document.getElementById("backBtn");
const errorBox = document.getElementById("formError");
const stepTitle = document.getElementById("stepTitle");
const stepSubtitle = document.getElementById("stepSubtitle");
const stepNow = document.getElementById("stepNow");

const steps = Array.from(form.querySelectorAll(".step"));
const LAST_STEP = steps.length;
let currentStep = 1;

const STEP_COPY = {
    1: { title: "About You", subtitle: "No wrong answers — just be honest!" },
    2: { title: "Your Goals", subtitle: "What do you want this season to look like?" },
    3: { title: "Quick Check-In", subtitle: "Last one. This sets your starting point." }
};

async function makeSureUserIsLoggedIn() {
    try {
        const response = await fetch("/api/me");

        if (!response.ok) {
            window.location.href = "auth.html";
        }
    } catch (error) {
        window.location.href = "auth.html";
    }
}

makeSureUserIsLoggedIn();

function showError(text, focusTarget) {
    errorBox.textContent = text;
    errorBox.hidden = false;

    if (focusTarget) {
        focusTarget.focus();
    }

    errorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearError() {
    errorBox.textContent = "";
    errorBox.hidden = true;
}

function value(id) {
    return document.getElementById(id).value.trim();
}

function picked(name) {
    return document.querySelector('input[name="' + name + '"]:checked');
}

// Returns an error message for the given step, or "" when it is complete.
function problemWithStep(step) {
    if (step === 1) {
        if (!value("name")) {
            return "Please tell us your name.";
        }

        const age = parseInt(value("age"), 10);

        if (!Number.isInteger(age)) {
            return "Please enter your age.";
        }

        if (age < 10 || age > 18) {
            return "MindZone is built for athletes aged 10 to 18.";
        }

        if (!value("sport")) {
            return "Please tell us your sport.";
        }

        if (!picked("mentalSkill")) {
            return "Tap a number for how much you already work on being mentally prepared.";
        }

        return "";
    }

    if (step === 2) {
        if (!value("goal")) {
            return "Please tell us what you want to get better at.";
        }

        if (!value("challenge")) {
            return "Please tell us your biggest challenge.";
        }

        if (!picked("goalCommitment")) {
            return "Tap a number for how much you're willing to work on your goal.";
        }

        const weeks = parseInt(value("weeks"), 10);

        if (!Number.isInteger(weeks) || weeks < 1 || weeks > 4) {
            return "Choose a plan length between 1 and 4 weeks.";
        }

        return "";
    }

    const checkIns = [
        ["confidence", "how confident you feel"],
        ["stress", "how stressed you get"],
        ["focus", "how well you focus"],
        ["bounce", "how fast you bounce back"]
    ];

    for (const [name, label] of checkIns) {
        if (!picked(name)) {
            return "Tap a number for " + label + ".";
        }
    }

    const consent = document.getElementById("parentConsent");

    if (!consent.checked) {
        return "Please check the box to confirm a parent or guardian said it's okay.";
    }

    return "";
}

// The first empty control on a step, so an error can send focus somewhere useful.
function firstEmptyControl(step) {
    const section = steps[step - 1];
    const controls = section.querySelectorAll("input");

    for (const control of controls) {
        if (control.type === "radio") {
            if (!picked(control.name)) {
                return control;
            }
        } else if (control.type === "checkbox") {
            if (!control.checked) {
                return control;
            }
        } else if (!control.value.trim()) {
            return control;
        }
    }

    return null;
}

function goToStep(step) {
    currentStep = step;
    clearError();

    steps.forEach(function (section, index) {
        section.classList.toggle("is-active", index + 1 === step);
    });

    // The bar counts the account step as 0, so the form's steps start at 1.
    document.querySelectorAll(".progress-step").forEach(function (node) {
        const index = parseInt(node.dataset.step, 10);
        node.classList.toggle("done", index < step);
        node.classList.toggle("active", index === step);
    });

    document.querySelectorAll(".progress-line").forEach(function (node) {
        node.classList.toggle("done", parseInt(node.dataset.line, 10) < step);
    });

    const copy = STEP_COPY[step];
    stepTitle.textContent = copy.title;
    stepSubtitle.textContent = copy.subtitle;
    stepNow.textContent = String(step);

    backButton.hidden = step === 1;
    nextButton.hidden = step === LAST_STEP;
    button.hidden = step !== LAST_STEP;

    document.querySelector(".card").scrollIntoView({ behavior: "smooth", block: "start" });
}

nextButton.addEventListener("click", function () {
    const problem = problemWithStep(currentStep);

    if (problem) {
        return showError(problem, firstEmptyControl(currentStep));
    }

    goToStep(currentStep + 1);
});

backButton.addEventListener("click", function () {
    goToStep(currentStep - 1);
});

// Clearing on input means the message goes away as soon as they fix the thing,
// rather than sitting there looking like a fresh complaint.
form.addEventListener("input", clearError);

goToStep(1);

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Re-check every step: someone can reach the end and then go back and
    // empty a field.
    for (let step = 1; step <= LAST_STEP; step += 1) {
        const problem = problemWithStep(step);

        if (problem) {
            goToStep(step);
            return showError(problem, firstEmptyControl(step));
        }
    }

    const name = value("name");
    const age = value("age");
    const sport = value("sport");
    const goal = value("goal");
    const challenge = value("challenge");
    const weeks = value("weeks");

    const mentalSkill = picked("mentalSkill");
    const goalCommitment = picked("goalCommitment");
    const confidence = picked("confidence");
    const stress = picked("stress");
    const focus = picked("focus");
    const bounce = picked("bounce");

    const days = String(parseInt(weeks, 10) * 7);

    const sportLower = sport.toLowerCase();
    let extra = "Keep showing up, and trust your training.";

    if (sportLower.includes("basketball")) {
        extra = "Take your confidence, and show it on the court!";
    } else if (sportLower.includes("tennis")) {
        extra = "Take the match step by step.";
    } else if (sportLower.includes("baseball")) {
        extra = "Stay confident, and calm at the plate.";
    }

    localStorage.setItem("mindzone_name", name);
    localStorage.setItem("mindzone_age", age);
    localStorage.setItem("mindzone_sport", sport);
    localStorage.setItem("mindzone_goal", goal);
    localStorage.setItem("mindzone_challenge", challenge);
    localStorage.setItem("mindzone_days", days);
    localStorage.setItem("mindzone_mental_skill", mentalSkill.value);
    localStorage.setItem("mindzone_goal_commitment", goalCommitment.value);
    localStorage.setItem("mindzone_confidence", confidence.value);
    localStorage.setItem("mindzone_stress", stress.value);
    localStorage.setItem("mindzone_focus", focus.value);
    localStorage.setItem("mindzone_bounce", bounce.value);
    localStorage.setItem("mindzone_motivation", extra);

    const profile = {
        name,
        age,
        sport,
        goal,
        challenge,
        days,
        mentalSkill: mentalSkill.value,
        goalCommitment: goalCommitment.value,
        confidence: confidence.value,
        stress: stress.value,
        focus: focus.value,
        bounce: bounce.value,
        parentConsent: true
    };

    const originalLabel = button.textContent;

    function failed(message) {
        showError(message);
        button.disabled = false;
        button.textContent = originalLabel;
    }

    button.disabled = true;
    button.textContent = "Building your plan...";

    try {
        const response = await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile)
        });

        const result = await response.json();

        if (!response.ok) {
            return failed(result.message || "Could not save your profile. Please try again.");
        }
    } catch (error) {
        return failed("Could not save your profile. Please try again.");
    }

    button.textContent = "Generating your plan...";

    try {
        const response = await fetch("/api/generate-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile)
        });

        const result = await response.json();

        if (!response.ok) {
            return failed(result.message || "Could not build your plan. Please try again.");
        }
    } catch (error) {
        return failed("Could not build your plan. Please try again.");
    }

    window.location.href = "welcome.html";
});
