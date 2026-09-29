export const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

export const DIFFICULTIES = {
    easy: {
        id: "easy",
        label: "Easy",
        description: "Wide landing spots, gentle wind, and slower crumbling ledges.",
        xpBonus: 0,
        platformWidthScale: 1.28,
        windStrengthScale: 0.65,
        windActiveScale: 0.75,
        tuning: {
            coyoteTime: 0.17,
            jumpBufferTime: 0.2,
            bigFall: 330,
            stumbleFall: 205,
            crumbleDelay: 1.25,
            crumbleRespawn: 2.4
        }
    },
    medium: {
        id: "medium",
        label: "Medium",
        description: "The original climb: balanced jumps, wind, and setbacks.",
        xpBonus: 5,
        platformWidthScale: 1,
        windStrengthScale: 1,
        windActiveScale: 1,
        tuning: {}
    },
    hard: {
        id: "hard",
        label: "Hard",
        description: "Narrow landing spots, fierce wind, and fast-breaking ledges.",
        xpBonus: 15,
        platformWidthScale: 0.8,
        windStrengthScale: 1.55,
        windActiveScale: 1.45,
        tuning: {
            coyoteTime: 0.06,
            jumpBufferTime: 0.08,
            bigFall: 190,
            stumbleFall: 105,
            crumbleDelay: 0.38,
            crumbleRespawn: 5
        }
    }
};

export function normalizeDifficulty(id) {
    return Object.prototype.hasOwnProperty.call(DIFFICULTIES, id) ? id : "medium";
}

export function getDifficulty(id) {
    return DIFFICULTIES[normalizeDifficulty(id)];
}

export function prepareMountainLevel(level, difficultyId) {
    const difficulty = getDifficulty(difficultyId);
    const adjusted = JSON.parse(JSON.stringify(level));

    adjusted.platforms = adjusted.platforms.map(function (platform) {
        if (platform.solid) {
            return platform;
        }

        const center = platform.x + platform.w / 2;
        const width = Math.max(78, Math.round(platform.w * difficulty.platformWidthScale));
        platform.w = width;
        platform.x = Math.max(12, Math.min(adjusted.width - width - 12, Math.round(center - width / 2)));
        return platform;
    });

    adjusted.zones.forEach(function (zone) {
        if (zone.kind !== "wind") {
            return;
        }
        zone.strength = Math.round(zone.strength * difficulty.windStrengthScale);
        zone.activeFor = Math.min(zone.period * 0.82, zone.activeFor * difficulty.windActiveScale);
    });

    return adjusted;
}
