const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const forgotForm = document.getElementById("forgotForm");
const forgotLink = document.getElementById("forgotLink");
const backToLogin = document.getElementById("backToLogin");

function showMessage(text, ok) {
    message.textContent = text;
    message.classList.toggle("ok", ok === true);
}

// The link stays hidden unless the server can actually send mail, so nobody is
// offered a reset that would dead-end.
fetch("/api/auth-options")
    .then(function (response) {
        return response.ok ? response.json() : null;
    })
    .then(function (options) {
        if (options && options.passwordResetEnabled && forgotLink) {
            forgotLink.hidden = false;
        }
    })
    .catch(function () {
        // Leaving the link hidden is the right failure here.
    });

function showForgot(show) {
    showMessage("");
    loginForm.classList.toggle("hidden", show);
    forgotForm.classList.toggle("hidden", !show);
}

if (forgotLink) {
    forgotLink.addEventListener("click", function () {
        showForgot(true);
    });
}

if (backToLogin) {
    backToLogin.addEventListener("click", function () {
        showForgot(false);
    });
}

if (forgotForm) {
    forgotForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("forgotEmail").value.trim();

        const response = await fetch("/api/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const result = await response.json();
        showMessage(result.message, response.ok);
    });
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
        sessionStorage.setItem("mindzone_record_login_gem", "1");
        sessionStorage.setItem("mindzone_after_login", "1");
        await sendUserToNextPage();
    } else {
        showMessage(result.message);
    }
});
