/**
 * Saved progress for Deep Diver.
 *
 * Kept in localStorage next to the rest of MindZone's client-side progress so
 * the game works whether or not the player is signed in.
 */

const STORAGE_KEY = "mindzone_diver_progress";
const POINTS_PER_LEVEL = 40;

export const STAT_META = [
    { key: "composure", label: "Composure", icon: "🫧" },
    { key: "endurance", label: "Endurance", icon: "🔁" },
    { key: "awareness", label: "Awareness", icon: "🧭" },
    { key: "courage", label: "Courage", icon: "⭐" }
];

export const BADGES = [
    { id: "first-haul", label: "First Haul", icon: "🪙", hint: "Bank your first treasure" },
    { id: "deep-hunter", label: "Deep Hunter", icon: "💠", hint: "Dive 150 meters down" },
    { id: "full-hold", label: "Full Hold", icon: "🏴‍☠️", hint: "Bank every treasure in one dive" },
    { id: "steady-breather", label: "Steady Breather", icon: "🫧", hint: "Bank everything without ever running out of air" },
    { id: "comeback-diver", label: "Comeback Diver", icon: "🛟", hint: "Get rescued, then still bank every treasure" }
];

function emptyProgress() {
    return {
        character: "coral",
        stats: { composure: 0, endurance: 0, awareness: 0, courage: 0 },
        badges: [],
        crystals: 0,
        dives: 0,
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
        progress.dives = Number.isFinite(parsed.dives) ? parsed.dives : 0;
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
