/*
 * Log in / Sign up tab switching.
 *
 * This lived as an inline <script> plus two onclick attributes in auth.html.
 * Both are pulled out here so the Content-Security-Policy can forbid inline
 * script outright rather than weakening itself with 'unsafe-inline'.
 */
(function () {
    "use strict";

    const signup = document.getElementById("signupForm");
    const login = document.getElementById("loginForm");
    const tabSignup = document.getElementById("tabSignup");
    const tabLogin = document.getElementById("tabLogin");
    const message = document.getElementById("message");
    const cardTitle = document.getElementById("authCardTitle");
    const cardSubtitle = document.getElementById("authCardSubtitle");

    if (!signup || !login || !tabSignup || !tabLogin) {
        return;
    }

    function showTab(tab) {
        if (message) {
            message.textContent = "";
        }

        const wantsSignup = tab === "signup";

        signup.classList.toggle("hidden", !wantsSignup);
        login.classList.toggle("hidden", wantsSignup);

        // Switching tabs leaves the reset form behind, otherwise it stays
        // stacked under whichever tab you land on.
        const forgot = document.getElementById("forgotForm");

        if (forgot) {
            forgot.classList.add("hidden");
        }

        tabSignup.classList.toggle("active", wantsSignup);
        tabLogin.classList.toggle("active", !wantsSignup);

        if (cardTitle) {
            cardTitle.textContent = wantsSignup
                ? "Create your player profile"
                : "Welcome back, athlete";
        }

        if (cardSubtitle) {
            cardSubtitle.textContent = wantsSignup
                ? "Unlock a personalized quest built around your sport."
                : "Log in and continue your active quest.";
        }
    }

    tabSignup.addEventListener("click", function () {
        showTab("signup");
    });

    tabLogin.addEventListener("click", function () {
        showTab("login");
    });

    const params = new URLSearchParams(window.location.search);

    if (params.get("tab") === "signup") {
        showTab("signup");
    }
}());
