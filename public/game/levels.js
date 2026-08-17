/**
 * Level data for The Impossible Mountain.
 *
 * Adding a new level means appending one object to LEVELS - no engine changes.
 * The world uses pixel-ish units where y grows downward, so the summit has a
 * small y and the starting ledge has a large one.
 *
 * Level shape:
 *   id, name, subtitle   - shown on the loading toast and complete screen
 *   width, height        - world bounds
 *   spawn {x, y}         - where the climber starts (y is the feet)
 *   platforms[]          - { id, x, y, w, h, type, solid }
 *                          y is the TOP surface. type: "rock" | "ice" | "crumble".
 *                          solid:true is a full block you cannot pass through;
 *                          everything else is a jump-through ledge, so a climber
 *                          never bonks their head on the ledge above them.
 *   crystals[]           - { x, y } centre points
 *   checkpoints[]        - { x, y } base of the flag pole
 *   zones[]              - { kind: "wind" | "deadend", x, y, w, h, ... }
 *   goal                 - { x, y, w, h }
 *   route[]              - platform ids of the correct path, used by the
 *                          "Try a different way" hint ability
 *   reflection           - the sentence shown on the level complete screen
 */

const LEVEL_ONE = {
    id: "first-climb",
    name: "First Climb",
    subtitle: "Reach the flag at the summit.",
    width: 1240,
    height: 3120,
    spawn: { x: 120, y: 2960 },
    metersPerUnit: 1 / 20,

    platforms: [
        // ---- Band 1: gentle warm up ----
        { id: "ground", x: 40, y: 2960, w: 460, h: 160, type: "rock", solid: true },
        { id: "p1", x: 557, y: 2870, w: 156, h: 34, type: "rock" },
        { id: "p2", x: 787, y: 2760, w: 156, h: 34, type: "rock" },
        { id: "p3", x: 557, y: 2650, w: 146, h: 34, type: "rock" },
        { id: "p4", x: 317, y: 2545, w: 156, h: 34, type: "rock" },
        { id: "p5", x: 67, y: 2440, w: 176, h: 34, type: "rock" },

        // ---- Band 2: ledges that give way, ice that slides ----
        { id: "p6", x: 327, y: 2335, w: 146, h: 34, type: "rock" },
        { id: "c1", x: 552, y: 2235, w: 136, h: 28, type: "crumble" },
        { id: "p7", x: 787, y: 2140, w: 156, h: 34, type: "rock" },
        { id: "i1", x: 517, y: 2035, w: 246, h: 32, type: "ice" },
        { id: "p8", x: 267, y: 1930, w: 156, h: 34, type: "rock" },
        { id: "c2", x: 77, y: 1830, w: 126, h: 28, type: "crumble" },
        { id: "p9", x: 297, y: 1725, w: 156, h: 34, type: "rock" },
        { id: "i2", x: 542, y: 1620, w: 256, h: 32, type: "ice" },
        { id: "p10", x: 867, y: 1515, w: 166, h: 34, type: "rock" },
        { id: "p11", x: 637, y: 1410, w: 156, h: 34, type: "rock" },
        { id: "p12", x: 397, y: 1305, w: 166, h: 34, type: "rock" },

        // ---- Band 3a: the tempting left path that stops dead ----
        { id: "d1", x: 157, y: 1200, w: 156, h: 34, type: "rock" },
        { id: "d2", x: 37, y: 1095, w: 136, h: 34, type: "rock" },
        { id: "d3", x: 172, y: 990, w: 146, h: 34, type: "rock" },
        // Sheer ice roof: you can stand under it, but there is no way past it.
        { id: "iceWall", x: 20, y: 800, w: 330, h: 60, type: "ice", solid: true },

        // ---- Band 3b: the real path, up through the wind ----
        { id: "r1", x: 657, y: 1200, w: 156, h: 34, type: "rock" },
        { id: "r2", x: 877, y: 1095, w: 166, h: 34, type: "rock" },
        { id: "r3", x: 657, y: 990, w: 146, h: 34, type: "rock" },
        { id: "r4", x: 417, y: 885, w: 156, h: 34, type: "rock" },
        { id: "r5", x: 647, y: 780, w: 146, h: 34, type: "rock" },
        { id: "r6", x: 867, y: 675, w: 156, h: 34, type: "rock" },
        { id: "r7", x: 647, y: 570, w: 146, h: 34, type: "rock" },
        { id: "r8", x: 407, y: 465, w: 156, h: 34, type: "rock" },
        { id: "r9", x: 637, y: 360, w: 156, h: 34, type: "rock" },
        { id: "summit", x: 830, y: 255, w: 380, h: 200, type: "rock", solid: true }
    ],

    crystals: [
        { x: 635, y: 2820 },
        { x: 865, y: 2710 },
        { x: 630, y: 2600 },
        { x: 395, y: 2495 },
        { x: 155, y: 2390 },
        { x: 620, y: 2185 },
        { x: 640, y: 1985 },
        { x: 140, y: 1780 },
        { x: 670, y: 1570 },
        { x: 950, y: 1465 },
        { x: 245, y: 940 },
        { x: 735, y: 1150 },
        { x: 495, y: 835 },
        { x: 720, y: 730 },
        { x: 485, y: 415 }
    ],

    checkpoints: [
        { x: 130, y: 2440 },
        { x: 355, y: 1725 },
        { x: 460, y: 1305 },
        { x: 470, y: 885 }
    ],

    zones: [
        {
            kind: "deadend",
            x: 30, y: 930, w: 300, h: 70,
            message: "Dead end! Climb back down and try the other side."
        },
        {
            // Gusts sweep the summit face, so timing your jumps matters up here.
            kind: "wind",
            x: 360, y: 240, w: 760, h: 660,
            direction: -1,
            strength: 540,
            period: 5.4,
            activeFor: 2.4
        }
    ],

    goal: { x: 950, y: 145, w: 110, h: 110 },

    route: ["p12", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "summit"],

    reflection: "Today you learned that getting stuck doesn't mean you should stop. Every fall taught you something the easy path never could."
};

export const LEVELS = [LEVEL_ONE];

export function getLevel(index) {
    return LEVELS[Math.min(Math.max(index, 0), LEVELS.length - 1)];
}

/** Deep copy so a restart never inherits crumbled ledges or taken crystals. */
export function cloneLevel(level) {
    return JSON.parse(JSON.stringify(level));
}
