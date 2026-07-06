const AVATAR_STORAGE_KEY = "selectedAthleteAvatar";
const avatarProfileArea = document.getElementById("avatarProfileArea");

function loadSelectedAvatar() {
    const saved = JSON.parse(localStorage.getItem(AVATAR_STORAGE_KEY) || "null");
    if (!saved || !saved.name) {
        window.location.href = "meditation.html";
        return;
    }

    avatarProfileArea.innerHTML = `
        <div class="avatar-profile-card">
            <img src="${saved.image}" alt="${saved.alt || saved.name}">
            <p class="avatar-profile-league">${saved.league}</p>
            <h3 class="avatar-profile-name">${saved.name}</h3>
            <p class="avatar-profile-tagline">You're going to make the best decisions for this athlete</p>
        </div>
    `;
}

loadSelectedAvatar();

const startMentalTrainingBtn = document.getElementById("startMentalTrainingBtn");
if (startMentalTrainingBtn) {
    startMentalTrainingBtn.addEventListener("click", function () {
        window.location.href = "mental-training.html";
    });
}
