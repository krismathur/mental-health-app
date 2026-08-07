(function () {
    const OVERLAY_SELECTOR = ".rewards-overlay, .video-overlay, .overlay";
    const navLinks = document.querySelector(".site-nav .nav-links");

    function getCurrentPageKey() {
        const path = window.location.pathname;

        if (/\/(welcome|onboarding)\.html$/.test(path)) {
            return "dashboard";
        }

        if (/\/(meditation|avatar|mental-training)\.html$/.test(path)) {
            return "training";
        }

        return "";
    }

    function updateActiveNav() {
        const rewardsOpen = !!document.querySelector(".rewards-overlay:not(.rewards-hidden)");
        const videosOpen = !!document.querySelector(".video-overlay:not(.video-hidden)");
        const activeKey = rewardsOpen ? "rewards" : videosOpen ? "videos" : getCurrentPageKey();

        document.querySelectorAll(".site-nav .nav-btn[data-nav-key]").forEach(function (button) {
            const isActive = button.dataset.navKey === activeKey;
            button.classList.toggle("active", isActive);

            if (isActive) {
                button.setAttribute("aria-current", "page");
            } else {
                button.removeAttribute("aria-current");
            }
        });

        const onHomePage = window.location.pathname === "/" || /\/index\.html$/.test(window.location.pathname);
        const pageBrand = document.querySelector(".page-brand");
        if (pageBrand) {
            pageBrand.classList.toggle("active", onHomePage && !rewardsOpen && !videosOpen);
        }
    }

    function isAnyOverlayOpen() {
        return !!document.querySelector(".rewards-overlay:not(.rewards-hidden)")
            || !!document.querySelector(".video-overlay:not(.video-hidden)")
            || !!document.querySelector(".overlay:not(.overlay-hidden)");
    }

    function syncNavForOverlays() {
        document.body.classList.toggle("overlay-open", isAnyOverlayOpen());
        updateActiveNav();
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

    function ensureSettingsAccess() {
        let settingsButton = document.getElementById("settingsBtn");

        if (!settingsButton) {
            settingsButton = document.createElement("button");
            settingsButton.type = "button";
            settingsButton.id = "settingsBtn";
            settingsButton.className = "settings-gear";
            settingsButton.dataset.sharedSettings = "true";
            settingsButton.setAttribute("aria-label", "Open settings");
            settingsButton.innerHTML = `
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z"></path>
                </svg>
            `;

            const siteNav = document.querySelector(".site-nav");
            if (siteNav) {
                siteNav.insertAdjacentElement("beforebegin", settingsButton);
            }

            settingsButton.addEventListener("click", function () {
                window.location.href = "welcome.html?open=settings";
            });
        }

        settingsButton.hidden = false;
        document.body.classList.add("has-settings");
    }

    function hideSettingsAccess() {
        const settingsButton = document.getElementById("settingsBtn");
        if (settingsButton) {
            settingsButton.hidden = true;
        }
        document.body.classList.remove("has-settings");
    }

    async function applyNavRules() {
        let loggedIn = false;
        try {
            const res = await fetch("/api/me");
            loggedIn = res.ok;
        } catch (err) {
            loggedIn = false;
        }

        if (!navLinks) {
            return;
        }

        document.body.classList.toggle("user-logged-in", loggedIn);
        document.body.classList.toggle("user-logged-out", !loggedIn);

        if (loggedIn) {
            navLinks.innerHTML = `
                <a class="nav-btn" data-nav-key="dashboard" href="welcome.html">Dashboard</a>
                <a class="nav-btn" data-nav-key="training" href="meditation.html">Training</a>
                <button type="button" class="nav-btn video-library-btn" data-nav-key="videos">Videos</button>
                <button type="button" class="nav-btn rewards-btn" data-nav-key="rewards">Rewards</button>
            `;
            ensureSettingsAccess();
        } else {
            const onHomePage = window.location.pathname === "/" || /\/index\.html$/.test(window.location.pathname);
            const onAuthPage = /\/auth\.html$/.test(window.location.pathname);
            navLinks.innerHTML = onHomePage || onAuthPage
                ? `<a class="nav-btn active" href="auth.html">Get Started</a>`
                : `
                    <a class="nav-btn" href="index.html">Home</a>
                    <a class="nav-btn active" href="auth.html">Get Started</a>
                `;
            hideSettingsAccess();
        }

        updateActiveNav();
    }

    applyNavRules();
})();
