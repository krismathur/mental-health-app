/*
 * The second half of the password reset flow.
 *
 * The token arrives in the query string and is never written anywhere: not to
 * localStorage, not into a form action. It goes straight into one POST body.
 */
(function () {
    "use strict";

    const form = document.getElementById("resetForm");
    const message = document.getElementById("message");
    const token = new URLSearchParams(window.location.search).get("token") || "";

    function showMessage(text, ok) {
        message.textContent = text;
        message.classList.toggle("ok", ok === true);
    }

    if (!token) {
        form.hidden = true;
        showMessage("That link is missing its reset code. Please request a new one.");
        return;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const password = document.getElementById("newPassword").value;
        const confirm = document.getElementById("confirmPassword").value;

        // Checked here as well as on the server so a typo costs a keystroke
        // rather than a whole new email round trip.
        if (password !== confirm) {
            return showMessage("Those two passwords don't match.");
        }

        const response = await fetch("/api/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password })
        });

        const result = await response.json();

        if (!response.ok) {
            return showMessage(result.message);
        }

        form.hidden = true;
        showMessage(result.message, true);

        // The reset logged out every session for this account, including any
        // the attacker had. Send them to a clean login.
        setTimeout(function () {
            window.location.href = "auth.html";
        }, 2000);
    });
}());
