/**
 * The mental-strength layer for Lantern Walk: what the game says when your
 * lantern gutters out, and what a strong response earns you.
 *
 * The theme is self-care: your light running low isn't a failure, it's a signal
 * to slow down, refill, and be kind to yourself before carrying on.
 *
 * Rules the content follows:
 * - Nothing is ever scolded. A "give up" answer gets a warm reframe, not a
 *   penalty.
 * - Strong answers pay off inside the gameplay (a real ability), so the lesson
 *   lands as something you *do*.
 *
 * Ability keys used by the game: warmGlow (lantern burns slower), brightEyes
 * (oil flasks glow from far off), steadyPace (you walk faster), calm (light
 * starts fuller after this setback).
 */

const ABILITY_LABELS = {
    warmGlow: "Warm Glow — your lantern burns slower",
    brightEyes: "Bright Eyes — oil flasks glow from far off",
    steadyPace: "Steady Pace — you walk a little faster",
    calm: "Deep Breath — your lantern relights fuller"
};

const ABILITY_SECONDS = {
    warmGlow: 18,
    brightEyes: 18,
    steadyPace: 16,
    calm: 0
};

const SETBACKS = {
    dark: {
        face: "🕯️",
        kicker: "Your light got low",
        variants: [
            { title: "Your lantern guttered out!", text: "The path went dark. It happens. What do you want to do?" },
            { title: "The flame died down again!", text: "Running low is part of a long walk. What's your move?" },
            { title: "Darkness closed in!", text: "Your lantern needs you. What now?" }
        ],
        choices: [
            {
                text: "I quit. I can't see anything.",
                response: "Quitting is always allowed, and you can stop any time. But look how far down the path you already walked — that was all you. Want to relight and go again?"
            },
            {
                text: "I'll never make it home.",
                response: "It feels that way in the dark. Home is still there, and so is the next flask of oil. One relight at a time."
            },
            {
                text: "I'll pause and refill before I go on.",
                stat: "selfCare",
                points: 8,
                ability: "warmGlow",
                response: "That's exactly right. Topping up before you're empty is looking after yourself — your lantern burns slower now."
            },
            {
                text: "I'll take a breath and keep my pace steady.",
                stat: "composure",
                points: 8,
                ability: "calm",
                response: "Perfect. Breathe in for 4, out for 6. Calm hands relight a lantern fuller — off you go."
            }
        ]
    },

    lost: {
        face: "🌫️",
        kicker: "Turned around",
        variants: [
            { title: "You lost the path in the mist.", text: "Hard to tell which way is home. What do you do?" }
        ],
        choices: [
            {
                text: "I've gone the wrong way this whole time.",
                response: "Not the whole time — you just drifted a little. Noticing it is how you find the path again."
            },
            {
                text: "I'm too tired to think.",
                response: "Tired is real, and it's okay to rest here a moment. The mist lifts. You don't have to solve it all at once."
            },
            {
                text: "I'll slow down and look for the oil glow.",
                stat: "patience",
                points: 9,
                ability: "brightEyes",
                response: "Smart. When you're unsure, slow down. The flasks will glow for you now — follow the nearest one."
            },
            {
                text: "I've got this. Home is that way.",
                stat: "courage",
                points: 8,
                ability: "steadyPace",
                response: "Love that steadiness. Trust it, keep walking, and let your pace carry you."
            }
        ]
    }
};

/** Encouragement for small dips that don't deserve a whole card. */
const STUMBLES = [
    "Getting low — find some oil!",
    "That's alright. Keep walking.",
    "Your light's flickering — top it up soon.",
    "Steady on. Home is closer than it feels.",
    "Still going. That's what counts."
];

export function getSetback(cause, timesSeen) {
    const setback = SETBACKS[cause] || SETBACKS.dark;
    const variant = setback.variants[timesSeen % setback.variants.length];

    return {
        face: setback.face,
        kicker: setback.kicker,
        title: variant.title,
        text: variant.text,
        choices: setback.choices
    };
}

export function getStumbleLine(index) {
    return STUMBLES[index % STUMBLES.length];
}

export function getAbilityLabel(key) {
    return ABILITY_LABELS[key] || "";
}

export function getAbilitySeconds(key) {
    return ABILITY_SECONDS[key] || 16;
}

/**
 * Which badges this run earned. Checked against what the player already has so
 * the complete screen can celebrate only the new ones.
 */
export function earnedBadges(runStats, owned) {
    const earned = [];

    function add(id) {
        if (!owned.includes(id) && !earned.includes(id)) {
            earned.push(id);
        }
    }

    add("made-it-home");
    add("night-walker");

    if (runStats.setbacks >= 3) {
        add("never-give-up");
    }
    if (runStats.oils >= runStats.oilTotal) {
        add("oil-keeper");
    }
    if (runStats.setbacks === 0) {
        add("steady-light");
    }

    return earned;
}
