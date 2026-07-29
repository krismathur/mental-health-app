(function () {
    const MOOD_HISTORY_KEY = "mindzone_mood_history";
    const MOOD_STORAGE_KEY = "mindzone_mood_today";

    function clearTodaysMood() {
        const today = window.AppTime.getToday();
        const savedHistory = localStorage.getItem(MOOD_HISTORY_KEY);

        if (savedHistory) {
            try {
                const history = JSON.parse(savedHistory);
                if (Array.isArray(history)) {
                    const filtered = history.filter(function (entry) {
                        return entry.date !== today;
                    });
                    localStorage.setItem(MOOD_HISTORY_KEY, JSON.stringify(filtered));
                }
            } catch (error) {
                localStorage.removeItem(MOOD_HISTORY_KEY);
            }
        }

        const legacyMood = localStorage.getItem(MOOD_STORAGE_KEY);
        if (legacyMood) {
            try {
                const mood = JSON.parse(legacyMood);
                if (mood && mood.date === today) {
                    localStorage.removeItem(MOOD_STORAGE_KEY);
                }
            } catch (error) {
                localStorage.removeItem(MOOD_STORAGE_KEY);
            }
        }
    }

    function renderPanel() {
        if (!window.AppTime || !window.AppTime.isDevMode()) {
            return;
        }

        const offsetDays = window.AppTime.getOffsetDays();
        const simulatedDate = window.AppTime.formatDisplayDate(window.AppTime.getNow());
        const offsetLabel = offsetDays === 0
            ? "Real time (no offset)"
            : "+" + offsetDays + " day" + (offsetDays === 1 ? "" : "s") + " from real time";

        const panel = document.createElement("aside");
        panel.id = "devTimePanel";
        panel.className = "dev-time-panel";
        panel.setAttribute("aria-label", "Developer time controls");
        panel.innerHTML = `
            <p class="dev-time-kicker">Dev Time Tool</p>
            <p class="dev-time-date">${simulatedDate}</p>
            <p class="dev-time-offset">${offsetLabel}</p>
            <div class="dev-time-actions">
                <button type="button" class="dev-time-btn" data-action="plus-day">+1 Day</button>
                <button type="button" class="dev-time-btn" data-action="plus-week">+1 Week</button>
                <button type="button" class="dev-time-btn" data-action="reset">Reset Time</button>
                <button type="button" class="dev-time-btn" data-action="simulate-login">Simulate Login</button>
                <button type="button" class="dev-time-btn dev-time-btn-secondary" data-action="clear-mood">Clear Today's Mood</button>
            </div>
        `;

        document.body.appendChild(panel);

        panel.addEventListener("click", function (event) {
            const button = event.target.closest("[data-action]");
            if (!button) {
                return;
            }

            const action = button.dataset.action;

            if (action === "plus-day") {
                window.AppTime.setOffsetDays(window.AppTime.getOffsetDays() + 1);
                window.location.reload();
                return;
            }

            if (action === "plus-week") {
                window.AppTime.setOffsetDays(window.AppTime.getOffsetDays() + 7);
                window.location.reload();
                return;
            }

            if (action === "reset") {
                window.AppTime.setOffsetDays(0);
                window.location.reload();
                return;
            }

            if (action === "simulate-login") {
                if (typeof window.awardLoginGemstone === "function") {
                    window.awardLoginGemstone();
                }
                return;
            }

            if (action === "clear-mood") {
                clearTodaysMood();
                window.location.reload();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderPanel);
    } else {
        renderPanel();
    }
})();
