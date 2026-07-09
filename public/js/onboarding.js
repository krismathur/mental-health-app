const form = document.getElementById("onboardingForm");
const button = document.getElementById("submitBtn");

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

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const age = document.getElementById("age").value.trim();
    const sport = document.getElementById("sport").value.trim();
    const goal = document.getElementById("goal").value.trim();
    const challenge = document.getElementById("challenge").value.trim();
    const weeks = document.getElementById("weeks").value.trim();

    const mentalSkill = document.querySelector('input[name="mentalSkill"]:checked');
    const goalCommitment = document.querySelector('input[name="goalCommitment"]:checked');
    const confidence = document.querySelector('input[name="confidence"]:checked');
    const stress = document.querySelector('input[name="stress"]:checked');
    const focus = document.querySelector('input[name="focus"]:checked');
    const bounce = document.querySelector('input[name="bounce"]:checked');

    if (!name || !age || !sport || !goal || !challenge || !weeks || !mentalSkill || !goalCommitment || !confidence || !stress || !focus || !bounce) {
        alert("Please fill out every field and tap a number for each question.");
        return;
    }

    const ageNum = parseInt(age, 10);
    if (ageNum < 10 || ageNum > 18) {
        alert("Please enter an age between 10 and 18.");
        return;
    }

    const weeksNum = parseInt(weeks, 10);
    if (weeksNum < 1 || weeksNum > 4) {
        alert("Please choose a plan length between 1 and 4 weeks.");
        return;
    }

    const days = String(weeksNum * 7);

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

    button.disabled = true;
    button.textContent = "Building your plan...";

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
                mentalSkill: mentalSkill.value,
                goalCommitment: goalCommitment.value,
                confidence: confidence.value,
                stress: stress.value,
                focus: focus.value,
                bounce: bounce.value
            })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.message || "Could not save your profile. Please try again.");
            button.disabled = false;
            button.textContent = "Build My Plan! 🎯";
            return;
        }
    } catch (error) {
        alert("Could not save your profile. Please try again.");
        button.disabled = false;
        button.textContent = "Build My Plan! 🎯";
        return;
    }

    window.location.href = "welcome.html";
});
