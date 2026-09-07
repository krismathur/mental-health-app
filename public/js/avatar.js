const AVATAR_STORAGE_KEY = "selectedAthleteAvatar";
const avatarProfileArea = document.getElementById("avatarProfileArea");

function buildEmptyState() {
    const wrap = document.createElement("div");
    wrap.className = "avatar-empty-state";

    const icon = document.createElement("span");
    icon.className = "avatar-empty-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "\uD83E\uDEAA";
    wrap.appendChild(icon);

    const league = document.createElement("p");
    league.className = "avatar-profile-league";
    league.textContent = "CAPTAIN SLOT OPEN";
    wrap.appendChild(league);

    const heading = document.createElement("h3");
    heading.textContent = "Choose the athlete who inspires you";
    wrap.appendChild(heading);

    const blurb = document.createElement("p");
    blurb.textContent = "Your captain will appear here and join you in the Mental Choice Challenge.";
    wrap.appendChild(blurb);

    const cta = document.createElement("a");
    cta.className = "avatar-choose-captain-btn";
    cta.href = "#";
    cta.dataset.openStudio = "";
    cta.textContent = "Customise Athletes";
    wrap.appendChild(cta);

    return wrap;
}

function buildProfileCard(character) {
    const card = document.createElement("div");
    card.className = "avatar-profile-card";

    const img = document.createElement("img");
    img.src = character.image;
    img.alt = character.alt || character.name;
    card.appendChild(img);

    const league = document.createElement("p");
    league.className = "avatar-profile-league";
    league.textContent = character.league;
    card.appendChild(league);

    const name = document.createElement("h3");
    name.className = "avatar-profile-name";
    name.textContent = character.name;
    card.appendChild(name);

    const tagline = document.createElement("p");
    tagline.className = "avatar-profile-tagline";
    tagline.textContent = "You're going to make the best decisions for this athlete";
    card.appendChild(tagline);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "avatar-choose-captain-btn";
    button.dataset.openStudio = "";
    button.textContent = "Customise Athletes";
    card.appendChild(button);

    return card;
}

// Resolves the saved pick against roster.js so a stale or hand-edited
// localStorage entry can never put an arbitrary path or string into the DOM.
function resolveSavedCharacter() {
    let saved = null;

    try {
        saved = JSON.parse(localStorage.getItem(AVATAR_STORAGE_KEY) || "null");
    } catch (error) {
        return null;
    }

    if (!saved || !window.MindZoneRoster) {
        return null;
    }

    if (saved.id) {
        return window.MindZoneRoster.byId(saved.id);
    }

    return window.MindZoneRoster.CHARACTERS.find(function (character) {
        return character.name === saved.name;
    }) || null;
}

function loadSelectedAvatar() {
    if (!avatarProfileArea) {
        return false;
    }

    const character = resolveSavedCharacter();

    avatarProfileArea.textContent = "";
    avatarProfileArea.appendChild(character ? buildProfileCard(character) : buildEmptyState());

    return Boolean(character);
}

const hasSelectedAvatar = loadSelectedAvatar();
const refreshSelectedAvatar = loadSelectedAvatar;
window.loadSelectedAvatar = function () {
    const hasAvatar = refreshSelectedAvatar();
    if (startMentalTrainingBtn) {
        startMentalTrainingBtn.hidden = !hasAvatar;
    }
    return hasAvatar;
};

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
