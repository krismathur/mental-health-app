const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

function showMessage(text) {
    message.textContent = text;
}

async function sendUserToNextPage() {
    try {
        const response = await fetch("/api/profile");

        if (response.ok) {
            window.location.href = "welcome.html";
            return;
        }
    } catch (error) {
        // If the profile check fails, send the user through onboarding.
    }

    window.location.href = "onboarding.html";
}

signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;

    const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (response.ok) {
        window.location.href = "onboarding.html";
    } else {
        showMessage(result.message);
    }
});

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const response = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (response.ok) {
        await sendUserToNextPage();
    } else {
        showMessage(result.message);
    }
});
