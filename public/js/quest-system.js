(function () {
    function readNumber(key) {
        return Math.max(0, parseInt(localStorage.getItem(key), 10) || 0);
    }

    function readStreak() {
        try {
            const data = JSON.parse(localStorage.getItem("mindzone_login_gemstones") || "{}");
            const dates = Array.isArray(data.loginDates) ? data.loginDates : [];
            const dateSet = new Set(dates);
            const cursor = new Date();
            let streak = 0;

            // Must match how logins are stored: a LOCAL calendar date.
            // toISOString() is UTC and names tomorrow during the local
            // evening, which silently zeroed the streak every night.
            function localKey(date) {
                return date.getFullYear()
                    + "-" + String(date.getMonth() + 1).padStart(2, "0")
                    + "-" + String(date.getDate()).padStart(2, "0");
            }

            cursor.setHours(0, 0, 0, 0);
            while (dateSet.has(localKey(cursor))) {
                streak += 1;
                cursor.setDate(cursor.getDate() - 1);
            }

            return streak;
        } catch (error) {
            return 0;
        }
    }

    function getPlayerProgress() {
        const xp = readNumber("mindzone_xp");
        const stars = readNumber("mindzone_stars");
        const completions = readNumber("mindzone_activity_completions");
        const level = Math.floor(xp / 100) + 1;

        return {
            xp: xp,
            stars: stars,
            badges: Math.min(10, Math.floor(completions / 3)),
            level: level,
            levelProgress: xp % 100,
            streak: readStreak()
        };
    }

    function buildHud() {
        if (!document.body.classList.contains("quest-app")
            || document.body.classList.contains("quest-no-hud")
            || document.body.classList.contains("user-logged-out")) {
            return;
        }

        const nav = document.querySelector(".site-nav");
        if (!nav || document.querySelector(".mz-player-hud")) {
            return;
        }

        const hud = document.createElement("div");
        hud.className = "mz-player-hud";
        hud.setAttribute("aria-label", "Player progress");

        // Inserted INSIDE the nav pill itself, before the nav buttons, so
        // name/level/XP reads as part of the same bar rather than a
        // separate element. Stars/badges/streak stay reachable via the
        // nav's own Rewards button, keeping this chip compact.
        nav.insertAdjacentElement("afterbegin", hud);
        renderHud();
    }

    function renderHud() {
        const hud = document.querySelector(".mz-player-hud");
        if (!hud) {
            return;
        }

        const player = getPlayerProgress();
        const name = localStorage.getItem("mindzone_name") || "Athlete";

        hud.innerHTML = `
            <a class="mz-hud-player" href="welcome.html" aria-label="Open your quest hub">
                <span class="mz-hud-avatar" aria-hidden="true">🧠</span>
                <span class="mz-hud-copy"><small>Lvl ${player.level}</small><strong>${escapeHtml(name)}</strong></span>
            </a>
            <div class="mz-hud-progress" aria-label="${player.levelProgress} of 100 XP toward the next level" title="${player.levelProgress}/100 XP toward Level ${player.level + 1}">
                <div class="mz-hud-track"><span data-style-width="${player.levelProgress}%"></span></div>
            </div>
        `;

        applyDynamicStyles(hud);
    }

    // The Content-Security-Policy forbids inline style attributes, so dynamic
    // widths, offsets and colours travel as data-* attributes and are applied
    // here through the CSSOM after insertion. Setting element.style from script
    // is not restricted by the policy.
    function applyDynamicStyles(root) {
        if (!root) {
            return;
        }

        root.querySelectorAll("[data-style-width]").forEach(function (element) {
            element.style.width = element.getAttribute("data-style-width");
        });

        root.querySelectorAll("[data-style-left]").forEach(function (element) {
            element.style.left = element.getAttribute("data-style-left");
        });

        root.querySelectorAll("[data-style-background]").forEach(function (element) {
            element.style.background = element.getAttribute("data-style-background");
        });
    }

    function escapeHtml(value) {
        const element = document.createElement("span");
        element.textContent = value;
        return element.innerHTML;
    }

    function wireCoachPrompts() {
        document.addEventListener("click", function (event) {
            const starter = event.target.closest("[data-coach-prompt]");
            if (!starter) {
                return;
            }

            const input = document.getElementById("coachInput");
            if (!input) {
                return;
            }

            input.value = starter.dataset.coachPrompt || starter.textContent.trim();
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.focus();
        });
    }

    buildHud();
    wireCoachPrompts();
    window.addEventListener("storage", renderHud);
    document.addEventListener("mindzone:rewards-updated", renderHud);
    window.MindZoneQuest = {
        ensureHud: buildHud,
        refreshHud: renderHud,
        getPlayerProgress: getPlayerProgress
    };
})();
