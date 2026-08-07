const authLink = document.getElementById("authLink");
const heroBtn = document.querySelector(".hero-btn");

async function checkLoginStatus() {
    try {
        const response = await fetch("/api/me");

        if (!response.ok) {
            return;
        }

        // Logged in: the single auth item becomes a shortcut to the dashboard,
        // and the hero's "Start Training" call-to-action is no longer needed.
        if (authLink) {
            authLink.textContent = "Dashboard";
            authLink.href = "welcome.html";
        }

        if (heroBtn) {
            heroBtn.remove();
        }
    } catch (error) {
        // Keep the default Get Started button if the server is unreachable.
    }
}

checkLoginStatus();

(function () {
    const scrollCue = document.querySelector(".scroll-cue");
    if (!scrollCue) {
        return;
    }

    function updateScrollCue() {
        const scrolled = window.scrollY > 80;
        scrollCue.classList.toggle("is-hidden", scrolled);
    }

    window.addEventListener("scroll", updateScrollCue, { passive: true });
    updateScrollCue();
})();
