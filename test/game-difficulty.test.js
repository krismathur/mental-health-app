"use strict";

const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function loadModule(relativePath) {
    return import(pathToFileURL(path.join(__dirname, "..", relativePath)).href);
}

test("mountain difficulty changes landing space and hazard timing", async function () {
    const difficulty = await loadModule("public/game/difficulty.mjs");
    const sample = {
        width: 500,
        platforms: [{ id: "ledge", x: 150, y: 200, w: 140, h: 30, type: "rock" }],
        zones: [{ kind: "wind", strength: 500, period: 5, activeFor: 2 }]
    };

    const easy = difficulty.prepareMountainLevel(sample, "easy");
    const medium = difficulty.prepareMountainLevel(sample, "medium");
    const hard = difficulty.prepareMountainLevel(sample, "hard");

    assert.ok(easy.platforms[0].w > medium.platforms[0].w);
    assert.ok(medium.platforms[0].w > hard.platforms[0].w);
    assert.ok(easy.zones[0].strength < medium.zones[0].strength);
    assert.ok(hard.zones[0].strength > medium.zones[0].strength);
    assert.ok(difficulty.getDifficulty("hard").tuning.crumbleDelay < 0.5);
});

test("deep diver hard mode has sparse air and severe oxygen pressure", async function () {
    const difficulty = await loadModule("public/deep-diver/difficulty.mjs");
    const world = {
        oxygen: Array.from({ length: 16 }, function (_, index) { return { id: "o" + (index + 1) }; }),
        jellies: [{ speed: 1, range: 100 }],
        currents: [{ strength: 300, period: 6, activeFor: 2 }]
    };

    const easy = difficulty.prepareDiveWorld(world, "easy");
    const medium = difficulty.prepareDiveWorld(world, "medium");
    const hard = difficulty.prepareDiveWorld(world, "hard");

    assert.strictEqual(easy.oxygen.length, 16);
    assert.strictEqual(medium.oxygen.length, 12);
    assert.strictEqual(hard.oxygen.length, 7);
    assert.ok(hard.jellies[0].speed > medium.jellies[0].speed);
    assert.ok(hard.currents[0].strength > medium.currents[0].strength);
    assert.ok(difficulty.getDifficulty("hard").tuning.drainPerSecond >= 6);
    assert.ok(difficulty.getDifficulty("hard").tuning.oxygenPickup <= 14);
});

test("unknown difficulty safely falls back to medium", async function () {
    const mountain = await loadModule("public/game/difficulty.mjs");
    const diver = await loadModule("public/deep-diver/difficulty.mjs");

    assert.strictEqual(mountain.normalizeDifficulty("impossible"), "medium");
    assert.strictEqual(diver.normalizeDifficulty(null), "medium");
});

test("mountain routes remain finishable while hard requires more precise take-off timing", async function () {
    const { run } = await loadModule("public/game/level-check.mjs");
    const { LEVELS } = await loadModule("public/game/levels.js");
    for (const difficulty of ["easy", "medium", "hard"]) {
        assert.ok(run(LEVELS[0], 8, difficulty).ok, difficulty + " must have a finishable route");
    }
    assert.ok(run(LEVELS[0], 28, "easy").ok, "easy tolerates earlier jumps");
    assert.ok(!run(LEVELS[0], 28, "hard").ok, "the same loose timing must not breeze through hard");
});

test("mountain difficulty changes actual jump height, checkpoint recovery, and mid-climb wind", async function () {
    const { Game } = await loadModule("public/game/engine.js");
    const { LEVELS } = await loadModule("public/game/levels.js");
    const original = JSON.stringify(LEVELS[0]);
    const games = ["easy", "medium", "hard"].map(id => new Game(LEVELS[0], id));
    const rises = games.map(game => {
        const p1 = game.level.platforms.find(p => p.id === "p1");
        const p2 = game.level.platforms.find(p => p.id === "p2");
        return p1.y - p2.y;
    });
    assert.ok(rises[0] < rises[1] && rises[1] < rises[2]);
    assert.equal(games[0].level.checkpoints.length, 4);
    assert.equal(games[2].level.checkpoints.length, 2);
    assert.ok(games.every(game => game.level.zones.filter(z => z.kind === "wind").length === 2));
    assert.ok(games[2].tuning.crumbleDelay < games[1].tuning.crumbleDelay);
    assert.ok(games[1].tuning.crumbleDelay < games[0].tuning.crumbleDelay);
    assert.equal(JSON.stringify(LEVELS[0]), original, "difficulty must not mutate shared level data");
});
