/**
 * Level data for Lantern Walk.
 *
 * The world is a straight path along +X. The walker starts at x = 0 in the dark
 * and heads for home at x = homeX. A lantern lights the way, but its oil burns
 * down over time; oil flasks along the path top it back up.
 *
 * Adding a level means appending one object to LEVELS.
 *
 * Level shape:
 *   id, name, subtitle  - shown on the loading toast and complete screen
 *   homeX               - world x of the front door
 *   startLight          - lantern fill at the start, 0..1
 *   drainPerSecond      - how fast the lantern burns down
 *   refill              - how much one oil flask gives back, 0..1
 *   pickupRadius        - how close you must be to grab a flask
 *   walkSpeed           - world units per second
 *   oils[]              - { x } positions of oil flasks along the path
 *   reflection          - the sentence shown on the complete screen
 */

const LEVEL_ONE = {
    id: "the-long-walk-home",
    name: "The Long Walk Home",
    subtitle: "Keep your lantern lit and make it home.",
    homeX: 176,
    startLight: 0.9,
    drainPerSecond: 0.05,
    refill: 0.5,
    pickupRadius: 3.2,
    walkSpeed: 7.5,

    oils: [
        { x: 18 },
        { x: 32 },
        { x: 47 },
        { x: 63 },
        { x: 78 },
        { x: 92 },
        { x: 108 },
        { x: 123 },
        { x: 139 },
        { x: 156 }
    ],

    reflection: "Your light ran low more than once, and each time you stopped, refilled, and kept walking. Looking after your own energy is how you go the distance."
};

export const LEVELS = [LEVEL_ONE];

export function getLevel(index) {
    return LEVELS[Math.min(Math.max(index, 0), LEVELS.length - 1)];
}

export function cloneLevel(level) {
    return JSON.parse(JSON.stringify(level));
}
