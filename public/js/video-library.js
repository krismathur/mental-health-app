const videoLibraryButtons = document.querySelectorAll(".video-library-btn");
const videoLibraryOverlay = document.getElementById("videoLibraryOverlay");
const videoLibraryBackdrop = document.getElementById("videoLibraryBackdrop");
const closeVideoLibraryBtn = document.getElementById("closeVideoLibraryBtn");

function openVideoLibrary(event) {
    event.preventDefault();

    if (videoLibraryOverlay) {
        videoLibraryOverlay.classList.remove("video-hidden");
        return;
    }

    if (typeof window.scrollToDashboardSection === "function") {
        window.scrollToDashboardSection("videoLibrarySection");
    }
}

function closeVideoLibrary() {
    if (videoLibraryOverlay) {
        videoLibraryOverlay.classList.add("video-hidden");
    }
}

for (const button of videoLibraryButtons) {
    button.addEventListener("click", openVideoLibrary);
}

if (closeVideoLibraryBtn) {
    closeVideoLibraryBtn.addEventListener("click", closeVideoLibrary);
}

if (videoLibraryBackdrop) {
    videoLibraryBackdrop.addEventListener("click", closeVideoLibrary);
}
