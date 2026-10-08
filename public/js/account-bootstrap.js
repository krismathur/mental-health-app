(async function () {
    "use strict";
    const protectedPage = /\/(welcome|onboarding|meditation|mental-training|daily-session)\.html$|\/(game|deep-diver)\//.test(location.pathname);
    const clearSessionFlags = function () {
        ["mindzone_after_login", "mindzone_record_login_gem", "mindzone_login_handled", "mindzone_pending_weekly_reflection", "mindzone_dev_mode"].forEach(function (key) { sessionStorage.removeItem(key); });
    };
    try {
        const response = await fetch("/api/me", { cache: "no-store" });
        if (!response.ok && response.status !== 401) { throw new Error("Session check failed"); }
        const user = response.ok ? await response.json() : null;
        window.MindZoneStorage.bind(user && user.id);
        if (!user && protectedPage) { location.replace("/auth.html"); return; }
        // Old, unscoped history is preserved but never assigned to the next child.
        window.MindZoneSession = {
            end: function () {
                window.MindZoneStorage.bind(null);
                clearSessionFlags();
                localStorage.setItem("mindzone_session_changed", String(Date.now()));
            }
        };
        const checkSession = async function () {
            try {
                const next = await fetch("/api/me", { cache: "no-store" });
                const identity = next.ok ? await next.json() : null;
                if (String(identity && identity.id || "") !== String(window.MindZoneStorage.account() || "")) {
                    window.MindZoneStorage.bind(null);
                    clearSessionFlags();
                    location.reload();
                }
            } catch (error) { window.MindZoneStorage.bind(null); location.reload(); }
        };
        window.addEventListener("focus", checkSession);
        window.addEventListener("storage", function (event) { if (event.key === "mindzone_session_changed") { window.MindZoneStorage.bind(null); clearSessionFlags(); location.reload(); } });
        for (const source of document.querySelectorAll("script[data-account-src]")) {
            await new Promise(function (resolve, reject) {
                const script = document.createElement("script");
                if (source.type === "module") { script.type = "module"; }
                script.src = source.getAttribute("data-account-src");
                script.onload = resolve;
                script.onerror = reject;
                document.body.appendChild(script);
            });
        }
    } catch (error) {
        window.MindZoneStorage.bind(null);
        const message = document.createElement("p");
        message.textContent = "We could not open your session. Please reload and try again.";
        document.body.prepend(message);
    }
})();
