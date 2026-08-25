const authLink = document.getElementById("authLink");
const authCtas = document.querySelectorAll("[data-auth-cta]");
document.documentElement.classList.add("quest-motion-ready");

async function checkLoginStatus() {
    try {
        const response = await fetch("/api/me");

        if (!response.ok) {
            return;
        }

        // Logged in: every signup call-to-action becomes a shortcut back to
        // the athlete's active quest on the dashboard.
        if (authLink) {
            authLink.textContent = "Dashboard";
            authLink.href = "welcome.html";
        }

        authCtas.forEach(function (cta) {
            cta.textContent = "Continue My Quest →";
            cta.href = "welcome.html";
        });
    } catch (error) {
        // Keep the default Get Started button if the server is unreachable.
    }
}

checkLoginStatus();

(function () {
    const scrollCue = document.querySelector(".scroll-cue");
    const progressFill = document.getElementById("journeyProgressFill");

    function updatePageJourney() {
        const scrolled = window.scrollY > 80;
        if (scrollCue) {
            scrollCue.classList.toggle("is-hidden", scrolled);
        }

        if (progressFill) {
            const scrollable = document.documentElement.scrollHeight - window.innerHeight;
            const progress = scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0;
            progressFill.style.width = progress + "%";
        }
    }

    window.addEventListener("scroll", updatePageJourney, { passive: true });
    window.addEventListener("resize", updatePageJourney);
    updatePageJourney();
})();

(function revealQuestCards() {
    const cards = document.querySelectorAll(".reveal-card");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
        cards.forEach(function (card) {
            card.classList.add("is-revealed");
        });
        return;
    }

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.16 });

    cards.forEach(function (card, index) {
        card.style.transitionDelay = String((index % 4) * 70) + "ms";
        observer.observe(card);
    });
})();
