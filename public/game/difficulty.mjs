export const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

export const DIFFICULTIES = {
    easy: {
        id: "easy",
        label: "Easy",
        description: "Roomy ledges and gentle gusts. Learn to time your jumps.",
        xpBonus: 0,
        platformWidthScale: 1.06,
        verticalScale: 1.06,
        checkpointEvery: 1,
        windStrengthScale: 0.85,
        windActiveScale: 0.9,
        tuning: {
            coyoteTime: 0.14,
            jumpBufferTime: 0.16,
            bigFall: 330,
            stumbleFall: 205,
            crumbleDelay: 1.0,
            crumbleRespawn: 2.4
        }
    },
    medium: {
        id: "medium",
        label: "Medium",
        description: "Smaller ledges, higher jumps, and gusts halfway up.",
        xpBonus: 5,
        platformWidthScale: 0.88,
        verticalScale: 1.14,
        checkpointEvery: 1,
        windStrengthScale: 1.25,
        windActiveScale: 1.15,
        tuning: {coyoteTime: 0.08, jumpBufferTime: 0.11, crumbleDelay: 0.55}
    },
    hard: {
        id: "hard",
        label: "Hard",
        description: "Precise jumps, strong gusts, quick crumbling, and fewer checkpoints.",
        xpBonus: 15,
        platformWidthScale: 0.72,
        verticalScale: 1.16,
        checkpointEvery: 2,
        windStrengthScale: 1.8,
        windActiveScale: 1.55,
        tuning: {
            coyoteTime: 0.045,
            jumpBufferTime: 0.07,
            bigFall: 190,
            stumbleFall: 105,
            crumbleDelay: 0.28,
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

    if (adjusted.spawn && adjusted.height) {
        const scale = difficulty.verticalScale;
        adjusted.height = Math.round(adjusted.height * scale);
        adjusted.spawn.y = Math.round(adjusted.spawn.y * scale);
        adjusted.platforms.forEach(function (platform) { platform.y = Math.round(platform.y * scale); });
        (adjusted.crystals || []).forEach(function (crystal) { crystal.y = Math.round(crystal.y * scale); });
        adjusted.checkpoints = (adjusted.checkpoints || []).filter(function (_, index) {
            return index % difficulty.checkpointEvery === 0;
        }).map(function (checkpoint) { checkpoint.y = Math.round(checkpoint.y * scale); return checkpoint; });
        if (adjusted.goal) { adjusted.goal.y = Math.round(adjusted.goal.y * scale); }
        // Introduce wind before the summit so timing matters throughout the climb.
        adjusted.zones.push({kind: "wind", x: 40, y: 1500, w: adjusted.width - 80, h: 850,
            direction: 1, strength: 340, period: 5.2, activeFor: 2.2});
        adjusted.zones.forEach(function (zone) { zone.y = Math.round(zone.y * scale); zone.h = Math.round(zone.h * scale); });
    }

    adjusted.zones.forEach(function (zone) {
        if (zone.kind !== "wind") {
            return;
        }
        zone.strength = Math.round(zone.strength * difficulty.windStrengthScale);
        zone.activeFor = Math.min(zone.period * 0.82, zone.activeFor * difficulty.windActiveScale);
    });

    return adjusted;
}
