export const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

export const DIFFICULTIES = {
    easy: {
        id: "easy",
        label: "Easy",
        description: "More air, gentle currents, and slower jellyfish.",
        xpBonus: 0,
        oxygenIds: null,
        jellySpeedScale: 0.75,
        jellyRangeScale: 0.85,
        currentStrengthScale: 0.7,
        currentActiveScale: 0.75,
        tuning: {
            drainPerSecond: 2.2,
            drainCarrying: 3.2,
            oxygenPickup: 35,
            oxygenRespawn: 14,
            surfaceRefillPerSecond: 36,
            stingOxygen: 8,
            stingInvulnSeconds: 3.2,
            jellyRadius: 30
        }
    },
    medium: {
        id: "medium",
        label: "Medium",
        description: "Less air and quicker jellyfish. Plan your route.",
        xpBonus: 5,
        oxygenIds: ["o1", "o2", "o4", "o6", "o7", "o9", "o10", "o11", "o12", "o14", "o15", "o16"],
        jellySpeedScale: 1,
        jellyRangeScale: 1,
        currentStrengthScale: 1,
        currentActiveScale: 1,
        tuning: {
            drainPerSecond: 3.4,
            drainCarrying: 4.8,
            oxygenPickup: 22,
            oxygenRespawn: 24,
            stingOxygen: 15,
            stingInvulnSeconds: 2.2
        }
    },
    hard: {
        id: "hard",
        label: "Hard",
        description: "Very little air, fast jellyfish, and strong currents.",
        xpBonus: 15,
        oxygenIds: ["o1", "o4", "o7", "o10", "o12", "o14", "o16"],
        jellySpeedScale: 1.55,
        jellyRangeScale: 1.18,
        currentStrengthScale: 1.55,
        currentActiveScale: 1.45,
        tuning: {
            drainPerSecond: 6,
            drainCarrying: 8.2,
            oxygenPickup: 14,
            oxygenRespawn: 38,
            surfaceRefillPerSecond: 22,
            lowOxygen: 24,
            stingOxygen: 25,
            stingInvulnSeconds: 1.2,
            jellyRadius: 40
        }
    }
};

export function normalizeDifficulty(id) {
    return Object.prototype.hasOwnProperty.call(DIFFICULTIES, id) ? id : "medium";
}

export function getDifficulty(id) {
    return DIFFICULTIES[normalizeDifficulty(id)];
}

export function prepareDiveWorld(world, difficultyId) {
    const difficulty = getDifficulty(difficultyId);
    const adjusted = JSON.parse(JSON.stringify(world));

    if (difficulty.oxygenIds) {
        const allowed = new Set(difficulty.oxygenIds);
        adjusted.oxygen = adjusted.oxygen.filter(function (bubble) {
            return allowed.has(bubble.id);
        });
    }

    adjusted.jellies.forEach(function (jelly) {
        jelly.speed *= difficulty.jellySpeedScale;
        jelly.range *= difficulty.jellyRangeScale;
    });

    adjusted.currents.forEach(function (current) {
        current.strength = Math.round(current.strength * difficulty.currentStrengthScale);
        current.activeFor = Math.min(current.period * 0.82, current.activeFor * difficulty.currentActiveScale);
    });

    return adjusted;
}
