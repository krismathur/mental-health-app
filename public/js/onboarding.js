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

button.addEventListener("click", async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const age = document.getElementById("age").value.trim();
    const sport = document.getElementById("sport").value.trim();
    const goal = document.getElementById("goal").value.trim();
    const challenge = document.getElementById("challenge").value.trim();
    const days = document.getElementById("days").value.trim();

    // Read the selected star rating for each question (1–5)
    const confidence = document.querySelector('input[name="confidence"]:checked');
    const stress = document.querySelector('input[name="stress"]:checked');
    const focus = document.querySelector('input[name="focus"]:checked');
    const bounce = document.querySelector('input[name="bounce"]:checked');

    if (!name || !age || !sport || !goal || !challenge || !days || !confidence || !stress || !focus || !bounce) {
        return;
    }

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
    localStorage.setItem("mindzone_confidence", confidence.value);
    localStorage.setItem("mindzone_stress", stress.value);
    localStorage.setItem("mindzone_focus", focus.value);
    localStorage.setItem("mindzone_bounce", bounce.value);
    localStorage.setItem("mindzone_motivation", extra);

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
                confidence: confidence.value,
                stress: stress.value,
                focus: focus.value,
                bounce: bounce.value
            })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.message);
            return;
        }
    } catch (error) {
        alert("Could not save your profile. Please try again.");
        return;
    }

    window.location.href = "welcome.html";
});
