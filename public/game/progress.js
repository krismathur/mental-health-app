/**
 * Saved progress for The Impossible Mountain.
 *
 * Kept in localStorage next to the rest of MindZone's client-side progress so
 * the game works whether or not the player is signed in.
 */

const STORAGE_KEY = "mindzone_mountain_progress";
const POINTS_PER_LEVEL = 40;

export const STAT_META = [
    { key: "resilience", label: "Resilience", icon: "💪" },
    { key: "persistence", label: "Persistence", icon: "🔁" },
    { key: "problemSolving", label: "Problem Solving", icon: "🧩" },
    { key: "confidence", label: "Confidence", icon: "⭐" }
];

export const BADGES = [
    { id: "summit-seeker", label: "Summit Seeker", icon: "🏔️", hint: "Reach the top of a mountain" },
    { id: "never-give-up", label: "Never Give Up", icon: "💪", hint: "Finish after three or more setbacks" },
    { id: "problem-solver", label: "Problem Solver", icon: "🧭", hint: "Find the real path after a dead end" },
    { id: "brave-explorer", label: "Brave Explorer", icon: "🔦", hint: "Collect every crystal on a mountain" },
    { id: "steady-climber", label: "Steady Climber", icon: "🧘", hint: "Reach the top without a single big fall" }
];

function emptyProgress() {
    return {
        character: "rio",
        stats: { resilience: 0, persistence: 0, problemSolving: 0, confidence: 0 },
        badges: [],
        crystals: 0,
        climbs: 0,
        bestMeters: 0
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
        progress.crystals = Number.isFinite(parsed.crystals) ? parsed.crystals : 0;
        progress.climbs = Number.isFinite(parsed.climbs) ? parsed.climbs : 0;
        progress.bestMeters = Number.isFinite(parsed.bestMeters) ? parsed.bestMeters : 0;
    } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
    }

    return progress;
}

export function saveProgress(progress) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

/** Stats grow forever; the level number is just a friendly way to show it. */
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
