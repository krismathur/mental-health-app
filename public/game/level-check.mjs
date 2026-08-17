/**
 * Level validator: drives the real engine with a simple auto-climber to prove a
 * level can actually be finished, and reports where a bot gets stuck.
 *
 * Run it after editing levels.js:  node public/game/level-check.mjs
 */

import { Game, FIXED_STEP } from "./engine.js";
import { LEVELS } from "./levels.js";

// The intended climb, ledge by ledge. Only used by the bot, not by the game.
const PATHS = {
    "first-climb": [
        "ground", "p1", "p2", "p3", "p4", "p5", "p6", "c1", "p7", "i1", "p8",
        "c2", "p9", "i2", "p10", "p11", "p12", "r1", "r2", "r3", "r4", "r5",
        "r6", "r7", "r8", "r9", "summit"
    ]
};

const MAX_SECONDS = 400;
const STUCK_SECONDS = 18;

function run(level, jumpLead) {
    const path = PATHS[level.id];
    const game = new Game(level);
    const input = { left: false, right: false, jump: true, jumpPressed: false };

    const byId = {};
    for (const platform of game.level.platforms) {
        byId[platform.id] = platform;
    }

    let index = 1;
    let elapsed = 0;
    let sinceProgress = 0;
    let setbacks = 0;
    let finished = false;

    while (elapsed < MAX_SECONDS && !finished) {
        const player = game.player;
        const target = byId[path[Math.min(index, path.length - 1)]];
        const playerCenter = player.x + player.w / 2;
        const targetCenter = target.x + target.w / 2;
        const direction = Math.abs(targetCenter - playerCenter) < 6
            ? 0
            : Math.sign(targetCenter - playerCenter);

        input.left = direction < 0;
        input.right = direction > 0;
        input.jumpPressed = false;

        if (player.onGround) {
            const current = byId[player.groundId];
            const needsHeight = target.y < player.y + player.h - 4;

            if (current && needsHeight) {
                const edge = direction >= 0 ? current.x + current.w : current.x;
                const toEdge = Math.abs(edge - playerCenter);
                const overTarget = playerCenter > target.x - 20
                    && playerCenter < target.x + target.w + 20;

                if (toEdge < jumpLead || overTarget) {
                    input.jumpPressed = true;
                }
            }
        }

        game.update(FIXED_STEP, input);
        elapsed += FIXED_STEP;
        sinceProgress += FIXED_STEP;

        for (const event of game.events) {
            if (event.type === "setback") {
                setbacks += 1;
                if (event.respawn) {
                    game.respawnPlayer();
                } else {
                    game.resume();
                }
            }
            if (event.type === "goal") {
                finished = true;
            }
        }
        game.events.length = 0;

        // Re-sync the plan with wherever the climber actually ended up.
        if (game.player.onGround) {
            const standingIndex = path.indexOf(game.player.groundId);
            if (standingIndex >= 0 && standingIndex + 1 !== index) {
                index = standingIndex + 1;
                sinceProgress = 0;
            }
        }

        if (sinceProgress > STUCK_SECONDS) {
            return {
                ok: false,
                stuckAt: path[index - 1] + " -> " + path[Math.min(index, path.length - 1)],
                reached: index,
                setbacks: setbacks,
                seconds: elapsed,
                crystals: game.stats.crystals,
                total: game.stats.crystalTotal
            };
        }
    }

    return {
        ok: finished,
        reached: index,
        setbacks: setbacks,
        seconds: elapsed,
        crystals: game.stats.crystals,
        total: game.stats.crystalTotal,
        stuckAt: finished ? "" : "ran out of time"
    };
}

let failures = 0;

for (const level of LEVELS) {
    let best = null;

    // A human varies their timing, so try a few take-off distances.
    for (const jumpLead of [40, 55, 70, 85, 100]) {
        const result = run(level, jumpLead);
        if (!best || result.reached > best.reached || (result.ok && !best.ok)) {
            best = Object.assign({ jumpLead: jumpLead }, result);
        }
        if (result.ok) {
            break;
        }
    }

    const path = PATHS[level.id];
    if (best.ok) {
        console.log(
            `PASS  ${level.id}: summit reached in ${best.seconds.toFixed(1)}s ` +
            `(lead ${best.jumpLead}, ${best.setbacks} setbacks, ` +
            `${best.crystals}/${best.total} crystals on the way)`
        );
    } else {
        failures += 1;
        console.log(
            `FAIL  ${level.id}: stuck at ${best.stuckAt} ` +
            `(ledge ${best.reached}/${path.length}, ${best.setbacks} setbacks)`
        );
    }
}

process.exit(failures === 0 ? 0 : 1);
