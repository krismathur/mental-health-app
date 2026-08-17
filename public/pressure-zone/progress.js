/**
 * Progression, unlocks and the save file.
 *
 * XP comes from finishing things and from exploring, never from spending or
 * from chance. There are no loot boxes, no currency and no randomised
 * rewards: every unlock is listed up front with the exact level it arrives.
 *
 * No DOM and no Three.js, so this runs under Node for the headless tests.
 */
import { createMentalState, deserialiseMental, serialiseMental } from "./mental.js";

export const SAVE_KEY = "city-missions-save-v1";
export const SAVE_VERSION = 1;

/** Level thresholds. Early levels come fast, later ones take real play. */
export const LEVELS = Object.freeze([
    0, 120, 300, 560, 900, 1340, 1900, 2600, 3450, 4500, 5800
]);

export const UNLOCKS = Object.freeze([
    { level: 1, id: "bike", type: "vehicle", label: "BMX", detail: "Parked outside your front door." },
    { level: 2, id: "skateboard", type: "vehicle", label: "Skateboard", detail: "Faster than walking, fits anywhere." },
    { level: 2, id: "outfit-court", type: "outfit", label: "Court kit", detail: "Game day colours." },
    { level: 3, id: "poster-wall", type: "home", label: "Poster wall", detail: "Decorate your room." },
    { level: 3, id: "alley-route", type: "route", label: "Alley shortcut", detail: "Cuts three blocks off the downtown run." },
    { level: 4, id: "outfit-night", type: "outfit", label: "Night kit", detail: "For late sessions." },
    { level: 4, id: "desk-setup", type: "home", label: "Desk setup", detail: "Second monitor for your room." },
    { level: 5, id: "car", type: "vehicle", label: "Hatchback", detail: "Your neighbour lets you drive the block." },
    { level: 6, id: "rooftop", type: "route", label: "Rooftop access", detail: "Best view in the district." },
    { level: 7, id: "trophy-shelf", type: "home", label: "Trophy shelf", detail: "Somewhere to put the Fulton Cup." },
    { level: 8, id: "night-court", type: "event", label: "Night court runs", detail: "Games under the lights." }
]);

export const HOME_UPGRADES = Object.freeze([
    { id: "poster-wall", label: "Poster wall", cost: 0, requires: "poster-wall" },
    { id: "desk-setup", label: "Desk setup", cost: 0, requires: "desk-setup" },
    { id: "trophy-shelf", label: "Trophy shelf", cost: 0, requires: "trophy-shelf" }
]);

export const XP_AWARDS = Object.freeze({
    missionComplete: 90,
    missionBonus: 40,
    matchWin: 120,
    matchPlayed: 45,
    discovery: 35,
    collectible: 20,
    shotMade: 4,
    friendship: 25
});

export function createProgress() {
    return {
        version: SAVE_VERSION,
        appearance: null,
        xp: 0,
        level: 1,
        mental: createMentalState(),
        missions: { completed: [], active: null, choices: {} },
        discovered: [],
        collectibles: [],
        unlocked: ["bike"],
        homeUpgrades: [],
        friendship: { mara: 20, dev: 20, nia: 15 },
        stats: {
            shotsMade: 0,
            shotsTaken: 0,
            matchesPlayed: 0,
            matchesWon: 0,
            distanceTravelled: 0,
            timePlayed: 0
        },
        world: { hour: 8.2, weather: "clear", day: 1 },
        lastPlayed: null
    };
}

export function levelForXp(xp) {
    let level = 1;
    for (let index = 0; index < LEVELS.length; index += 1) {
        if (xp >= LEVELS[index]) level = index + 1;
    }
    return level;
}

export function xpIntoLevel(xp) {
    const level = levelForXp(xp);
    const floor = LEVELS[level - 1] ?? 0;
    const ceiling = LEVELS[level] ?? (floor + 1400);
    return {
        level,
        current: xp - floor,
        needed: ceiling - floor,
        ratio: Math.min(1, (xp - floor) / Math.max(1, ceiling - floor))
    };
}

/**
 * Adds XP and returns everything that changed, so the HUD can show one
 * combined toast instead of a stack of them.
 */
export function awardXp(progress, amount, reason = "") {
    const before = progress.level;
    progress.xp = Math.max(0, Math.round(progress.xp + amount));
    progress.level = levelForXp(progress.xp);

    const newUnlocks = [];
    if (progress.level > before) {
        for (const unlock of UNLOCKS) {
            if (unlock.level <= progress.level && !progress.unlocked.includes(unlock.id)) {
                progress.unlocked.push(unlock.id);
                newUnlocks.push(unlock);
            }
        }
    }
    return { amount, reason, levelUp: progress.level > before, level: progress.level, unlocks: newUnlocks };
}

export function hasUnlock(progress, id) {
    return progress.unlocked.includes(id);
}

export function applyHomeUpgrade(progress, id) {
    const upgrade = HOME_UPGRADES.find((entry) => entry.id === id);
    if (!upgrade) return false;
    if (!hasUnlock(progress, upgrade.requires)) return false;
    if (progress.homeUpgrades.includes(id)) return false;
    progress.homeUpgrades.push(id);
    return true;
}

export function discover(progress, placeId) {
    if (progress.discovered.includes(placeId)) return null;
    progress.discovered.push(placeId);
    return awardXp(progress, XP_AWARDS.discovery, `Discovered ${placeId}`);
}

export function collect(progress, collectibleId) {
    if (progress.collectibles.includes(collectibleId)) return null;
    progress.collectibles.push(collectibleId);
    return awardXp(progress, XP_AWARDS.collectible, "Collectible");
}

export function adjustFriendship(progress, friendId, amount) {
    const current = progress.friendship[friendId] ?? 0;
    progress.friendship[friendId] = Math.max(0, Math.min(100, current + amount));
    return progress.friendship[friendId];
}

export function friendshipBand(value) {
    if (value < 30) return "Getting to know each other";
    if (value < 55) return "Friends";
    if (value < 80) return "Close friends";
    return "Ride or die";
}

export function serialise(progress) {
    return {
        version: SAVE_VERSION,
        appearance: progress.appearance,
        xp: progress.xp,
        level: progress.level,
        mental: serialiseMental(progress.mental),
        missions: progress.missions,
        discovered: progress.discovered,
        collectibles: progress.collectibles,
        unlocked: progress.unlocked,
        homeUpgrades: progress.homeUpgrades,
        friendship: progress.friendship,
        stats: progress.stats,
        world: progress.world,
        lastPlayed: Date.now()
    };
}

export function deserialise(data) {
    const progress = createProgress();
    if (!data || typeof data !== "object") return progress;
    if (data.version !== SAVE_VERSION) return progress;

    progress.appearance = data.appearance ?? null;
    progress.xp = Number.isFinite(data.xp) ? data.xp : 0;
    progress.level = levelForXp(progress.xp);
    progress.mental = deserialiseMental(data.mental);
    progress.missions = {
        completed: Array.isArray(data.missions?.completed) ? data.missions.completed : [],
        active: data.missions?.active ?? null,
        choices: data.missions?.choices ?? {}
    };
    progress.discovered = Array.isArray(data.discovered) ? data.discovered : [];
    progress.collectibles = Array.isArray(data.collectibles) ? data.collectibles : [];
    progress.unlocked = Array.isArray(data.unlocked) && data.unlocked.length ? data.unlocked : ["bike"];
    progress.homeUpgrades = Array.isArray(data.homeUpgrades) ? data.homeUpgrades : [];
    progress.friendship = { ...progress.friendship, ...(data.friendship || {}) };
    progress.stats = { ...progress.stats, ...(data.stats || {}) };
    progress.world = { ...progress.world, ...(data.world || {}) };
    progress.lastPlayed = data.lastPlayed ?? null;
    return progress;
}

/** Storage is injectable so tests can run without a browser. */
export function save(progress, storage = globalThis.localStorage) {
    if (!storage) return false;
    try {
        storage.setItem(SAVE_KEY, JSON.stringify(serialise(progress)));
        return true;
    } catch {
        return false;
    }
}

export function load(storage = globalThis.localStorage) {
    if (!storage) return null;
    try {
        const raw = storage.getItem(SAVE_KEY);
        if (!raw) return null;
        return deserialise(JSON.parse(raw));
    } catch {
        return null;
    }
}

export function clearSave(storage = globalThis.localStorage) {
    if (!storage) return;
    try {
        storage.removeItem(SAVE_KEY);
    } catch {
        // Storage can be blocked; failing to clear is not fatal.
    }
}
