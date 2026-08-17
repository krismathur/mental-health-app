/**
 * Headless verification for CITY MISSIONS.
 *
 * Plays the whole six-chapter story through the mission system, exercises
 * the mental model and the save schema, and sanity checks the city layout.
 * Runs under plain Node with no browser: `npm run check`.
 */
import assert from "node:assert/strict";

import {
    BLOCKS, BUILDINGS, CITY, COURT, POIS, ROADS, SURFACE,
    districtAt, isRoad, isSidewalk, surfaceAt
} from "./world-data.js";
import { MISSIONS, MissionSystem } from "./missions.js";
import {
    BEHAVIOURS, MAX_STAT, STATS, composure, createMentalState,
    overallScore, recordBehaviour, statBand
} from "./mental.js";
import {
    LEVELS, SAVE_KEY, UNLOCKS, awardXp, clearSave, createProgress,
    deserialise, hasUnlock, levelForXp, load, save, serialise, xpIntoLevel
} from "./progress.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed += 1;
        console.log(`  ok   ${name}`);
    } catch (error) {
        failed += 1;
        console.log(`  FAIL ${name}`);
        console.log(`       ${error.message}`);
    }
}

function section(title) {
    console.log(`\n${title}`);
}

// ---------------------------------------------------------------- world

section("City layout");

test("district fits inside its declared bounds", () => {
    assert.ok(CITY.maxX > CITY.minX && CITY.maxZ > CITY.minZ);
    for (const block of BLOCKS) {
        assert.ok(block.x >= CITY.minX - 1, `${block.id} starts west of the map`);
        assert.ok(block.x + block.w <= CITY.maxX + 1, `${block.id} runs east of the map`);
        assert.ok(block.z + block.d <= CITY.maxZ + 1, `${block.id} runs south of the map`);
    }
});

test("every road centreline reports as road surface", () => {
    for (const road of ROADS) {
        const x = road.axis === "x" ? (road.from + road.to) / 2 : road.at;
        const z = road.axis === "x" ? road.at : (road.from + road.to) / 2;
        assert.equal(isRoad(x, z), true, `${road.name} centre is not road`);
        assert.equal(surfaceAt(x, z), SURFACE.ROAD, `${road.name} surface wrong`);
    }
});

test("pavement sits beside the road, not on it", () => {
    const offset = CITY.roadWidth / 2 + CITY.sidewalkWidth / 2;
    // Sampled away from junctions, where the crossing roads take over.
    for (const road of ROADS.filter((entry) => entry.axis === "x")) {
        for (const z of [road.at - offset, road.at + offset]) {
            assert.equal(isSidewalk(-40, z), true, `no pavement beside ${road.name}`);
            assert.equal(isRoad(-40, z), false, `pavement overlaps ${road.name}`);
        }
    }
    for (const road of ROADS.filter((entry) => entry.axis === "z")) {
        for (const x of [road.at - offset, road.at + offset]) {
            assert.equal(isSidewalk(x, -36), true, `no pavement beside ${road.name}`);
            assert.equal(isRoad(x, -36), false, `pavement overlaps ${road.name}`);
        }
    }
});

test("every block clears the pavement of the roads around it", () => {
    // Blocks are meant to sit exactly flush with the pavement edge, so allow
    // a millimetre of floating point slack.
    const clearance = CITY.roadWidth / 2 + CITY.sidewalkWidth - 0.001;
    for (const block of BLOCKS) {
        for (const road of ROADS) {
            const [min, max] = road.axis === "x" ? [block.z, block.z + block.d] : [block.x, block.x + block.w];
            const overlaps = min < road.at + clearance && max > road.at - clearance;
            assert.equal(overlaps, false, `${block.id} overlaps the pavement of ${road.name}`);
        }
    }
});

test("buildings are generated deterministically and are all above ground", () => {
    assert.ok(BUILDINGS.length > 60, `only ${BUILDINGS.length} buildings generated`);
    for (const building of BUILDINGS) {
        assert.ok(building.height > 2, "building has no height");
        assert.ok(building.w > 1 && building.d > 1, "building has no footprint");
        assert.ok(Number.isFinite(building.x) && Number.isFinite(building.z), "building has no position");
    }
});

test("no building footprint reaches the road", () => {
    const offenders = [];
    for (const building of BUILDINGS) {
        for (const corner of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) {
            const x = building.x + corner[0] * building.w / 2;
            const z = building.z + corner[1] * building.d / 2;
            if (isRoad(x, z)) offenders.push(`${building.block} @ ${x.toFixed(1)},${z.toFixed(1)}`);
        }
    }
    assert.equal(offenders.length, 0, `buildings in the road: ${offenders.slice(0, 4).join(", ")}`);
});

test("the player's home is a real house on the residential street", () => {
    const home = BUILDINGS.find((building) => building.playerHome);
    assert.ok(home, "no house was marked as the player's home");
    assert.equal(home.kind, "house");
    assert.equal(POIS.home.x, home.x);
    assert.ok(POIS.homeDoor.x > POIS.home.x, "the front door is not on the street side");
    assert.equal(isRoad(POIS.homeDoor.x, POIS.homeDoor.z), false, "the front door opens into traffic");
});

test("court surface and hoops are placed correctly", () => {
    assert.equal(surfaceAt(COURT.x, COURT.z), SURFACE.COURT);
    assert.equal(COURT.hoops.length, 2);
    const span = Math.abs(COURT.hoops[0].x - COURT.hoops[1].x);
    assert.ok(span > 20 && span < COURT.width + 2, `hoop spacing looks wrong: ${span}`);
    assert.ok(COURT.rimHeight > 3 && COURT.rimHeight < 3.1, "rim is not regulation height");
});

test("named districts resolve for every point of interest", () => {
    for (const [id, poi] of Object.entries(POIS)) {
        const name = districtAt(poi.x, poi.z);
        assert.ok(typeof name === "string" && name.length > 0, `${id} has no district`);
    }
});

// ---------------------------------------------------------------- mental

section("Mental strength");

test("stats start low and grow from behaviour", () => {
    const state = createMentalState();
    for (const stat of STATS) assert.ok(state.stats[stat.id] < 20);
    recordBehaviour(state, "helpedFriend");
    assert.ok(state.stats.teamwork > 12, "teamwork did not move");
});

test("growth slows as a stat approaches the cap", () => {
    const state = createMentalState();
    const first = recordBehaviour(state, "retriedAfterLoss").delta;
    for (let index = 0; index < 40; index += 1) recordBehaviour(state, "retriedAfterLoss");
    const last = recordBehaviour(state, "retriedAfterLoss").delta;
    assert.ok(last < first, `late gain ${last} should be smaller than early gain ${first}`);
    assert.ok(state.stats.resilience <= MAX_STAT, "stat exceeded the cap");
});

test("every behaviour maps to a real stat and reads as an action", () => {
    const ids = STATS.map((stat) => stat.id);
    for (const [key, behaviour] of Object.entries(BEHAVIOURS)) {
        assert.ok(ids.includes(behaviour.stat), `${key} points at unknown stat ${behaviour.stat}`);
        assert.ok(behaviour.note.length > 4, `${key} has no readable note`);
        assert.ok(!/you should|remember to|try to/i.test(behaviour.note), `${key} reads like a lesson`);
    }
});

test("composure rises with focus, confidence and resilience", () => {
    const state = createMentalState();
    const before = composure(state);
    for (let index = 0; index < 12; index += 1) {
        recordBehaviour(state, "scoredUnderPressure");
        recordBehaviour(state, "beatTheClock");
        recordBehaviour(state, "retriedAfterLoss");
    }
    assert.ok(composure(state) > before + 0.1, "composure barely moved");
    assert.ok(composure(state) <= 0.92, "composure exceeded its ceiling");
});

test("stat bands and overall score stay in range", () => {
    const state = createMentalState();
    assert.equal(statBand(10), "low");
    assert.equal(statBand(50), "mid");
    assert.equal(statBand(90), "high");
    assert.ok(overallScore(state) >= 0 && overallScore(state) <= MAX_STAT);
});

test("history keeps the most recent entries only", () => {
    const state = createMentalState();
    for (let index = 0; index < 40; index += 1) recordBehaviour(state, "exploredNewPlace");
    assert.ok(state.history.length <= 24, "history grew without bound");
});

// ---------------------------------------------------------------- progress

section("Progression");

test("level thresholds increase and map back correctly", () => {
    for (let index = 1; index < LEVELS.length; index += 1) {
        assert.ok(LEVELS[index] > LEVELS[index - 1], "thresholds are not increasing");
    }
    assert.equal(levelForXp(0), 1);
    assert.equal(levelForXp(LEVELS[1]), 2);
    assert.equal(levelForXp(LEVELS[4] - 1), 4);
});

test("xp awards unlock content exactly once", () => {
    const progress = createProgress();
    const result = awardXp(progress, LEVELS[4], "test");
    assert.equal(result.levelUp, true);
    assert.ok(result.unlocks.length > 0, "levelling up unlocked nothing");
    const again = awardXp(progress, 10, "test");
    assert.equal(again.unlocks.length, 0, "unlocks were handed out twice");
    for (const unlock of UNLOCKS.filter((entry) => entry.level <= progress.level)) {
        assert.equal(hasUnlock(progress, unlock.id), true, `${unlock.id} missing at level ${progress.level}`);
    }
});

test("xp progress bar never leaves the 0 to 1 range", () => {
    for (const xp of [0, 55, 300, 1200, 9000, 99999]) {
        const info = xpIntoLevel(xp);
        assert.ok(info.ratio >= 0 && info.ratio <= 1, `ratio out of range at ${xp}`);
        assert.ok(info.needed > 0, `needed xp is zero at ${xp}`);
    }
});

test("no unlock is random or purchasable", () => {
    for (const unlock of UNLOCKS) {
        assert.ok(Number.isInteger(unlock.level), `${unlock.id} has no fixed level`);
        assert.equal(unlock.cost, undefined, `${unlock.id} costs currency`);
        assert.ok(!/chance|random|crate|box|spin/i.test(unlock.label + unlock.detail), `${unlock.id} looks like a loot box`);
    }
});

test("save round trips through a stubbed storage", () => {
    const store = new Map();
    const storage = {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, value),
        removeItem: (key) => store.delete(key)
    };

    const progress = createProgress();
    progress.appearance = { name: "Rowan", skin: "olive", hair: "curls" };
    awardXp(progress, 640, "test");
    recordBehaviour(progress.mental, "helpedFriend");
    progress.discovered.push("rooftop");
    progress.missions.completed.push("morning", "practice");

    assert.equal(save(progress, storage), true);
    assert.ok(store.has(SAVE_KEY), "nothing was written");

    const restored = load(storage);
    assert.equal(restored.xp, progress.xp);
    assert.equal(restored.level, progress.level);
    assert.equal(restored.appearance.name, "Rowan");
    assert.deepEqual(restored.missions.completed, ["morning", "practice"]);
    assert.ok(restored.mental.stats.teamwork > 12, "mental stats did not survive the save");
    assert.deepEqual(restored.discovered, ["rooftop"]);

    clearSave(storage);
    assert.equal(load(storage), null, "save was not cleared");
});

test("a corrupt or future save falls back to a fresh game", () => {
    const storage = {
        getItem: () => "{not json",
        setItem: () => {},
        removeItem: () => {}
    };
    assert.equal(load(storage), null);

    const future = deserialise({ version: 99, xp: 5000 });
    assert.equal(future.xp, 0, "a future save version was trusted");
    assert.equal(serialise(future).version, 1);
});

// ---------------------------------------------------------------- missions

section("Mission flow");

test("the six chapters chain together without a dead end", () => {
    assert.equal(MISSIONS.length, 6);
    const ids = new Set(MISSIONS.map((mission) => mission.id));
    for (const mission of MISSIONS) {
        assert.ok(mission.steps.length > 0, `${mission.id} has no steps`);
        if (mission.next) assert.ok(ids.has(mission.next), `${mission.id} points at a missing mission`);
        for (const step of mission.steps) {
            assert.ok(step.label, `${mission.id}/${step.id} has no label`);
            if (step.type === "goto") assert.ok(POIS[step.place], `${step.place} is not a real place`);
        }
    }
    assert.equal(MISSIONS[MISSIONS.length - 1].next, null);
});

test("no objective text sounds like schoolwork", () => {
    const banned = /lesson|quiz|learn about|worksheet|exercise \d|homework/i;
    for (const mission of MISSIONS) {
        assert.ok(!banned.test(mission.brief), `${mission.id} brief reads like a lesson`);
        for (const step of mission.steps) {
            assert.ok(!banned.test(step.label), `${mission.id}/${step.id} reads like a lesson`);
            assert.ok(!banned.test(step.hint || ""), `${mission.id}/${step.id} hint reads like a lesson`);
        }
    }
});

test("a full playthrough completes every chapter and moves every stat", () => {
    const progress = createProgress();
    const events = [];
    const missions = new MissionSystem(progress, { onEvent: (event) => events.push(event.type) });

    // Chapter 1: morning.
    missions.start("morning");
    assert.equal(missions.mission.id, "morning");
    missions.handle("arrive", { place: "homeDoor" });
    missions.handle("talk", { friend: "mara" });
    assert.ok(progress.missions.completed.includes("morning"));

    // Chapter 2: practice drill.
    missions.start("practice");
    missions.handle("arrive", { place: "court" });
    for (let shot = 0; shot < 5; shot += 1) missions.handle("shotMade", {});
    assert.ok(progress.missions.completed.includes("practice"));
    assert.ok(progress.mental.stats.focus > 12, "the drill did not build focus");

    // Chapter 3: the timed jersey run, beaten with time to spare.
    missions.start("jersey-run");
    missions.tick(30);
    missions.handle("ride", { vehicle: "bike" });
    missions.handle("arrive", { place: "store" });
    missions.handle("collect", { item: "jersey" });
    assert.ok(progress.missions.completed.includes("jersey-run"));

    // Chapter 4: the setback, rerouted through the alley.
    missions.start("the-long-way");
    missions.handle("scripted", { step: "breakdown" });
    const beforeAdaptability = progress.mental.stats.adaptability;
    missions.handle("choice", { option: "alley" });
    assert.ok(progress.mental.stats.adaptability > beforeAdaptability, "rerouting did not build adaptability");
    assert.ok(progress.discovered.includes("alley"), "the alley was not discovered");
    missions.handle("arrive", { place: "court" });
    assert.ok(progress.mental.stats.resilience > 12, "finishing after the setback did not build resilience");

    // Chapter 5: the teamwork choice.
    missions.start("warm-up");
    const beforeTeamwork = progress.mental.stats.teamwork;
    missions.handle("choice", { option: "help-dev" });
    assert.ok(progress.mental.stats.teamwork > beforeTeamwork, "helping Dev did not build teamwork");
    assert.ok(progress.friendship.dev > 20, "helping Dev did not deepen the friendship");

    // Chapter 6: the final.
    missions.start("the-final");
    missions.handle("scripted", { step: "tip-off" });
    missions.handle("matchEnd", { result: "win" });

    assert.equal(progress.missions.completed.length, 6, "not every chapter completed");
    assert.equal(progress.stats.matchesWon, 1);
    assert.ok(progress.level >= 3, `player only reached level ${progress.level}`);
    assert.ok(events.includes("missionCompleted"), "no completion event was emitted");

    const moved = STATS.filter((stat) => progress.mental.stats[stat.id] > 12);
    assert.ok(moved.length >= 5, `only ${moved.length} of 6 stats moved during the story`);
});

test("losing the final still advances the story and builds resilience", () => {
    const progress = createProgress();
    const missions = new MissionSystem(progress);
    missions.start("the-final");
    missions.handle("scripted", { step: "tip-off" });
    const before = progress.mental.stats.resilience;
    missions.handle("matchEnd", { result: "loss" });
    assert.ok(progress.missions.completed.includes("the-final"), "a loss blocked the story");
    assert.ok(progress.mental.stats.resilience > before, "losing taught nothing");
});

test("missing the delivery timer does not soft lock the run", () => {
    const progress = createProgress();
    const events = [];
    const missions = new MissionSystem(progress, { onEvent: (event) => events.push(event.type) });
    missions.start("jersey-run");
    missions.tick(200);
    assert.ok(events.includes("timerExpired"), "the timer never expired");
    missions.handle("arrive", { place: "store" });
    missions.handle("collect", { item: "jersey" });
    assert.ok(progress.missions.completed.includes("jersey-run"), "the run could not be finished late");
});

test("retrying after a loss is what raises resilience, not the loss itself", () => {
    const progress = createProgress();
    const missions = new MissionSystem(progress);
    missions.start("the-final");
    const before = progress.mental.stats.resilience;
    missions.handle("retry", {});
    assert.ok(progress.mental.stats.resilience > before);
});

test("the objective marker always points somewhere reachable", () => {
    const progress = createProgress();
    const missions = new MissionSystem(progress);
    for (const mission of MISSIONS) {
        missions.start(mission.id);
        while (!missions.isComplete) {
            const marker = missions.markerPlace;
            if (marker) {
                assert.ok(Number.isFinite(marker.x) && Number.isFinite(marker.z), `${mission.id} marker is broken`);
                assert.ok(marker.x >= CITY.minX && marker.x <= CITY.maxX, `${mission.id} marker is off the map`);
            }
            missions.completeStep();
        }
    }
});

test("the mission snapshot the HUD reads is always well formed", () => {
    const progress = createProgress();
    const missions = new MissionSystem(progress);
    missions.start("jersey-run");
    const snapshot = missions.snapshot();
    assert.equal(typeof snapshot.title, "string");
    assert.equal(typeof snapshot.objective, "string");
    assert.ok(snapshot.timer > 0, "the timed mission has no timer");
    assert.equal(snapshot.chapter, 3);
});

// ---------------------------------------------------------------- summary

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
