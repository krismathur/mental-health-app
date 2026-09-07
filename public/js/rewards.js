const rewardsOverlay = document.getElementById("rewardsOverlay");
const rewardsBackdrop = document.getElementById("rewardsBackdrop");
const closeRewardsBtn = document.getElementById("closeRewardsBtn");
const rewardCards = document.querySelectorAll(".reward-card");
const rewardDetails = document.getElementById("rewardDetails");
const GEMSTONE_STORAGE_KEY = "mindzone_login_gemstones";
const GEMSTONE_DISPLAY_COUNT = 10;
// Each streak day awards a different stone, so the grid reads as a growing
// collection rather than ten copies of the same gem.
// Outline of each gem cut in a 64x64 box: the girdle (outer edge) and the
// table (flat top face). The facets between the two are generated from these
// points, which is what makes the stones read as cut gems rather than flat
// polygons.
const GEM_CUTS = {
    brilliant: {
        outer: [[32, 3], [53, 11], [61, 32], [53, 53], [32, 61], [11, 53], [3, 32], [11, 11]],
        table: [[32, 19], [43, 24], [47, 32], [43, 40], [32, 45], [21, 40], [17, 32], [21, 24]]
    },
    step: {
        outer: [[21, 5], [43, 5], [59, 21], [59, 43], [43, 59], [21, 59], [5, 43], [5, 21]],
        table: [[25, 19], [39, 19], [45, 25], [45, 39], [39, 45], [25, 45], [19, 39], [19, 25]]
    },
    trillion: {
        outer: [[32, 4], [60, 54], [4, 54]],
        table: [[32, 22], [45, 44], [19, 44]]
    },
    rhombus: {
        outer: [[32, 2], [58, 32], [32, 62], [6, 32]],
        table: [[32, 18], [45, 32], [32, 46], [19, 32]]
    },
    hexagon: {
        outer: [[32, 3], [57, 18], [57, 46], [32, 61], [7, 46], [7, 18]],
        table: [[32, 18], [45, 26], [45, 39], [32, 47], [19, 39], [19, 26]]
    }
};

// Each stone gets its own cut and palette so the ten days read as a real
// collection. light = table, mid/dark = alternating crown facets.
const GEMSTONE_TYPES = [
    { name: "Quartz", cut: "hexagon", light: "#ffffff", mid: "#e2e8f0", dark: "#a0aec0" },
    { name: "Amethyst", cut: "rhombus", light: "#e9d8fd", mid: "#9f7aea", dark: "#553c9a" },
    { name: "Sapphire", cut: "brilliant", light: "#bee3f8", mid: "#4299e1", dark: "#2a4365" },
    { name: "Emerald", cut: "step", light: "#c6f6d5", mid: "#38a169", dark: "#1c4532" },
    { name: "Citrine", cut: "trillion", light: "#fefcbf", mid: "#ecc94b", dark: "#975a16" },
    { name: "Ruby", cut: "rhombus", light: "#fed7d7", mid: "#e53e3e", dark: "#742a2a" },
    { name: "Topaz", cut: "brilliant", light: "#feebc8", mid: "#ed8936", dark: "#9c4221" },
    { name: "Jade", cut: "hexagon", light: "#b2f5ea", mid: "#38b2ac", dark: "#234e52" },
    { name: "Onyx", cut: "step", light: "#a0aec0", mid: "#2d3748", dark: "#000000" },
    { name: "Diamond", cut: "brilliant", light: "#ffffff", mid: "#bee3f8", dark: "#7f9cf5" }
];

const GEM_LOCKED_PALETTE = { light: "#cbd5e0", mid: "#a0aec0", dark: "#718096" };

function pointsToAttr(points) {
    return points.map(function (point) {
        return point[0] + "," + point[1];
    }).join(" ");
}

// Builds the gem as real geometry: girdle, alternating crown facets cut from
// the girdle down to the table, then the table itself and a shine streak.
function buildGemSvg(gem, earned) {
    const cut = GEM_CUTS[gem.cut] || GEM_CUTS.brilliant;
    const palette = earned ? gem : GEM_LOCKED_PALETTE;
    const sides = cut.outer.length;
    let facets = "";

    for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        const quad = [cut.outer[i], cut.outer[next], cut.table[next], cut.table[i]];
        facets += '<polygon points="' + pointsToAttr(quad) + '" fill="'
            + (i % 2 === 0 ? palette.mid : palette.dark) + '"/>';
    }

    return '<svg class="gemstone-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">'
        + '<polygon points="' + pointsToAttr(cut.outer) + '" fill="' + palette.dark + '"/>'
        + facets
        + '<polygon points="' + pointsToAttr(cut.table) + '" fill="' + palette.light + '"/>'
        + '<polygon points="' + pointsToAttr(cut.table) + '" fill="none" stroke="'
        + palette.light + '" stroke-width="1.5" stroke-linejoin="round" opacity="0.7"/>'
        + '</svg>';
}

const BADGE_THEMES = [
    { key: "focus", label: "Focus", icon: "🎯" },
    { key: "calm", label: "Calm", icon: "🌊" },
    { key: "confidence", label: "Confidence", icon: "💪" },
    { key: "bounceback", label: "Bounce-Back", icon: "🔄" }
];
let activeRewardType = "";

// Local calendar date as YYYY-MM-DD. Deliberately not toISOString(), which
// reports UTC and therefore names tomorrow's date during the local evening.
function toLocalDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}

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
        // Logins are recorded with getAppToday()'s LOCAL calendar date, so the
        // walk back has to use local dates too. toISOString() is UTC, which
        // rolled the date forward every evening for anyone west of UTC and
        // made today's login unfindable — the streak read 0 all night.
        const key = toLocalDateKey(cursor);
        if (!dateSet.has(key)) {
            break;
        }

        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}

function initLoginGemstones() {
    if (sessionStorage.getItem("mindzone_record_login_gem") === "1") {
        sessionStorage.removeItem("mindzone_record_login_gem");
        awardLoginGemstone();
    }

    if (rewardDetails) {
        showRewardDetails("streak");
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
    document.dispatchEvent(new CustomEvent("mindzone:rewards-updated", {
        detail: rewards
    }));
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
        showRewardDetails("streak");
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

document.addEventListener("click", function (event) {
    const button = event.target.closest(".rewards-btn");
    if (button) {
        openRewards(event);
    }
});

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
    if (!rewardDetails) {
        return;
    }

    rewardDetails.hidden = false;
    rewardDetails.classList.toggle("streak-details", type === "streak");
    rewardDetails.classList.toggle("badge-details", type === "badges" || !type);
    activeRewardType = type;
    const rewards = getRewards();
    const badgesEarned = Math.min(10, Math.floor(rewards.activityCompletions / 3));
    const badgeProgress = rewards.activityCompletions % 3;

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
        const level = Math.floor(rewards.xp / 100) + 1;
        const xpIntoLevel = rewards.xp % 100;
        rewardDetails.innerHTML = `
            <div class="xp-detail">
                <div class="reward-orb xp-orb">🧠</div>
                <div class="reward-detail-text">
                    <p class="reward-label">Mental Training XP · Level ${level}</p>
                    <h3>Build Your Mental Power</h3>
                    <p class="reward-big-number">${rewards.xp} XP total</p>
                    <p>Complete activities to earn XP for focus, calm, confidence, and bounce-back reps.</p>
                </div>
            </div>
            <div class="mental-meter">
                <div class="mental-meter-fill" data-progress="${xpIntoLevel}"></div>
            </div>
            <p class="reward-progress-text">${xpIntoLevel}/100 XP toward Level ${level + 1}</p>
            <p class="reward-note">${rewards.xp === 0 ? "Finish your first activity to start leveling up." : "Keep training to reach Level " + (level + 1) + "."}</p>
        `;
        animateRewardMeters();
        return;
    }

    if (type === "stars") {
        const gemstoneData = getGemstoneData();
        const streak = getLoginStreak(gemstoneData.loginDates);
        const starProgress = Math.min(5, streak);
        rewardDetails.innerHTML = `
            <div class="stars-detail">
                <div class="reward-orb stars-orb">⭐</div>
                <div class="reward-detail-text">
                    <p class="reward-label">Consistency Stars</p>
                    <h3>Light Up Your Mindset Streak</h3>
                    <p class="reward-big-number">${streak} Day Streak</p>
                    <p>Come back and train on consecutive days to light up your stars.</p>
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
            <p class="reward-note">${streak === 0 ? "Log in and complete an activity today to start a new streak." : "Come back tomorrow to keep your streak alive."}</p>
        `;
        animateRewardMeters();
        return;
    }

    if (type === "mood") {
        rewardDetails.innerHTML = buildMoodDetailsHtml();
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

const MOOD_HISTORY_STORAGE_KEY = "mindzone_mood_history";
const MOOD_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function escapeHtmlForRewards(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function getMoodHistoryEntries() {
    const saved = localStorage.getItem(MOOD_HISTORY_STORAGE_KEY);
    if (!saved) {
        return [];
    }

    try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function getMoodEntryForDate(history, dateString) {
    return history.find(function (entry) {
        return entry && entry.date === dateString;
    }) || null;
}

function getMoodWeekDates() {
    if (window.AppTime && typeof window.AppTime.getWeekDates === "function") {
        return window.AppTime.getWeekDates();
    }

    const today = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        dates.push(day.toISOString().slice(0, 10));
    }
    return dates;
}

function buildMoodDetailsHtml() {
    const history = getMoodHistoryEntries();
    const today = getAppToday();
    const todaysMood = getMoodEntryForDate(history, today);
    const weekDates = getMoodWeekDates();
    const weekEntries = weekDates.map(function (dateString) {
        return { date: dateString, mood: getMoodEntryForDate(history, dateString) };
    });
    const loggedThisWeek = weekEntries.filter(function (entry) {
        return entry.mood;
    });

    let summaryLine = "No check-ins yet this week.";
    if (loggedThisWeek.length) {
        const counts = {};
        loggedThisWeek.forEach(function (entry) {
            const emotion = entry.mood.emotion || "Unknown";
            counts[emotion] = (counts[emotion] || 0) + 1;
        });
        const ranked = Object.keys(counts).sort(function (a, b) {
            return counts[b] - counts[a];
        });
        const topEmotion = ranked[0];
        const topEntry = loggedThisWeek.find(function (entry) {
            return entry.mood.emotion === topEmotion;
        });
        const topEmoji = topEntry && topEntry.mood.emoji ? topEntry.mood.emoji : "";
        summaryLine = `Most common this week: ${topEmoji} ${escapeHtmlForRewards(topEmotion)}`;
    }

    const weekSlotsHtml = weekEntries.map(function (entry) {
        const date = new Date(entry.date + "T12:00:00");
        const label = MOOD_DAY_LABELS[date.getDay()];
        const emoji = entry.mood && entry.mood.emoji ? entry.mood.emoji : "";
        return `
            <div class="mood-slot${entry.mood ? " mood-slot-logged" : ""}">
                <span class="mood-slot-day">${label}</span>
                <span class="mood-slot-emoji" aria-hidden="true">${emoji || "—"}</span>
            </div>
        `;
    }).join("");

    return `
        <div class="badge-summary">
            <div class="color-badge mood-orb">${todaysMood && todaysMood.emoji ? todaysMood.emoji : "🙂"}</div>
            <div>
                <h3>Mood Check-In</h3>
                <p class="reward-big-number">${todaysMood ? escapeHtmlForRewards(todaysMood.emotion) : "Not checked in today"}</p>
                <p>${summaryLine}</p>
            </div>
        </div>

        <div class="mood-week-grid">
            ${weekSlotsHtml}
        </div>

        <p class="reward-note">${todaysMood ? "Nice work checking in today." : "Log today's mood on your dashboard to keep the trend going."}</p>
    `;
}

function makeBadgeGrid(badgesEarned) {
    let badges = "";

    for (let i = 1; i <= 10; i++) {
        const theme = BADGE_THEMES[(i - 1) % BADGE_THEMES.length];
        const earnedClass = i <= badgesEarned ? " earned-badge" : "";
        badges += `<div class="locked-badge${earnedClass}" title="${theme.label} badge"><span class="badge-icon" aria-hidden="true">${theme.icon}</span><span class="badge-corner-number">${i}</span></div>`;
    }

    return badges;
}

function makeGemstoneGrid(gemsEarned) {
    let gemstones = "";

    for (let i = 1; i <= GEMSTONE_DISPLAY_COUNT; i++) {
        const gem = GEMSTONE_TYPES[(i - 1) % GEMSTONE_TYPES.length];
        const earned = i <= gemsEarned;
        const earnedClass = earned ? " earned-gemstone" : "";
        const label = earned
            ? gem.name + " — day " + i
            : "Locked — reach a " + i + " day streak";
        gemstones += `<div class="locked-gemstone${earnedClass}" title="${label}">${buildGemSvg(gem, earned)}<span class="gemstone-name">${earned ? gem.name : "Locked"}</span><span class="badge-corner-number">${i}</span></div>`;
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

    flashRewardsScreen(`+${xpEarned} XP`);

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
