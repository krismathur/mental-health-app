(function () {
    const OVERLAY_SELECTOR = ".rewards-overlay, .video-overlay, .overlay";

    function isAnyOverlayOpen() {
        return !!document.querySelector(".rewards-overlay:not(.rewards-hidden)")
            || !!document.querySelector(".video-overlay:not(.video-hidden)")
            || !!document.querySelector(".overlay:not(.overlay-hidden)");
    }

    function syncNavForOverlays() {
        document.body.classList.toggle("overlay-open", isAnyOverlayOpen());
    }

    function watchOverlay(element) {
        new MutationObserver(syncNavForOverlays).observe(element, {
            attributes: true,
            attributeFilter: ["class"]
        });
    }

    document.querySelectorAll(OVERLAY_SELECTOR).forEach(watchOverlay);
    syncNavForOverlays();

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async function () {
            await fetch("/api/logout", { method: "POST" });
            window.location.href = "index.html";
        });
    }

    // Tailor the nav to context:
    //  - Home is redundant when you're already on the home page or signed in
    //    (the brand always links home anyway).
    //  - Rewards only makes sense once you're signed in.
    async function applyNavRules() {
        let loggedIn = false;
        try {
            const res = await fetch("/api/me");
            loggedIn = res.ok;
        } catch (err) {
            loggedIn = false;
        }

        const path = window.location.pathname;
        const onHomePage = path === "/" || /\/index\.html$/.test(path);

        document.querySelectorAll(".site-nav .nav-links .nav-btn").forEach(function (btn) {
            const label = btn.textContent.trim();

            if (label === "Home" && (onHomePage || loggedIn)) {
                btn.remove();
            }

            if (btn.classList.contains("rewards-btn") && !loggedIn) {
                btn.remove();
            }
        });
    }

    applyNavRules();
})();
