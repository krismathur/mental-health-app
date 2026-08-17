/**
 * Mental strength model.
 *
 * Nothing here is a quiz. Stats move only in response to what the player
 * actually did in the world: trying again after losing, rerouting when the
 * plan broke, taking the shot with the clock running out, passing to the
 * open teammate. The player never sees a lesson; they see a profile that
 * slowly describes them.
 *
 * No DOM and no Three.js, so this runs under Node for the headless tests.
 */

export const STATS = Object.freeze([
    {
        id: "resilience",
        label: "Resilience",
        blurb: "Getting back up after it goes wrong.",
        low: "Losses stick with you for a while.",
        mid: "You shake off bad plays faster than you used to.",
        high: "A bad start barely registers anymore."
    },
    {
        id: "focus",
        label: "Focus",
        blurb: "Holding your attention when it counts.",
        low: "Noise still pulls your eyes off the target.",
        mid: "You can lock in when the pressure arrives.",
        high: "The crowd goes quiet when you decide it does."
    },
    {
        id: "confidence",
        label: "Confidence",
        blurb: "Trusting the work you put in.",
        low: "You hesitate on the shots you have practiced.",
        mid: "You back yourself in most moments.",
        high: "You want the ball when it matters."
    },
    {
        id: "courage",
        label: "Courage",
        blurb: "Doing it even when it is uncomfortable.",
        low: "You stick to the routes you know.",
        mid: "You will try the harder line if it matters.",
        high: "You step forward before anyone asks you to."
    },
    {
        id: "adaptability",
        label: "Adaptability",
        blurb: "Changing the plan without falling apart.",
        low: "A broken plan throws you off.",
        mid: "You find another way when the first one closes.",
        high: "You treat obstacles as information."
    },
    {
        id: "teamwork",
        label: "Teamwork",
        blurb: "Making the people around you better.",
        low: "You mostly play your own game.",
        mid: "You look up and find the open teammate.",
        high: "The whole team plays better with you on the floor."
    }
]);

/**
 * Behaviours the world can report. Each carries a weight and the short line
 * shown in the pause profile's recent activity list.
 */
export const BEHAVIOURS = Object.freeze({
    retriedAfterLoss: { stat: "resilience", amount: 6, note: "Went again after a loss" },
    finishedAfterSetback: { stat: "resilience", amount: 5, note: "Finished what you started" },
    keptPlayingWhileBehind: { stat: "resilience", amount: 3, note: "Kept working while behind" },
    recoveredFromMissStreak: { stat: "resilience", amount: 4, note: "Broke a cold streak" },

    beatTheClock: { stat: "focus", amount: 5, note: "Delivered before the deadline" },
    ignoredDistraction: { stat: "focus", amount: 4, note: "Played through the noise" },
    cleanDrill: { stat: "focus", amount: 3, note: "Clean shooting drill" },
    steadyUnderShotClock: { stat: "focus", amount: 3, note: "Calm on the shot clock" },

    scoredUnderPressure: { stat: "confidence", amount: 5, note: "Scored with the game on the line" },
    tookTheBigShot: { stat: "confidence", amount: 4, note: "Took the shot nobody else wanted" },
    wonMatch: { stat: "confidence", amount: 5, note: "Won a real game" },
    hitStreak: { stat: "confidence", amount: 3, note: "Strung makes together" },

    exploredNewPlace: { stat: "courage", amount: 3, note: "Found somewhere new" },
    tookRiskyRoute: { stat: "courage", amount: 5, note: "Took the harder route" },
    spokeUpFirst: { stat: "courage", amount: 4, note: "Spoke up first" },
    playedInStorm: { stat: "courage", amount: 3, note: "Played through the weather" },

    reroutedAfterProblem: { stat: "adaptability", amount: 6, note: "Found another way around" },
    switchedTransport: { stat: "adaptability", amount: 3, note: "Changed how you travel" },
    changedTactics: { stat: "adaptability", amount: 4, note: "Changed the plan mid game" },

    helpedFriend: { stat: "teamwork", amount: 6, note: "Helped a friend warm up" },
    passedInsteadOfForcing: { stat: "teamwork", amount: 4, note: "Passed up a bad shot" },
    encouragedTeammate: { stat: "teamwork", amount: 4, note: "Picked a teammate up" },
    sharedTheWin: { stat: "teamwork", amount: 3, note: "Shared the credit" }
});

export const MAX_STAT = 100;

export function createMentalState() {
    const stats = {};
    for (const stat of STATS) stats[stat.id] = 12;
    return {
        stats,
        history: [],
        counters: {}
    };
}

/**
 * Applies a behaviour. Growth slows as a stat gets high, so early progress
 * feels quick and mastery takes real play.
 */
export function recordBehaviour(state, behaviourId, multiplier = 1) {
    const behaviour = BEHAVIOURS[behaviourId];
    if (!behaviour) return null;

    const current = state.stats[behaviour.stat] ?? 0;
    const resistance = 1 - (current / MAX_STAT) * 0.72;
    const gain = Math.max(0.4, behaviour.amount * multiplier * resistance);
    const next = Math.min(MAX_STAT, Math.round((current + gain) * 10) / 10);
    const delta = Math.round((next - current) * 10) / 10;
    state.stats[behaviour.stat] = next;

    state.counters[behaviourId] = (state.counters[behaviourId] || 0) + 1;
    state.history.unshift({ id: behaviourId, stat: behaviour.stat, note: behaviour.note, delta });
    if (state.history.length > 24) state.history.length = 24;

    return { stat: behaviour.stat, note: behaviour.note, delta };
}

/** Overall composure, which quietly makes pressure shots easier. */
export function composure(state) {
    const { focus, confidence, resilience } = state.stats;
    return Math.min(0.92, (focus + confidence + resilience) / (MAX_STAT * 3) * 1.05);
}

export function overallScore(state) {
    const total = STATS.reduce((sum, stat) => sum + (state.stats[stat.id] || 0), 0);
    return Math.round(total / STATS.length);
}

export function statBand(value) {
    if (value < 34) return "low";
    if (value < 68) return "mid";
    return "high";
}

/** The sentence shown on the profile screen for a stat. */
export function describeStat(state, statId) {
    const definition = STATS.find((stat) => stat.id === statId);
    if (!definition) return "";
    return definition[statBand(state.stats[statId] || 0)];
}

/** The strongest and weakest traits, used for the results screen summary. */
export function profileSummary(state) {
    const sorted = [...STATS].sort((a, b) => (state.stats[b.id] || 0) - (state.stats[a.id] || 0));
    return {
        strongest: sorted[0],
        weakest: sorted[sorted.length - 1],
        overall: overallScore(state)
    };
}

export function serialiseMental(state) {
    return { stats: { ...state.stats }, counters: { ...state.counters }, history: state.history.slice(0, 12) };
}

export function deserialiseMental(data) {
    const state = createMentalState();
    if (!data) return state;
    for (const stat of STATS) {
        const value = Number(data.stats?.[stat.id]);
        if (Number.isFinite(value)) state.stats[stat.id] = Math.max(0, Math.min(MAX_STAT, value));
    }
    state.counters = { ...(data.counters || {}) };
    state.history = Array.isArray(data.history) ? data.history.slice(0, 24) : [];
    return state;
}
