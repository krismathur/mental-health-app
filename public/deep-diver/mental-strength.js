/**
 * The mental-strength layer: what the game says after a setback, and what the
 * player gets for choosing a strong response.
 *
 * Deep Diver's whole theme is staying calm under pressure, so the setbacks are
 * about breath, patience and steadiness rather than force.
 *
 * Rules the content follows:
 * - Nothing is ever scolded. A "give up" answer gets a warm reframe, not a
 *   penalty, because shaming a kid for a hard moment teaches the wrong thing.
 * - Strong answers pay off inside the gameplay (a real ability), so the lesson
 *   lands as something you *do*, not something you were quizzed on.
 *
 * The ability keys (hint / floaty / grip / boost) and cause keys (fall / crumble
 * / slip / wind / wrongway) are the engine's; only the words around them change.
 */

const ABILITY_LABELS = {
    hint: "Guiding Light — the calm path is glowing",
    floaty: "Calm Lungs — you sink slower",
    grip: "Steady Fins — slick kelp can't slide you",
    boost: "Strong Kick — your kicks carry higher"
};

const ABILITY_SECONDS = {
    hint: 20,
    floaty: 22,
    grip: 22,
    boost: 20
};

const SETBACKS = {
    fall: {
        face: "😮‍💨",
        kicker: "Swept back down",
        variants: [
            { title: "The water pulled you back!", text: "You were rising nicely. What do you want to do now?" },
            { title: "Down you drift — again!", text: "Sinking a little is part of diving. What's your move?" },
            { title: "Not this time!", text: "The deep won that round. What now?" }
        ],
        choices: [
            {
                text: "I quit. This is too hard.",
                response: "Quitting is always allowed, and you can stop any time. But look how far you already rose — every kick of that was you. Want one more go?"
            },
            {
                text: "This is impossible!",
                response: "It feels impossible right now. That word usually means \"not yet\". Let's find out what happens on the next kick."
            },
            {
                text: "I'll find a calmer route.",
                stat: "awareness",
                points: 8,
                ability: "hint",
                response: "That's smart diving. When one way pushes back, the calm path isn't gone — it's just somewhere else. Follow the glow."
            },
            {
                text: "I'll take a slow breath and go again.",
                stat: "composure",
                points: 8,
                ability: "floaty",
                response: "Perfect. Breathe in for 4, out for 6, then kick. Staying calm is the whole skill down here."
            }
        ]
    },

    crumble: {
        face: "😳",
        kicker: "The coral broke",
        variants: [
            { title: "The coral gave way!", text: "That ledge was never going to hold. What do you do?" },
            { title: "It crumbled again!", text: "Some coral just can't be trusted. What's your plan?" }
        ],
        choices: [
            {
                text: "That's so unfair!",
                response: "It really did feel unfair. Now you know that pale coral breaks — that's information the sea just gave you for free."
            },
            {
                text: "I knew I'd mess it up.",
                response: "The coral broke, not you. Watch for the cracks next time and you'll spot them before they go."
            },
            {
                text: "I'll push off it quickly next time.",
                stat: "endurance",
                points: 8,
                ability: "boost",
                response: "Good call — don't rest on cracked coral. Keep moving and it can't drop you."
            },
            {
                text: "I'll look for sturdier rock.",
                stat: "awareness",
                points: 8,
                ability: "hint",
                response: "Nice. Testing the ground before you trust it is what calm divers do."
            }
        ]
    },

    slip: {
        face: "🌀",
        kicker: "Slippery kelp",
        variants: [
            { title: "Whoa — that kelp is slick!", text: "Your fins slid right off. What now?" },
            { title: "The kelp got you again!", text: "Slick rock takes practice. What do you want to try?" }
        ],
        choices: [
            {
                text: "I hate this part.",
                response: "Slick kelp is genuinely annoying. The hard parts are also the parts that make you better at this."
            },
            {
                text: "I'm just bad at this.",
                response: "You're new at it. That's different from bad at it. Two more tries and your fins will know what to do."
            },
            {
                text: "I'll take smaller, slower kicks.",
                stat: "awareness",
                points: 8,
                ability: "grip",
                response: "Exactly right. Tap the keys instead of holding them and you'll stay in control."
            },
            {
                text: "I'll keep trying until it clicks.",
                stat: "endurance",
                points: 8,
                ability: "grip",
                response: "That's how slick rock gets learned — one more try, then one more. Your fins have extra grip now."
            }
        ]
    },

    wind: {
        face: "🌊",
        kicker: "Current",
        variants: [
            { title: "The current pushed you off!", text: "It's surging through here. What's your plan?" },
            { title: "Another surge!", text: "The current comes and goes. What do you want to do?" }
        ],
        choices: [
            {
                text: "The game is cheating.",
                response: "It sure feels that way. The current does rest though — watch for the still moments."
            },
            {
                text: "I give up on this part.",
                response: "You can hover here and breathe as long as you like. This stretch is hard for everyone the first time."
            },
            {
                text: "I'll wait for the current to ease, then kick.",
                stat: "awareness",
                points: 9,
                response: "Great read. Count the surges: they push for a few seconds, then go still. Kick in the stillness."
            },
            {
                text: "I've got this. Let's go again.",
                stat: "courage",
                points: 8,
                ability: "boost",
                response: "Love that. Say it before your next kick — calm and sure. Your body listens to what you tell it."
            }
        ]
    },

    wrongway: {
        face: "🧭",
        kicker: "Dead end",
        variants: [
            { title: "This way stops here.", text: "There's no way up from this side. What do you do?" }
        ],
        choices: [
            {
                text: "I wasted all that swimming.",
                response: "Not wasted — you just crossed one wrong way off the list. That's exactly how divers find the right one."
            },
            {
                text: "I'll never find the way up.",
                response: "There is a way up, and you're one route closer to it. Head back down and look to the right."
            },
            {
                text: "I'll go back and try the other side.",
                stat: "awareness",
                points: 10,
                ability: "hint",
                response: "That's the move. Backing up isn't losing — it's the fastest way forward from here."
            },
            {
                text: "Good to know. Now I've learned something.",
                stat: "courage",
                points: 10,
                ability: "hint",
                response: "That is a seriously strong way to think. Mistakes are just facts you didn't have yet."
            }
        ]
    }
};

/** Encouragement for the little dips that don't deserve a whole card. */
const STUMBLES = [
    "Nice recovery — keep rising!",
    "That's alright. Back up you go.",
    "Shake it off, diver.",
    "Everyone dips there. Try again.",
    "Still rising. That's what counts."
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

    add("surfaced");

    if (runStats.setbacks >= 3) {
        add("never-give-up");
    }
    if (runStats.deadEndFound) {
        add("problem-solver");
    }
    if (runStats.crystals >= runStats.crystalTotal) {
        add("breath-collector");
    }
    if (runStats.setbacks === 0) {
        add("calm-diver");
    }

    return earned;
}
