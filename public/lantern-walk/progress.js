/**
 * Saved progress for Lantern Walk.
 *
 * Kept in localStorage next to the rest of MindZone's client-side progress so
 * the game works whether or not the player is signed in.
 */

const STORAGE_KEY = "mindzone_lantern_progress";
const POINTS_PER_LEVEL = 40;

export const STAT_META = [
    { key: "composure", label: "Composure", icon: "🌙" },
    { key: "selfCare", label: "Self-Care", icon: "🫖" },
    { key: "patience", label: "Patience", icon: "🕯️" },
    { key: "courage", label: "Courage", icon: "⭐" }
];

export const BADGES = [
    { id: "made-it-home", label: "Made It Home", icon: "🏡", hint: "Reach the front door" },
    { id: "never-give-up", label: "Never Give Up", icon: "💪", hint: "Finish after three or more dark moments" },
    { id: "oil-keeper", label: "Oil Keeper", icon: "🫗", hint: "Gather every oil flask" },
    { id: "steady-light", label: "Steady Light", icon: "🕯️", hint: "Get home without the lantern ever guttering out" },
    { id: "night-walker", label: "Night Walker", icon: "🌌", hint: "Complete the walk home" }
];

function emptyProgress() {
    return {
        character: "wren",
        stats: { composure: 0, selfCare: 0, patience: 0, courage: 0 },
        badges: [],
        oils: 0,
        walks: 0
    };
}

export function loadProgress() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const progress = emptyProgress();

    if (!saved) {
        return progress;
    }

    try {
        const parsed = JSON.parse(saved);

        if (typeof parsed.character === "string") {
            progress.character = parsed.character;
        }
        if (Array.isArray(parsed.badges)) {
            progress.badges = parsed.badges.filter(function (id) {
                return typeof id === "string";
            });
        }
        for (const meta of STAT_META) {
            const value = parsed.stats && parsed.stats[meta.key];
            progress.stats[meta.key] = Number.isFinite(value) ? value : 0;
        }
        progress.oils = Number.isFinite(parsed.oils) ? parsed.oils : 0;
        progress.walks = Number.isFinite(parsed.walks) ? parsed.walks : 0;
    } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
    }

    return progress;
}

export function saveProgress(progress) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function statLevel(points) {
    return Math.floor(points / POINTS_PER_LEVEL) + 1;
}

export function statFraction(points) {
    return (points % POINTS_PER_LEVEL) / POINTS_PER_LEVEL;
}

export function getBadge(id) {
    return BADGES.find(function (badge) {
        return badge.id === id;
    });
}
