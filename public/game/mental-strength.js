/**
 * The mental-strength layer: what the game says after a setback, and what the
 * player gets for choosing a strong response.
 *
 * Rules the content follows:
 * - Nothing is ever scolded. A "give up" answer gets a warm reframe, not a
 *   penalty, because shaming a kid for a hard moment teaches the wrong thing.
 * - Strong answers pay off inside the gameplay (a real ability), so the lesson
 *   lands as something you *do*, not something you were quizzed on.
 */

const ABILITY_LABELS = {
    hint: "Path Finder — the next ledges are glowing",
    floaty: "Light Feet — you fall slower",
    grip: "Sticky Boots — ice can't slide you",
    boost: "Spring Step — your jumps go higher"
};

const ABILITY_SECONDS = {
    hint: 20,
    floaty: 20,
    grip: 22,
    boost: 20
};

const SETBACKS = {
    fall: {
        face: "😮",
        kicker: "You fell",
        variants: [
            { title: "You fell!", text: "You were doing great. What do you want to do now?" },
            { title: "Down you go — again!", text: "Falling is part of climbing. What's your move?" },
            { title: "Not this time!", text: "The mountain won that round. What now?" }
        ],
        choices: [
            {
                text: "I quit. This is too hard.",
                response: "Quitting is always allowed, and you can stop any time. But look how far you already climbed — every bit of that was you. Want one more go?"
            },
            {
                text: "This is impossible!",
                response: "It feels impossible right now. That word usually means \"not yet\". Let's find out what happens on the next try."
            },
            {
                text: "I'll try a different way.",
                stat: "problemSolving",
                points: 8,
                ability: "hint",
                response: "That's smart climbing. When one way doesn't work, the path isn't gone — it's just somewhere else. Follow the glow."
            },
            {
                text: "I'll take a breath and go again.",
                stat: "resilience",
                points: 8,
                ability: "floaty",
                response: "Perfect. Breathe in for 4, out for 6, then go. Getting back up quickly is the whole skill."
            }
        ]
    },

    crumble: {
        face: "😳",
        kicker: "The ledge gave way",
        variants: [
            { title: "The ledge crumbled!", text: "That rock wasn't going to hold. What do you do?" },
            { title: "It broke again!", text: "Some ledges just can't be trusted. What's your plan?" }
        ],
        choices: [
            {
                text: "That's so unfair!",
                response: "It really did feel unfair. Now you know those cracked ledges break — that's information the mountain just gave you for free."
            },
            {
                text: "I knew I'd mess it up.",
                response: "The ledge broke, not you. Watch the cracks next time and you'll spot them before they go."
            },
            {
                text: "I'll cross it faster next time.",
                stat: "persistence",
                points: 8,
                ability: "boost",
                response: "Good call — don't stand still on a cracked ledge. Keep moving and it can't drop you."
            },
            {
                text: "I'll look for a sturdier way up.",
                stat: "problemSolving",
                points: 8,
                ability: "hint",
                response: "Nice. Checking the ground before you trust it is what real climbers do."
            }
        ]
    },

    slip: {
        face: "🥶",
        kicker: "Slippery",
        variants: [
            { title: "Whoa — that ice is slick!", text: "Your boots slid right off. What now?" },
            { title: "The ice got you again!", text: "Ice takes practice. What do you want to try?" }
        ],
        choices: [
            {
                text: "I hate this part.",
                response: "Ice is genuinely annoying. The hard parts are also the parts that make you better at this."
            },
            {
                text: "I'm just bad at ice.",
                response: "You're new at ice. That's different from bad at it. Two more tries and your hands will know what to do."
            },
            {
                text: "I'll take smaller, slower steps.",
                stat: "problemSolving",
                points: 8,
                ability: "grip",
                response: "Exactly right. Tap the arrow keys instead of holding them and you'll stay in control."
            },
            {
                text: "I'll keep trying until it clicks.",
                stat: "persistence",
                points: 8,
                ability: "grip",
                response: "That's how ice gets learned — one more try, then one more. Your boots have extra grip now."
            }
        ]
    },

    wind: {
        face: "🌬️",
        kicker: "Gust",
        variants: [
            { title: "The wind pushed you off!", text: "It's gusty up here. What's your plan?" },
            { title: "Another gust!", text: "The wind comes and goes. What do you want to do?" }
        ],
        choices: [
            {
                text: "The game is cheating.",
                response: "It sure feels that way. The gusts do stop though — watch for the quiet moments."
            },
            {
                text: "I give up on this part.",
                response: "You can rest here as long as you like. This section is hard for everyone the first time."
            },
            {
                text: "I'll wait for the wind to stop, then jump.",
                stat: "problemSolving",
                points: 9,
                response: "Great read. Count the gusts: they blow for a few seconds, then go quiet. Jump in the quiet."
            },
            {
                text: "I've got this. Let's go again.",
                stat: "confidence",
                points: 8,
                ability: "boost",
                response: "Love that. Say it out loud before your next jump — your body listens to what you tell it."
            }
        ]
    },

    wrongway: {
        face: "🧭",
        kicker: "Wrong path",
        variants: [
            { title: "This path stops here.", text: "There's no way up from this side. What do you do?" }
        ],
        choices: [
            {
                text: "I wasted all that climbing.",
                response: "Not wasted — you just crossed one wrong path off the list. That's exactly how explorers find the right one."
            },
            {
                text: "I'll never find the real way.",
                response: "There is a way up, and you're one path closer to it. Head back down and look right."
            },
            {
                text: "I'll go back and try the other side.",
                stat: "problemSolving",
                points: 10,
                ability: "hint",
                response: "That's the move. Backing up isn't losing — it's the fastest way forward from here."
            },
            {
                text: "Good to know. Now I've learned something.",
                stat: "confidence",
                points: 10,
                ability: "hint",
                response: "That is a seriously strong way to think. Mistakes are just facts you didn't have yet."
            }
        ]
    }
};

/** Encouragement for the little slips that don't deserve a whole card. */
const STUMBLES = [
    "Nice recovery — keep going!",
    "That's alright. Back up you go.",
    "Shake it off, climber.",
    "Everyone slips there. Try again.",
    "Still moving. That's what counts."
];

export function getSetback(cause, timesSeen) {
    const setback = SETBACKS[cause] || SETBACKS.fall;
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
    return ABILITY_SECONDS[key] || 18;
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

    add("summit-seeker");

    if (runStats.setbacks >= 3) {
        add("never-give-up");
    }
    if (runStats.deadEndFound) {
        add("problem-solver");
    }
    if (runStats.crystals >= runStats.crystalTotal) {
        add("brave-explorer");
    }
    if (runStats.setbacks === 0) {
        add("steady-climber");
    }

    return earned;
}
