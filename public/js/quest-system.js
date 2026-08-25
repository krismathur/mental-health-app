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

            cursor.setHours(0, 0, 0, 0);
            while (dateSet.has(cursor.toISOString().slice(0, 10))) {
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

        const hud = document.createElement("aside");
        hud.className = "mz-player-hud";
        hud.setAttribute("aria-label", "Player progress");

        const dashboardWelcome = document.querySelector(".quest-dashboard .dashboard-welcome");
        if (dashboardWelcome) {
            dashboardWelcome.insertAdjacentElement("afterend", hud);
        } else {
            nav.insertAdjacentElement("afterend", hud);
        }
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
                <span class="mz-hud-copy"><small>Level ${player.level}</small><strong>${escapeHtml(name)}</strong></span>
            </a>
            <div class="mz-hud-progress" aria-label="${player.levelProgress} of 100 XP toward the next level">
                <span class="mz-hud-progress-label">Next level · ${player.levelProgress}/100 XP</span>
                <div class="mz-hud-track"><span style="width:${player.levelProgress}%"></span></div>
            </div>
            <span class="mz-hud-stat" title="Consistency stars">⭐ ${player.stars}</span>
            <span class="mz-hud-stat mz-hud-stat-badges" title="Mental badges">🏅 ${player.badges}</span>
            <button type="button" class="mz-hud-stat rewards-btn" title="Open your rewards">🔥 ${player.streak}</button>
        `;
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
