/**
 * World data for Deep Diver.
 *
 * One open ocean, top to bottom. y grows downward: the ship floats at the
 * waterline near y = WATERLINE and the darkest treasure sits near the seabed.
 *
 * World shape:
 *   id, name, subtitle   - shown on the loading toast and complete screen
 *   width, height        - world bounds
 *   waterline            - y of the surface; above it is sky and ship deck
 *   spawn {x, y}         - where the diver starts (just under the ship)
 *   ship                 - { x, y, w, h } the hull, plus bank zone underneath
 *   bankZone             - { x, y, w, h } touch it while carrying to bank
 *   surfaceZone          - { y } above this line oxygen refills fast
 *   rocks[]              - { id, x, y, w, h } solid stone the diver swims around
 *   treasures[]          - { id, x, y, value, name, icon } deeper = worth more
 *   oxygen[]             - { id, x, y } air bubbles, +30 O2, respawn after a bit
 *   jellies[]            - { id, x, y, range, speed, axis } drifting jellyfish
 *   currents[]           - { x, y, w, h, direction, strength, period, activeFor }
 *   metersPerUnit        - world units to meters for the depth readout
 *   reflection           - the sentence shown on the dive complete screen
 */

const OCEAN = {
    id: "treasure-trench",
    name: "Treasure Trench",
    subtitle: "Dive deep, watch your air, bring treasure home.",
    width: 1600,
    height: 3600,
    waterline: 220,
    metersPerUnit: 1 / 20,

    spawn: { x: 880, y: 330 },

    ship: { x: 680, y: 130, w: 400, h: 95 },
    bankZone: { x: 700, y: 210, w: 360, h: 130 },
    surfaceZone: { y: 420 },

    rocks: [
        // ---- Upper shelf: gentle funnels so the first dives feel easy ----
        { id: "shelfL", x: 0, y: 700, w: 480, h: 90 },
        { id: "shelfR", x: 1120, y: 620, w: 480, h: 90 },
        { id: "mid1", x: 640, y: 980, w: 360, h: 80 },

        // ---- Middle maze: overhangs that make you pick a lane ----
        { id: "wallL1", x: 0, y: 1320, w: 380, h: 100 },
        { id: "spineC", x: 600, y: 1280, w: 140, h: 460 },
        { id: "wallR1", x: 1180, y: 1480, w: 420, h: 100 },
        { id: "ledge1", x: 300, y: 1720, w: 420, h: 80 },
        { id: "ledge2", x: 900, y: 1980, w: 460, h: 90 },

        // ---- Deep caves: narrow gaps guarding the big treasure ----
        { id: "caveL", x: 0, y: 2180, w: 560, h: 110 },
        { id: "caveR", x: 860, y: 2420, w: 740, h: 110 },
        { id: "fang1", x: 340, y: 2680, w: 480, h: 100 },
        { id: "fang2", x: 1040, y: 2940, w: 560, h: 100 },
        { id: "bedL", x: 0, y: 3180, w: 520, h: 110 },
        { id: "bedR", x: 1140, y: 3140, w: 460, h: 110 }
    ],

    treasures: [
        { id: "t1", x: 260, y: 900, value: 20, name: "Bronze Coin", icon: "🪙" },
        { id: "t2", x: 1300, y: 1120, value: 25, name: "Silver Goblet", icon: "🏆" },
        { id: "t3", x: 480, y: 1560, value: 35, name: "Pearl", icon: "🫧" },
        { id: "t4", x: 1080, y: 1840, value: 45, name: "Silver Chest", icon: "🧰" },
        { id: "t5", x: 220, y: 2440, value: 60, name: "Golden Crown", icon: "👑" },
        { id: "t6", x: 1340, y: 2760, value: 80, name: "Gem Chest", icon: "💎" },
        { id: "t7", x: 800, y: 3400, value: 120, name: "Crown Jewels", icon: "💠" }
    ],

    oxygen: [
        { id: "o1", x: 620, y: 760 },
        { id: "o2", x: 1180, y: 900 },
        { id: "o3", x: 260, y: 1180 },
        { id: "o4", x: 880, y: 1200 },
        { id: "o5", x: 1420, y: 1340 },
        { id: "o6", x: 180, y: 1580 },
        { id: "o7", x: 820, y: 1620 },
        { id: "o8", x: 500, y: 1920 },
        { id: "o9", x: 1300, y: 2140 },
        { id: "o10", x: 700, y: 2280 },
        { id: "o11", x: 160, y: 2600 },
        { id: "o12", x: 980, y: 2620 },
        { id: "o13", x: 560, y: 2880 },
        { id: "o14", x: 1240, y: 3060 },
        { id: "o15", x: 380, y: 3320 },
        { id: "o16", x: 1000, y: 3380 }
    ],

    jellies: [
        { id: "j1", x: 900, y: 820, range: 140, speed: 0.7, axis: "x" },
        { id: "j2", x: 400, y: 1440, range: 120, speed: 0.9, axis: "y" },
        { id: "j3", x: 1150, y: 1640, range: 170, speed: 0.6, axis: "x" },
        { id: "j4", x: 640, y: 2100, range: 150, speed: 0.8, axis: "x" },
        { id: "j5", x: 300, y: 2820, range: 130, speed: 1.0, axis: "y" },
        { id: "j6", x: 1100, y: 3220, range: 160, speed: 0.7, axis: "x" }
    ],

    currents: [
        {
            x: 0, y: 1120, w: 1600, h: 180,
            direction: 1, strength: 320, period: 6.0, activeFor: 2.6
        },
        {
            x: 0, y: 2300, w: 1600, h: 200,
            direction: -1, strength: 420, period: 5.2, activeFor: 2.4
        }
    ],

    reflection: "Every trip down, you decided how deep to go and when to head back for air. Knowing your limits — and pushing them a little at a time — is what calm confidence feels like."
};

export function getWorld() {
    return OCEAN;
}

/** Deep copy so a restart never inherits taken treasure or popped bubbles. */
export function cloneWorld() {
    return JSON.parse(JSON.stringify(OCEAN));
}
