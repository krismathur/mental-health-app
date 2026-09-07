/**
 * The mental-strength layer: what the game says after a hard moment, and what
 * the player gets for choosing a strong response.
 *
 * Deep Diver's theme is pacing yourself under pressure: the oxygen gauge is a
 * stand-in for stress, and going back up for air is never a failure — it's the
 * skill being taught.
 *
 * Rules the content follows:
 * - Nothing is ever scolded. A "give up" answer gets a warm reframe, not a
 *   penalty, because shaming a kid for a hard moment teaches the wrong thing.
 * - Strong answers pay off inside the gameplay (a real ability), so the lesson
 *   lands as something you *do*, not something you were quizzed on.
 *
 * The ability keys (light / calm / fins / kick) and cause keys (panic / lowair
 * / sting / current) are the engine's; only the words around them change.
 */

const ABILITY_LABELS = {
    light: "Guiding Light — the way to your goal is glowing",
    calm: "Calm Lungs — your air lasts twice as long",
    fins: "Steady Fins — currents and stings can't touch you",
    kick: "Strong Kick — you swim faster"
};

const ABILITY_SECONDS = {
    light: 20,
    calm: 25,
    fins: 20,
    kick: 20
};

const SETBACKS = {
    panic: {
        face: "🛟",
        kicker: "Rescued",
        variants: [
            { title: "Your buddy pulled you up!", text: "You ran out of air down there. The treasure slipped away — but you're safe on the ship. What do you want to do?" },
            { title: "Back on deck — safe.", text: "The air ran out again. That's okay: every diver misjudges a dive sometimes. What's your plan?" },
            { title: "That was a close one!", text: "You pushed deep and the tank hit empty. What now?" }
        ],
        choices: [
            {
                text: "I'm done. Diving is too hard.",
                response: "You can stop any time, and resting is a real choice. But notice: you made it deeper than last trip. The ocean isn't going anywhere."
            },
            {
                text: "I almost had it! So unfair.",
                response: "So close! That sting of 'almost' means you care. The treasure is still exactly where you found it, waiting."
            },
            {
                text: "Next dive, I'll turn back earlier.",
                stat: "awareness",
                points: 9,
                ability: "calm",
                response: "That's real diver wisdom. Going up for air isn't quitting — it's how you get to dive again. Your lungs are calm and slow now."
            },
            {
                text: "I'll breathe, reset, and go again.",
                stat: "composure",
                points: 8,
                ability: "kick",
                response: "Perfect. In for 4, out for 6, then back in the water. A calm body swims faster than a panicked one."
            }
        ]
    },

    lowair: {
        face: "😮‍💨",
        kicker: "Air running low",
        variants: [
            { title: "Your air is getting low.", text: "That tight feeling in your chest? That's your body asking you to decide: push on, or head up? There's no wrong answer — but pick on purpose." },
            { title: "The gauge is dropping.", text: "Low air again. You know this feeling now. What's your call?" }
        ],
        choices: [
            {
                text: "Panic! Swim anywhere!",
                response: "That's the feeling talking — and everyone feels it. Panic burns air twice as fast, though. Try one slow breath first, then pick a direction."
            },
            {
                text: "I'll ignore it and keep going.",
                response: "Brave — but the gauge doesn't care how brave you are. Peek at it every few seconds so the choice stays yours."
            },
            {
                text: "Slow breaths. I'll grab a bubble on my way.",
                stat: "composure",
                points: 9,
                ability: "calm",
                response: "Exactly right. Slow breathing makes the air last — in the game and in real life. Your lungs are calm now: watch the gauge slow down."
            },
            {
                text: "I know my limit. Heading up.",
                stat: "awareness",
                points: 9,
                ability: "light",
                response: "That's the strongest move in diving. Knowing when to turn back IS the skill. The way up is glowing for you."
            }
        ]
    },

    sting: {
        face: "🪼",
        kicker: "Jellyfish sting",
        variants: [
            { title: "Ouch — a jellyfish got you!", text: "It stung, and the treasure slipped out of your hands. What do you do?" },
            { title: "Stung again!", text: "Those jellies drift in patterns. What's your plan?" }
        ],
        choices: [
            {
                text: "This game hates me.",
                response: "It really felt that way. The jelly was just doing its jelly thing though — and now you know its path."
            },
            {
                text: "I always mess up right at the end.",
                response: "One sting isn't 'always'. It's one moment — and the treasure floated right back to where you found it. It's still yours to get."
            },
            {
                text: "I'll watch how it moves, then slip past.",
                stat: "awareness",
                points: 8,
                ability: "fins",
                response: "Smart. Jellies swing back and forth like a clock — wait for the swing, then go. Your fins are steady: nothing can sting you for a bit."
            },
            {
                text: "Shake it off. Back for my treasure.",
                stat: "courage",
                points: 8,
                ability: "kick",
                response: "That's the spirit. A setback stings for a second; giving up stings longer. Kick hard!"
            }
        ]
    },

    current: {
        face: "🌊",
        kicker: "Caught in a current",
        variants: [
            { title: "The current swept you sideways!", text: "It's surging through here in waves. What's your plan?" },
            { title: "Another surge!", text: "The current comes and goes. What do you want to do?" }
        ],
        choices: [
            {
                text: "The ocean is cheating.",
                response: "It sure feels that way. But watch: the current pushes for a few seconds, then rests. It has a rhythm you can learn."
            },
            {
                text: "I'll just avoid this whole area.",
                response: "You can — there's usually another way around. Just know the current rests between surges, if you ever want to try."
            },
            {
                text: "I'll wait for the surge to pass, then swim.",
                stat: "awareness",
                points: 9,
                response: "Great read. Hold steady, count the surge out, then move in the calm. Timing beats muscle down here."
            },
            {
                text: "I can power through this.",
                stat: "courage",
                points: 8,
                ability: "fins",
                response: "Love the fight in that. With steady fins, the current can't budge you — feel the difference calm strength makes."
            }
        ]
    }
};

export function getSetback(cause, timesSeen) {
    const setback = SETBACKS[cause] || SETBACKS.panic;
    const variant = setback.variants[timesSeen % setback.variants.length];

    return {
        face: setback.face,
        kicker: setback.kicker,
        title: variant.title,
        text: variant.text,
        choices: setback.choices
    };
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

    if (runStats.banked >= 1) {
        add("first-haul");
    }
    if (runStats.banked >= runStats.treasureTotal) {
        add("full-hold");
    }
    if (runStats.deepestMeters >= 150) {
        add("deep-hunter");
    }
    if (runStats.banked >= runStats.treasureTotal && runStats.rescues === 0) {
        add("steady-breather");
    }
    if (runStats.banked >= runStats.treasureTotal && runStats.rescues >= 1) {
        add("comeback-diver");
    }

    return earned;
}
