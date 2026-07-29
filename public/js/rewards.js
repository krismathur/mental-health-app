const rewardsButtons = document.querySelectorAll(".rewards-btn");
const rewardsOverlay = document.getElementById("rewardsOverlay");
const rewardsBackdrop = document.getElementById("rewardsBackdrop");
const closeRewardsBtn = document.getElementById("closeRewardsBtn");
const rewardCards = document.querySelectorAll(".reward-card");
const rewardDetails = document.getElementById("rewardDetails");
const GEMSTONE_STORAGE_KEY = "mindzone_login_gemstones";
const GEMSTONE_DISPLAY_COUNT = 10;
let activeRewardType = "";

function getAppToday() {
    if (window.AppTime && typeof window.AppTime.getToday === "function") {
        return window.AppTime.getToday();
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}

function getGemstoneData() {
    const saved = localStorage.getItem(GEMSTONE_STORAGE_KEY);
    if (!saved) {
        return { loginDates: [] };
    }

    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.loginDates)) {
            return parsed;
        }
    } catch (error) {
        localStorage.removeItem(GEMSTONE_STORAGE_KEY);
    }

    return { loginDates: [] };
}

function saveGemstoneData(data) {
    localStorage.setItem(GEMSTONE_STORAGE_KEY, JSON.stringify(data));
}

function awardLoginGemstone() {
    const data = getGemstoneData();
    const today = getAppToday();

    if (data.loginDates.includes(today)) {
        return false;
    }

    data.loginDates.push(today);
    data.loginDates.sort();
    saveGemstoneData(data);

    if (activeRewardType === "streak") {
        showRewardDetails("streak");
    }

    return true;
}

function getLoginStreak(loginDates) {
    if (!loginDates.length) {
        return 0;
    }

    const dateSet = new Set(loginDates);
    let streak = 0;
    const cursor = new Date();

    cursor.setHours(0, 0, 0, 0);

    while (true) {
        const key = cursor.toISOString().slice(0, 10);
        if (!dateSet.has(key)) {
            break;
        }

        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}

function setupRewardsStreakLink() {
    const rewardsGrid = document.querySelector(".rewards-grid");
    if (!rewardsGrid || document.getElementById("rewardsStreakBtn")) {
        return;
    }

    const streakButton = document.createElement("button");
    streakButton.type = "button";
    streakButton.id = "rewardsStreakBtn";
    streakButton.className = "rewards-streak-btn";
    streakButton.textContent = "Your Streak";
    rewardsGrid.insertAdjacentElement("afterend", streakButton);
    streakButton.addEventListener("click", function () {
        showRewardDetails("streak");
    });
}

function initLoginGemstones() {
    setupRewardsStreakLink();

    if (sessionStorage.getItem("mindzone_record_login_gem") === "1") {
        sessionStorage.removeItem("mindzone_record_login_gem");
        awardLoginGemstone();
    }
}

function getRewards() {
    return {
        xp: parseInt(localStorage.getItem("mindzone_xp"), 10) || 0,
        stars: parseInt(localStorage.getItem("mindzone_stars"), 10) || 0,
        activityCompletions: parseInt(localStorage.getItem("mindzone_activity_completions"), 10) || 0
    };
}

function saveRewards(rewards) {
    localStorage.setItem("mindzone_xp", rewards.xp);
    localStorage.setItem("mindzone_stars", rewards.stars);
    localStorage.setItem("mindzone_activity_completions", rewards.activityCompletions);
}

function resetRewards() {
    saveRewards({
        xp: 0,
        stars: 0,
        activityCompletions: 0
    });
    saveGemstoneData({ loginDates: [] });

    if (activeRewardType) {
        showRewardDetails(activeRewardType);
    }
}

function resetSavedTips() {
    localStorage.setItem("savedFixTips", "[]");
}

function resetAllUserProgress() {
    resetRewards();
    resetSavedTips();
}

function openRewards(event) {
    event.preventDefault();

    if (rewardsOverlay) {
        rewardsOverlay.classList.remove("rewards-hidden");
        return;
    }

    if (typeof window.scrollToDashboardSection === "function") {
        window.scrollToDashboardSection("rewardsSection");
    }
}

function closeRewards() {
    if (rewardsOverlay) {
        rewardsOverlay.classList.add("rewards-hidden");
    }
}

for (const button of rewardsButtons) {
    button.addEventListener("click", openRewards);
}

for (const card of rewardCards) {
    card.addEventListener("click", function () {
        showRewardDetails(card.dataset.reward);
    });
}

if (closeRewardsBtn && rewardsBackdrop) {
    closeRewardsBtn.addEventListener("click", closeRewards);
    rewardsBackdrop.addEventListener("click", closeRewards);
}

function showRewardDetails(type) {
    rewardDetails.hidden = false;
    activeRewardType = type;
    const rewards = getRewards();
    const badgesEarned = Math.min(10, Math.floor(rewards.activityCompletions / 3));
    const badgeProgress = rewards.activityCompletions % 3;
    const xpProgress = Math.min(100, rewards.xp);
    const starProgress = Math.min(5, rewards.stars);

    if (type === "streak") {
        const gemstoneData = getGemstoneData();
        const gemsEarned = gemstoneData.loginDates.length;
        const streak = getLoginStreak(gemstoneData.loginDates);
        const gemsShown = Math.min(GEMSTONE_DISPLAY_COUNT, gemsEarned);

        rewardDetails.innerHTML = `
            <div class="badge-summary">
                <div class="color-badge gemstone-orb">💎</div>
                <div>
                    <h3>Your Streak</h3>
                    <p class="reward-big-number">${streak} Day Streak</p>
                    <p>Log in each day to collect a new gemstone.</p>
                    <p class="badge-progress">${gemsEarned} gemstone${gemsEarned === 1 ? "" : "s"} collected</p>
                </div>
            </div>

            <div class="gemstone-grid badge-grid">
                ${makeGemstoneGrid(gemsShown)}
            </div>
            <p class="reward-note">${gemsEarned >= GEMSTONE_DISPLAY_COUNT ? "You filled all 10 gemstone slots. Keep logging in to grow your streak." : "Each login adds another gemstone below."}</p>
        `;
        return;
    }

    if (type === "xp") {
        rewardDetails.innerHTML = `
            <div class="xp-detail">
                <div class="reward-orb xp-orb">🧠</div>
                <div class="reward-detail-text">
                    <p class="reward-label">Mental Training XP</p>
                    <h3>Build Your Mental Power</h3>
                    <p class="reward-big-number">${rewards.xp} XP</p>
                    <p>Complete activities to earn XP for focus, calm, confidence, and bounce-back reps.</p>
                </div>
            </div>
            <div class="mental-meter">
                <div class="mental-meter-fill" data-progress="${xpProgress}"></div>
            </div>
            <p class="reward-progress-text">${rewards.xp}/100 XP toward your next mental strength level</p>
            <p class="reward-note">Next goal: finish your first activity to start leveling up.</p>
        `;
        animateRewardMeters();
        return;
    }

    if (type === "stars") {
        rewardDetails.innerHTML = `
            <div class="stars-detail">
                <div class="reward-orb stars-orb">⭐</div>
                <div class="reward-detail-text">
                    <p class="reward-label">Consistency Stars</p>
                    <h3>Light Up Your Mindset Streak</h3>
                    <p class="reward-big-number">${rewards.stars} Stars</p>
                    <p>Earn stars by showing up, practicing mental strength, and staying locked in.</p>
                </div>
            </div>
            <div class="star-trail">
                <span>${starProgress >= 1 ? "★" : "☆"}</span>
                <span>${starProgress >= 2 ? "★" : "☆"}</span>
                <span>${starProgress >= 3 ? "★" : "☆"}</span>
                <span>${starProgress >= 4 ? "★" : "☆"}</span>
                <span>${starProgress >= 5 ? "★" : "☆"}</span>
            </div>
            <div class="mental-meter">
                <div class="mental-meter-fill stars-meter-fill" data-progress="${(starProgress / 5) * 100}"></div>
            </div>
            <p class="reward-progress-text">${starProgress}/5 stars toward your next consistency boost</p>
            <p class="reward-note">Complete activities to turn these into bright earned stars.</p>
        `;
        animateRewardMeters();
        return;
    }

    rewardDetails.innerHTML = `
        <div class="badge-summary">
            <div class="color-badge">🏅</div>
            <div>
                <h3>Mental Badges</h3>
                <p class="reward-big-number">${badgesEarned}/10 Badges Earned</p>
                <p>Complete 3 activities to earn your first badge.</p>
                <p class="badge-progress">${badgeProgress}/3 activity completions toward Badge ${Math.min(10, badgesEarned + 1)}</p>
            </div>
        </div>

        <div class="mental-meter">
            <div class="mental-meter-fill badges-meter-fill" data-progress="${(badgeProgress / 3) * 100}"></div>
        </div>

        <div class="badge-grid">
            ${makeBadgeGrid(badgesEarned)}
        </div>
    `;
    animateRewardMeters();
}

function makeBadgeGrid(badgesEarned) {
    let badges = "";

    for (let i = 1; i <= 10; i++) {
        const earnedClass = i <= badgesEarned ? " earned-badge" : "";
        badges += `<div class="locked-badge${earnedClass}"><span class="badge-corner-number">${i}</span></div>`;
    }

    return badges;
}

function makeGemstoneGrid(gemsEarned) {
    let gemstones = "";

    for (let i = 1; i <= GEMSTONE_DISPLAY_COUNT; i++) {
        const earnedClass = i <= gemsEarned ? " earned-gemstone" : "";
        gemstones += `<div class="locked-gemstone${earnedClass}"><span class="badge-corner-number">${i}</span></div>`;
    }

    return gemstones;
}

function flashRewardsScreen(message) {
    const flash = document.createElement("div");
    flash.className = "reward-screen-flash";
    document.body.appendChild(flash);

    const pop = document.createElement("div");
    pop.className = "reward-pop-message";
    pop.textContent = message;
    document.body.appendChild(pop);

    setTimeout(function () {
        flash.remove();
        pop.remove();
    }, 5000);
}

function animateRewardMeters() {
    const meters = rewardDetails.querySelectorAll(".mental-meter-fill");

    for (const meter of meters) {
        const progress = meter.dataset.progress || "0";
        meter.style.width = "0";
        requestAnimationFrame(function () {
            meter.style.width = progress + "%";
        });
    }
}

function addRewardProgress(progress) {
    const rewards = getRewards();
    const xpEarned = progress.xp || 0;
    const starsEarned = progress.stars || 0;
    const completionsEarned = progress.activityCompletions || 0;

    rewards.xp += xpEarned;
    rewards.stars += starsEarned;
    rewards.activityCompletions += completionsEarned;
    saveRewards(rewards);

    flashRewardsScreen(`+${xpEarned} XP  +${starsEarned} Stars`);

    if (activeRewardType) {
        showRewardDetails(activeRewardType);
    }
}

// Future activities can call this after completion.
window.addRewardProgress = addRewardProgress;
window.resetRewards = resetRewards;
window.resetSavedTips = resetSavedTips;
window.resetAllUserProgress = resetAllUserProgress;
window.awardLoginGemstone = awardLoginGemstone;

const PROGRESS_RESET_FLAG = "mindzone_tips_rewards_cleared_2026_07_04_pm";
if (!localStorage.getItem(PROGRESS_RESET_FLAG)) {
    resetAllUserProgress();
    localStorage.setItem(PROGRESS_RESET_FLAG, "1");
}

initLoginGemstones();
