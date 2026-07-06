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
})();
