const videoLibraryOverlay = document.getElementById("videoLibraryOverlay");
const videoLibraryBackdrop = document.getElementById("videoLibraryBackdrop");
const closeVideoLibraryBtn = document.getElementById("closeVideoLibraryBtn");
const videoPanel = videoLibraryOverlay ? videoLibraryOverlay.querySelector(".video-panel") : null;
const videoItems = videoLibraryOverlay ? videoLibraryOverlay.querySelectorAll(".video-item") : [];
let videoPlayerView = null;
let videoPlayerFrame = null;

function addFilmRoomMission() {
    if (!videoLibraryOverlay || videoLibraryOverlay.querySelector(".film-room-mission")) {
        return;
    }

    const intro = videoLibraryOverlay.querySelector(".video-intro");
    if (!intro) {
        return;
    }

    const mission = document.createElement("div");
    mission.className = "film-room-mission";
    mission.innerHTML = `
        <span aria-hidden="true">🔎</span>
        <p><strong>Scout mission:</strong> Choose one clip and spot one mental move you can try in your sport.</p>
    `;
    intro.insertAdjacentElement("afterend", mission);
}

function getYouTubeVideoId(url) {
    try {
        const parsedUrl = new URL(url, window.location.href);

        if (parsedUrl.hostname.includes("youtu.be")) {
            return parsedUrl.pathname.slice(1).split("/")[0];
        }

        if (parsedUrl.pathname.startsWith("/embed/")) {
            return parsedUrl.pathname.split("/")[2];
        }

        return parsedUrl.searchParams.get("v");
    } catch (error) {
        return null;
    }
}

function buildVideoPlayer() {
    if (!videoPanel || videoPlayerView) {
        return;
    }

    videoPlayerView = document.createElement("section");
    videoPlayerView.className = "video-player-view";
    videoPlayerView.hidden = true;
    videoPlayerView.innerHTML = `
        <div class="video-player-header">
            <button type="button" class="video-player-back">← Back to Videos</button>
            <button type="button" class="video-player-close" aria-label="Close video library">&times;</button>
        </div>
        <div class="video-player-copy">
            <p class="video-kicker">MindZone Video</p>
            <h2 class="video-player-title">Mental Training Video</h2>
        </div>
        <div class="video-player-frame-wrap">
            <iframe
                class="video-player-frame"
                title="MindZone mental training video"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowfullscreen
            ></iframe>
        </div>
    `;

    videoPanel.appendChild(videoPlayerView);
    videoPlayerFrame = videoPlayerView.querySelector(".video-player-frame");

    videoPlayerView.querySelector(".video-player-back").addEventListener("click", closeVideoPlayer);
    videoPlayerView.querySelector(".video-player-close").addEventListener("click", closeVideoLibrary);
}

addFilmRoomMission();

function openVideoPlayer(event) {
    event.preventDefault();

    const videoId = getYouTubeVideoId(event.currentTarget.href);
    if (!videoId) {
        return;
    }

    buildVideoPlayer();

    const titleElement = event.currentTarget.querySelector("h3");
    const playerTitle = videoPlayerView.querySelector(".video-player-title");
    playerTitle.textContent = titleElement ? titleElement.textContent : "Mental Training Video";
    videoPlayerFrame.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId) + "?autoplay=1&rel=0";
    videoPlayerView.hidden = false;
    videoPanel.classList.add("is-playing-video");
    videoPanel.scrollTop = 0;
}

function closeVideoPlayer() {
    if (!videoPlayerView) {
        return;
    }

    videoPlayerView.hidden = true;
    videoPanel.classList.remove("is-playing-video");
    videoPlayerFrame.src = "";
}

function openVideoLibrary(event) {
    event.preventDefault();

    if (videoLibraryOverlay) {
        videoLibraryOverlay.classList.remove("video-hidden");
        return;
    }

    if (typeof window.scrollToDashboardSection === "function") {
        window.scrollToDashboardSection("videoLibrarySection");
        return;
    }

    window.location.href = "welcome.html?open=videos";
}

function closeVideoLibrary() {
    closeVideoPlayer();

    if (videoLibraryOverlay) {
        videoLibraryOverlay.classList.add("video-hidden");
    }
}

document.addEventListener("click", function (event) {
    const button = event.target.closest(".video-library-btn");
    if (button) {
        openVideoLibrary(event);
    }
});

for (const videoItem of videoItems) {
    videoItem.addEventListener("click", openVideoPlayer);
}

if (closeVideoLibraryBtn) {
    closeVideoLibraryBtn.addEventListener("click", closeVideoLibrary);
}

if (videoLibraryBackdrop) {
    videoLibraryBackdrop.addEventListener("click", closeVideoLibrary);
}

document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !videoLibraryOverlay || videoLibraryOverlay.classList.contains("video-hidden")) {
        return;
    }

    if (videoPlayerView && !videoPlayerView.hidden) {
        closeVideoPlayer();
        return;
    }

    closeVideoLibrary();
});

(function openVideoLibraryFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("open") === "videos" && videoLibraryOverlay) {
        videoLibraryOverlay.classList.remove("video-hidden");
    }
})();
