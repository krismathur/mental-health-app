/**
 * City layout data.
 *
 * Pure data and pure functions only: no Three.js, no DOM. The geometry
 * builder, the traffic system, the pedestrian system and the headless tests
 * all read from this one description of the district.
 *
 * Units are metres. X runs east, Z runs south, Y is up.
 */

export const CITY = Object.freeze({
    name: "Bayline District",
    minX: -150,
    maxX: 150,
    minZ: -120,
    maxZ: 120,
    roadWidth: 15,
    sidewalkWidth: 4.2,
    curbHeight: 0.16
});

export const SURFACE = Object.freeze({
    ROAD: "road",
    SIDEWALK: "sidewalk",
    GRASS: "grass",
    COURT: "court",
    INTERIOR: "interior",
    DIRT: "dirt"
});

/** Road centrelines. Horizontal roads run along X, vertical along Z. */
export const ROADS = Object.freeze([
    { id: "main", axis: "x", at: 0, from: -150, to: 150, name: "Main Street" },
    { id: "north", axis: "x", at: -72, from: -150, to: 150, name: "North Avenue" },
    { id: "south", axis: "x", at: 72, from: -150, to: 150, name: "South Avenue" },
    { id: "elm", axis: "z", at: -78, from: -120, to: 120, name: "Elm Street" },
    { id: "center", axis: "z", at: 6, from: -120, to: 120, name: "Center Street" },
    { id: "market", axis: "z", at: 84, from: -120, to: 120, name: "Market Street" }
]);

/*
 * Block interiors. The roads sit at x = -78, 6, 84 and z = -72, 0, 72, each
 * 15 m wide with a 4.2 m pavement either side, so every parcel starts 11.7 m
 * back from the centreline it faces. These numbers are derived from that and
 * verified by the layout tests in city-check.mjs.
 */
export const BLOCKS = Object.freeze([
    // Maple Rise: the residential street the player lives on.
    { id: "maple-north", kind: "residential", x: -150, z: -120, w: 60.3, d: 36.3 },
    { id: "maple-main", kind: "residential", x: -150, z: -60.3, w: 60.3, d: 48.6 },
    { id: "maple-south", kind: "residential", x: -150, z: 11.7, w: 60.3, d: 48.6 },

    // Midtown, the park and the strip that connects them.
    { id: "midtown-north", kind: "lowrise", x: -66.3, z: -120, w: 60.6, d: 36.3 },
    { id: "midtown", kind: "midrise", x: -66.3, z: -60.3, w: 60.6, d: 48.6 },
    { id: "park", kind: "park", x: -66.3, z: 11.7, w: 60.6, d: 48.6 },
    { id: "south-strip", kind: "lowrise", x: -66.3, z: 83.7, w: 60.6, d: 36.3 },

    // Downtown and the sports lot.
    { id: "downtown-north", kind: "midrise", x: 17.7, z: -120, w: 54.6, d: 36.3 },
    { id: "downtown", kind: "tower", x: 17.7, z: -60.3, w: 54.6, d: 48.6 },
    { id: "sports", kind: "sports", x: 17.7, z: 11.7, w: 54.6, d: 48.6 },
    { id: "south-strip-east", kind: "lowrise", x: 17.7, z: 83.7, w: 54.6, d: 36.3 },

    // The eastern edge: offices backing onto the rail yard.
    { id: "east-offices", kind: "midrise", x: 95.7, z: -60.3, w: 54.3, d: 48.6 },
    { id: "rail-yard", kind: "industrial", x: 95.7, z: 11.7, w: 54.3, d: 48.6 }
]);

/** Deterministic RNG so the city is identical on every load and every machine. */
export function createRandom(seed) {
    let state = seed >>> 0;
    return function random() {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const pick = (random, list) => list[Math.floor(random() * list.length) % list.length];

const FACADE_PALETTES = {
    tower: [
        { wall: 0x8f9299, accent: 0x5d6169, glass: 0x16242f },
        { wall: 0x7d7a74, accent: 0x585550, glass: 0x1a2830 },
        { wall: 0x9a9186, accent: 0x6b645b, glass: 0x142029 },
        { wall: 0x6f757c, accent: 0x4a4f55, glass: 0x18252e }
    ],
    midrise: [
        { wall: 0xa8735a, accent: 0x7c5443, glass: 0x1b2730 },
        { wall: 0x9c8f7e, accent: 0x6f6152, glass: 0x1b2730 }
    ],
    residential: [
        { wall: 0xc9bda8, accent: 0x8f8676, roof: 0x5a5f66 },
        { wall: 0xb7c3c4, accent: 0x7f8a8c, roof: 0x50565c },
        { wall: 0xd4c6b2, accent: 0x97806a, roof: 0x64564b },
        { wall: 0xa8b0a2, accent: 0x767d71, roof: 0x4f5449 }
    ]
};

/**
 * Lays lots along one edge of a block so buildings front the street the way
 * real ones do, rather than floating in the middle of the parcel.
 */
function layLots(block, side, random, { minWidth, maxWidth, depth, gap }) {
    const lots = [];
    const horizontal = side === "north" || side === "south";
    const runLength = horizontal ? block.w : block.d;
    let cursor = 0;
    while (cursor < runLength - minWidth) {
        const width = Math.min(minWidth + random() * (maxWidth - minWidth), runLength - cursor);
        if (width < minWidth * 0.8) break;
        const centre = cursor + width / 2;
        let x;
        let z;
        let footprintW;
        let footprintD;
        let facing;
        if (side === "north") {
            x = block.x + centre;
            z = block.z + depth / 2;
            footprintW = width - gap;
            footprintD = depth;
            facing = Math.PI;
        } else if (side === "south") {
            x = block.x + centre;
            z = block.z + block.d - depth / 2;
            footprintW = width - gap;
            footprintD = depth;
            facing = 0;
        } else if (side === "west") {
            x = block.x + depth / 2;
            z = block.z + centre;
            footprintW = depth;
            footprintD = width - gap;
            facing = Math.PI / 2;
        } else {
            x = block.x + block.w - depth / 2;
            z = block.z + centre;
            footprintW = depth;
            footprintD = width - gap;
            facing = -Math.PI / 2;
        }
        lots.push({ x, z, w: footprintW, d: footprintD, facing });
        cursor += width;
    }
    return lots;
}

function buildingsForBlock(block, random) {
    const buildings = [];
    if (block.kind === "tower" || block.kind === "midrise") {
        const sides = ["north", "south", "west", "east"];
        for (const side of sides) {
            const lots = layLots(block, side, random, {
                minWidth: block.kind === "tower" ? 15 : 13,
                maxWidth: block.kind === "tower" ? 26 : 20,
                depth: block.kind === "tower" ? 19 : 16,
                gap: 1.4
            });
            for (const lot of lots) {
                const floors = block.kind === "tower"
                    ? 6 + Math.floor(random() * 10)
                    : 3 + Math.floor(random() * 4);
                const palette = pick(random, FACADE_PALETTES.tower);
                buildings.push({
                    ...lot,
                    kind: block.kind,
                    floors,
                    floorHeight: 3.5,
                    height: floors * 3.5,
                    palette,
                    storefront: random() > 0.35,
                    roofStyle: random() > 0.5 ? "mechanical" : "tank",
                    block: block.id
                });
            }
        }
    } else if (block.kind === "residential") {
        for (const side of ["east", "west"]) {
            const lots = layLots(block, side, random, { minWidth: 16, maxWidth: 20, depth: 13, gap: 6 });
            for (const lot of lots) {
                const palette = pick(random, FACADE_PALETTES.residential);
                buildings.push({
                    ...lot,
                    kind: "house",
                    floors: random() > 0.55 ? 2 : 1,
                    floorHeight: 3.1,
                    height: (random() > 0.55 ? 2 : 1) * 3.1,
                    palette,
                    roofStyle: "gable",
                    garage: random() > 0.45,
                    block: block.id
                });
            }
        }
    } else if (block.kind === "lowrise") {
        for (const side of ["north", "south"]) {
            const lots = layLots(block, side, random, { minWidth: 14, maxWidth: 22, depth: 15, gap: 1.6 });
            for (const lot of lots) {
                buildings.push({
                    ...lot,
                    kind: "lowrise",
                    floors: 2,
                    floorHeight: 3.6,
                    height: 7.2,
                    palette: pick(random, FACADE_PALETTES.tower),
                    storefront: true,
                    roofStyle: "flat",
                    block: block.id
                });
            }
        }
    } else if (block.kind === "industrial") {
        const rows = 2;
        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < 2; column += 1) {
                buildings.push({
                    x: block.x + 14 + column * 26,
                    z: block.z + 13 + row * 24,
                    w: 22,
                    d: 18,
                    facing: 0,
                    kind: "warehouse",
                    floors: 1,
                    floorHeight: 9,
                    height: 9,
                    palette: { wall: 0x8b8d86, accent: 0x5f625c, glass: 0x1c262b },
                    roofStyle: "saw",
                    block: block.id
                });
            }
        }
    }
    return buildings;
}

function generateBuildings() {
    const random = createRandom(20260812);
    const all = [];
    for (const block of BLOCKS) {
        for (const building of buildingsForBlock(block, random)) all.push(building);
    }

    // The player lives in a real house in the row rather than a special box
    // dropped somewhere convenient. Pick the street-facing lot nearest the
    // middle of Maple Rise and hollow it out into the bedroom.
    const candidates = all.filter((building) => building.block === "maple-main" && building.facing === -Math.PI / 2);
    const home = candidates.sort((a, b) => Math.abs(a.z + 34) - Math.abs(b.z + 34))[0];
    if (home) {
        home.playerHome = true;
        // Single storey, so the roof sits directly on the bedroom ceiling.
        home.floors = 1;
        home.height = home.floorHeight;
        home.garage = true;
    }
    return all;
}

export const BUILDINGS = Object.freeze(generateBuildings());

const PLAYER_HOME = BUILDINGS.find((building) => building.playerHome)
    || { x: -96, z: -34, w: 13, d: 12 };

/** Named locations used by missions, the compass and the map. */
export const POIS = Object.freeze({
    home: {
        x: PLAYER_HOME.x,
        z: PLAYER_HOME.z,
        w: PLAYER_HOME.w,
        d: PLAYER_HOME.d,
        radius: 5,
        label: "Home",
        indoor: true
    },
    homeDoor: { x: PLAYER_HOME.x + PLAYER_HOME.w / 2 + 3.2, z: PLAYER_HOME.z, radius: 3, label: "Front door" },
    court: { x: 45, z: 36, radius: 16, label: "Fulton Court" },
    park: { x: -36, z: 36, radius: 20, label: "Bayline Park" },
    store: { x: -12, z: -30, radius: 6, label: "Corner Store" },
    plaza: { x: 45, z: -38, radius: 7, label: "Hidden courtyard" },
    lookout: { x: 120, z: -100, radius: 9, label: "Rail Bridge Lookout" },
    alley: { x: -36, z: -36, radius: 6, label: "Alley shortcut" },
    tournament: { x: 45, z: 36, radius: 16, label: "Tournament court" }
});

/** Closed circuits so traffic turns corners instead of vanishing. */
export const TRAFFIC_ROUTES = Object.freeze([
    {
        id: "inner",
        speed: 11,
        points: [
            { x: -74.25, z: -68.25 },
            { x: 80.25, z: -68.25 },
            { x: 80.25, z: 68.25 },
            { x: -74.25, z: 68.25 }
        ]
    },
    {
        id: "outer",
        speed: 12.5,
        points: [
            { x: -81.75, z: -75.75 },
            { x: -81.75, z: 75.75 },
            { x: 87.75, z: 75.75 },
            { x: 87.75, z: -75.75 }
        ]
    },
    {
        id: "main-east",
        speed: 13,
        points: [
            { x: -148, z: 3.75 },
            { x: 148, z: 3.75 },
            { x: 148, z: -3.75 },
            { x: -148, z: -3.75 }
        ]
    }
]);

/**
 * Sidewalk circuits for pedestrians. Each loop hugs the middle of the
 * pavement, 9.6 m out from the road centreline it follows.
 */
export const PED_ROUTES = Object.freeze([
    [{ x: -68.4, z: -9.6 }, { x: -3.6, z: -9.6 }, { x: -3.6, z: -62.4 }, { x: -68.4, z: -62.4 }],
    [{ x: 15.6, z: -9.6 }, { x: 74.4, z: -9.6 }, { x: 74.4, z: -62.4 }, { x: 15.6, z: -62.4 }],
    [{ x: -68.4, z: 9.6 }, { x: -3.6, z: 9.6 }, { x: -3.6, z: 62.4 }, { x: -68.4, z: 62.4 }],
    [{ x: 15.6, z: 9.6 }, { x: 74.4, z: 9.6 }, { x: 74.4, z: 62.4 }, { x: 15.6, z: 62.4 }],
    [{ x: -87.6, z: -58 }, { x: -87.6, z: 58 }]
]);

const roadHalf = CITY.roadWidth / 2;
const walkOuter = roadHalf + CITY.sidewalkWidth;

/** True when the point sits on road asphalt. */
export function isRoad(x, z) {
    for (const road of ROADS) {
        if (road.axis === "x") {
            if (Math.abs(z - road.at) <= roadHalf && x >= road.from && x <= road.to) return true;
        } else if (Math.abs(x - road.at) <= roadHalf && z >= road.from && z <= road.to) {
            return true;
        }
    }
    return false;
}

/** True when the point sits on a pavement slab beside a road. */
export function isSidewalk(x, z) {
    if (isRoad(x, z)) return false;
    for (const road of ROADS) {
        if (road.axis === "x") {
            if (Math.abs(z - road.at) <= walkOuter && x >= road.from - walkOuter && x <= road.to + walkOuter) return true;
        } else if (Math.abs(x - road.at) <= walkOuter && z >= road.from - walkOuter && z <= road.to + walkOuter) {
            return true;
        }
    }
    return false;
}

export function inRect(x, z, rect) {
    return x >= rect.x && x <= rect.x + rect.w && z >= rect.z && z <= rect.z + rect.d;
}

export const PARK_BLOCK = BLOCKS.find((block) => block.id === "park");
export const SPORTS_BLOCK = BLOCKS.find((block) => block.id === "sports");

export const COURT = Object.freeze({
    x: POIS.court.x,
    z: POIS.court.z,
    width: 28,
    depth: 15.5,
    rimHeight: 3.05,
    hoops: [
        { x: POIS.court.x - 13.2, z: POIS.court.z, facing: 1 },
        { x: POIS.court.x + 13.2, z: POIS.court.z, facing: -1 }
    ]
});

export const POND = Object.freeze({ x: -46, z: 44, rx: 15, rz: 10 });

/** Ground height at a point, including kerbs and soft park terrain. */
export function groundHeight(x, z) {
    if (isRoad(x, z)) return 0;
    if (isSidewalk(x, z)) return CITY.curbHeight;
    if (inRect(x, z, COURT_RECT)) return 0.06;
    if (PARK_BLOCK && inRect(x, z, PARK_BLOCK)) return 0.1;
    return CITY.curbHeight;
}

const COURT_RECT = Object.freeze({
    x: COURT.x - COURT.width / 2 - 2,
    z: COURT.z - COURT.depth / 2 - 2,
    w: COURT.width + 4,
    d: COURT.depth + 4
});

export { COURT_RECT };

const HOME_RECT = Object.freeze({
    x: PLAYER_HOME.x - PLAYER_HOME.w / 2,
    z: PLAYER_HOME.z - PLAYER_HOME.d / 2,
    w: PLAYER_HOME.w,
    d: PLAYER_HOME.d
});

/** Surface type drives footstep sound and vehicle grip. */
export function surfaceAt(x, z) {
    if (inRect(x, z, HOME_RECT)) return SURFACE.INTERIOR;
    if (inRect(x, z, COURT_RECT)) return SURFACE.COURT;
    if (isRoad(x, z)) return SURFACE.ROAD;
    if (isSidewalk(x, z)) return SURFACE.SIDEWALK;
    if (PARK_BLOCK && inRect(x, z, PARK_BLOCK)) return SURFACE.GRASS;
    // Everything else on a block is front lawn or verge rather than bare earth.
    for (const block of BLOCKS) {
        if (inRect(x, z, block)) {
            return block.kind === "industrial" ? SURFACE.DIRT : SURFACE.GRASS;
        }
    }
    return SURFACE.DIRT;
}

/** Which named district the point belongs to, for the HUD location readout. */
export function districtAt(x, z) {
    for (const block of BLOCKS) {
        if (inRect(x, z, block)) {
            if (block.kind === "park") return "Bayline Park";
            if (block.kind === "sports") return "Fulton Court";
            if (block.kind === "tower") return "Downtown";
            if (block.kind === "industrial") return "Rail Yard";
            if (block.kind === "residential") return "Maple Rise";
            return "Bayline District";
        }
    }
    let closest = null;
    let best = Infinity;
    for (const road of ROADS) {
        const distance = road.axis === "x" ? Math.abs(z - road.at) : Math.abs(x - road.at);
        if (distance < best) {
            best = distance;
            closest = road;
        }
    }
    return closest ? closest.name : "Bayline District";
}
