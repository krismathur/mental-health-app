const videoLibraryButtons = document.querySelectorAll(".video-library-btn");
const videoLibraryOverlay = document.getElementById("videoLibraryOverlay");
const videoLibraryBackdrop = document.getElementById("videoLibraryBackdrop");
const closeVideoLibraryBtn = document.getElementById("closeVideoLibraryBtn");

function openVideoLibrary(event) {
    event.preventDefault();
    videoLibraryOverlay.classList.remove("video-hidden");
}

function closeVideoLibrary() {
    videoLibraryOverlay.classList.add("video-hidden");
}

for (const button of videoLibraryButtons) {
    button.addEventListener("click", openVideoLibrary);
}

closeVideoLibraryBtn.addEventListener("click", closeVideoLibrary);
videoLibraryBackdrop.addEventListener("click", closeVideoLibrary);
