const AVATAR_STORAGE_KEY = "selectedAthleteAvatar";
const avatarProfileArea = document.getElementById("avatarProfileArea");

function loadSelectedAvatar() {
    const saved = JSON.parse(localStorage.getItem(AVATAR_STORAGE_KEY) || "null");
    if (!saved || !saved.name) {
        avatarProfileArea.innerHTML = `
            <div class="avatar-empty-state">
                <span class="avatar-empty-icon" aria-hidden="true">🪪</span>
                <p class="avatar-profile-league">CAPTAIN SLOT OPEN</p>
                <h3>Choose the athlete who inspires you</h3>
                <p>Your captain will appear here and join you in the Mental Choice Challenge.</p>
                <a href="meditation.html?open=choices" class="avatar-choose-captain-btn">Choose My Captain →</a>
            </div>
        `;
        return false;
    }

    avatarProfileArea.innerHTML = `
        <div class="avatar-profile-card">
            <img src="${saved.image}" alt="${saved.alt || saved.name}">
            <p class="avatar-profile-league">${saved.league}</p>
            <h3 class="avatar-profile-name">${saved.name}</h3>
            <p class="avatar-profile-tagline">You're going to make the best decisions for this athlete</p>
        </div>
    `;

    return true;
}

const hasSelectedAvatar = loadSelectedAvatar();

const closeAvatarPageBtn = document.getElementById("closeAvatarPageBtn");
if (closeAvatarPageBtn) {
    closeAvatarPageBtn.addEventListener("click", function () {
        window.location.href = "welcome.html";
    });
}

const startMentalTrainingBtn = document.getElementById("startMentalTrainingBtn");
if (startMentalTrainingBtn) {
    startMentalTrainingBtn.hidden = !hasSelectedAvatar;
    startMentalTrainingBtn.addEventListener("click", function () {
        window.location.href = "mental-training.html";
    });
}
