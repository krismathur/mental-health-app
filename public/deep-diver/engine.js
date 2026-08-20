/**
 * Simulation for Deep Diver: physics, collision, collectibles, air pockets and
 * setbacks. It knows nothing about the DOM or drawing.
 *
 * This is the same fixed-step platformer engine as The Impossible Mountain, only
 * tuned to feel like water: gravity is gentler (buoyancy), you sink slowly and a
 * kick carries you a long, floaty way up. Lower gravity only makes ledges easier
 * to reach, so any level that was solvable on the mountain is still solvable here.
 *
 * The loop in main.js steps this at a fixed rate and drains game.events, so
 * gameplay stays identical no matter the display refresh rate.
 */

import { cloneLevel } from "./levels.js";

export const FIXED_STEP = 1 / 120;

export const TUNING = {
    // Buoyancy is gentler than gravity, so a diver rises far on one kick and
    // sinks back slowly. Water drag caps how fast you can ever sink.
    gravity: 1650,
    floatyGravity: 0.5,
    moveAccel: 2600,
    airAccel: 2100,
    maxSpeed: 300,
    groundFriction: 2600,
    iceAccel: 900,
    iceFriction: 220,
    airDrag: 620,
    jumpVelocity: -760,
    boostJumpVelocity: -880,
    maxFallSpeed: 780,
    coyoteTime: 0.1,
    jumpBufferTime: 0.13,
    jumpCut: 0.45,
    // Dropping this far costs real progress, so it opens a setback card.
    bigFall: 250,
    // A smaller slip only earns a nudge of encouragement.
    stumbleFall: 150,
    crumbleDelay: 0.75,
    crumbleRespawn: 3.5,
    playerWidth: 42,
    playerHeight: 78
};

const ABILITY_KEYS = ["hint", "floaty", "grip", "boost"];

function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export class Game {
    constructor(level) {
        this.level = cloneLevel(level);
        this.events = [];
        this.viewWidth = 960;
        this.viewHeight = 620;
        this.reset();
    }

    // ------------------------------------------------------------ lifecycle

    reset() {
        const level = this.level;

        this.time = 0;
        this.frozen = false;
        this.finished = false;
        this.events.length = 0;
        this.particles = [];

        this.player = {
            x: level.spawn.x,
            y: level.spawn.y - TUNING.playerHeight,
            w: TUNING.playerWidth,
            h: TUNING.playerHeight,
            vx: 0,
            vy: 0,
            onGround: false,
            groundType: "rock",
            groundId: "",
            facing: 1,
            coyote: 0,
            jumpBuffer: 0,
            animTime: 0,
            squash: 0,
            stepTimer: 0
        };

        this.respawn = { x: level.spawn.x, y: level.spawn.y };
        this.abilities = { hint: 0, floaty: 0, grip: 0, boost: 0 };

        this.stats = {
            crystals: 0,
            crystalTotal: level.crystals.length,
            setbacks: 0,
            checkpoints: 0,
            deadEndFound: false,
            heightMeters: 0,
            bestHeightMeters: 0,
            elapsed: 0
        };

        this.airborneFromY = this.player.y;
        this.airborneCause = "fall";
        this.crumbleUnderfoot = false;

        for (const platform of level.platforms) {
            platform.crumbling = false;
            platform.timer = 0;
            platform.gone = false;
            platform.cooldown = 0;
        }

        for (const crystal of level.crystals) {
            crystal.taken = false;
        }

        for (const checkpoint of level.checkpoints) {
            checkpoint.active = false;
            checkpoint.pop = 0;
        }

        for (const zone of level.zones) {
            // Start in the calm phase so the level never opens mid-gust.
            zone.timer = zone.activeFor || 0;
            zone.active = false;
            zone.triggered = false;
        }

        this.camera = { x: 0, y: 0 };
        this.updateCamera(0, true);
    }

    setViewport(width, height) {
        this.viewWidth = width;
        this.viewHeight = height;
    }

    emit(type, detail) {
        this.events.push(Object.assign({ type: type }, detail || {}));
    }

    // ------------------------------------------------------------ main step

    update(dt, input) {
        if (this.frozen) {
            return;
        }

        this.time += dt;
        this.stats.elapsed += dt;

        for (const key of ABILITY_KEYS) {
            if (this.abilities[key] > 0) {
                this.abilities[key] = Math.max(0, this.abilities[key] - dt);
                if (this.abilities[key] === 0) {
                    this.emit("abilityEnded", { ability: key });
                }
            }
        }

        this.updateZones(dt);
        this.updatePlatforms(dt);
        this.updatePlayer(dt, input);
        this.updateParticles(dt);

        this.collectCrystals();
        this.touchCheckpoints();
        this.touchZones();
        this.touchGoal();
        this.checkFall();

        this.updateCamera(dt, false);
    }

    // -------------------------------------------------------------- systems

    updateZones(dt) {
        for (const zone of this.level.zones) {
            if (zone.kind !== "wind") {
                continue;
            }

            zone.timer += dt;
            const phase = zone.timer % zone.period;
            const active = phase < zone.activeFor;

            // Only announce a gust the climber is close enough to feel.
            if (active && !zone.active && this.nearZone(zone, 300)) {
                this.emit("gust");
            }

            zone.active = active;
        }
    }

    updatePlatforms(dt) {
        for (const platform of this.level.platforms) {
            if (platform.type !== "crumble") {
                continue;
            }

            if (platform.gone) {
                platform.cooldown -= dt;
                if (platform.cooldown <= 0) {
                    platform.gone = false;
                    platform.crumbling = false;
                    platform.timer = 0;
                }
                continue;
            }

            if (platform.crumbling) {
                platform.timer -= dt;
                if (platform.timer <= 0) {
                    platform.gone = true;
                    platform.cooldown = TUNING.crumbleRespawn;

                    if (this.player.groundId === platform.id) {
                        this.crumbleUnderfoot = true;
                    }

                    this.spawnPuff(platform.x + platform.w / 2, platform.y + 10, 14, "#c8a37a");
                    this.emit("crumbled");
                }
            }
        }
    }

    updatePlayer(dt, input) {
        const player = this.player;
        const slippery = player.groundType === "ice" && this.abilities.grip <= 0;

        // ---- horizontal ----
        const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const accel = player.onGround
            ? (slippery ? TUNING.iceAccel : TUNING.moveAccel)
            : TUNING.airAccel;

        if (direction !== 0) {
            player.vx += direction * accel * dt;
            player.facing = direction;
        } else {
            const friction = player.onGround
                ? (slippery ? TUNING.iceFriction : TUNING.groundFriction)
                : TUNING.airDrag;
            const drop = friction * dt;
            player.vx = Math.abs(player.vx) <= drop ? 0 : player.vx - Math.sign(player.vx) * drop;
        }

        const wind = this.windAt(player);
        if (wind !== 0) {
            player.vx += wind * (player.onGround ? 0.35 : 1) * dt;
        }

        // Wind may briefly push past the normal cap, which is what sells it.
        const cap = TUNING.maxSpeed * (wind !== 0 ? 1.4 : 1);
        player.vx = Math.max(-cap, Math.min(cap, player.vx));

        // ---- jumping ----
        if (player.onGround) {
            player.coyote = TUNING.coyoteTime;
        } else {
            player.coyote -= dt;
        }

        if (input.jumpPressed) {
            player.jumpBuffer = TUNING.jumpBufferTime;
            input.jumpPressed = false;
        } else {
            player.jumpBuffer -= dt;
        }

        if (player.jumpBuffer > 0 && player.coyote > 0) {
            player.vy = this.abilities.boost > 0 ? TUNING.boostJumpVelocity : TUNING.jumpVelocity;
            player.onGround = false;
            player.jumpBuffer = 0;
            player.coyote = 0;
            player.squash = -0.28;
            this.spawnPuff(player.x + player.w / 2, player.y + player.h, 6, "#ffffff");
            this.emit("jump");
        }

        // Tapping jump gives a short hop, holding it gives the full arc.
        if (!input.jump && player.vy < -220) {
            player.vy *= TUNING.jumpCut;
        }

        // ---- gravity ----
        const gravity = TUNING.gravity * (this.abilities.floaty > 0 && player.vy > 0 ? TUNING.floatyGravity : 1);
        player.vy = Math.min(player.vy + gravity * dt, TUNING.maxFallSpeed);

        // ---- integrate with axis-separated collision ----
        const wasOnGround = player.onGround;
        const groundTypeBefore = player.groundType;
        const wasInWind = wind !== 0;
        player.onGround = false;

        this.moveX(player.vx * dt);
        this.moveY(player.vy * dt);

        if (wasOnGround && !player.onGround) {
            this.airborneFromY = player.y;
            this.airborneCause = this.leaveCause(groundTypeBefore, wasInWind);
            this.crumbleUnderfoot = false;
        }

        if (!wasOnGround && player.onGround) {
            player.squash = 0.3;
            this.spawnPuff(player.x + player.w / 2, player.y + player.h, 8, "#ffffff");
            this.emit("land");
            this.judgeLanding();
        }

        // ---- animation bookkeeping ----
        player.animTime += dt;
        player.squash *= Math.max(0, 1 - dt * 7);

        if (player.onGround && Math.abs(player.vx) > 60) {
            player.stepTimer -= dt;
            if (player.stepTimer <= 0) {
                player.stepTimer = 0.26;
                this.spawnPuff(player.x + player.w / 2, player.y + player.h, 2, "#ffffff");
                this.emit("step");
            }
        } else {
            player.stepTimer = 0;
        }

        this.stats.heightMeters = Math.max(
            0,
            Math.round((this.level.spawn.y - (player.y + player.h)) * this.level.metersPerUnit)
        );
        this.stats.bestHeightMeters = Math.max(this.stats.bestHeightMeters, this.stats.heightMeters);
    }

    moveX(dx) {
        const player = this.player;
        player.x += dx;

        for (const platform of this.solidPlatforms()) {
            // Thin ledges are jump-through, so they never block you sideways.
            if (!platform.solid) {
                continue;
            }

            if (!overlaps(player.x, player.y, player.w, player.h, platform.x, platform.y, platform.w, platform.h)) {
                continue;
            }

            if (dx > 0) {
                player.x = platform.x - player.w;
            } else if (dx < 0) {
                player.x = platform.x + platform.w;
            }
            player.vx = 0;
        }

        player.x = Math.max(0, Math.min(this.level.width - player.w, player.x));
    }

    moveY(dy) {
        const player = this.player;
        const previousBottom = player.y + player.h;
        player.y += dy;

        for (const platform of this.solidPlatforms()) {
            if (!overlaps(player.x, player.y, player.w, player.h, platform.x, platform.y, platform.w, platform.h)) {
                continue;
            }

            if (dy > 0) {
                // A jump-through ledge only catches you if you came from above.
                if (!platform.solid && previousBottom > platform.y + 1) {
                    continue;
                }

                player.y = platform.y - player.h;
                player.vy = 0;
                player.onGround = true;
                player.groundType = platform.type;
                player.groundId = platform.id;

                if (platform.type === "crumble" && !platform.crumbling) {
                    platform.crumbling = true;
                    platform.timer = TUNING.crumbleDelay;
                    this.emit("crumbleStart");
                }
            } else if (dy < 0 && platform.solid) {
                player.y = platform.y + platform.h;
                player.vy = 0;
            }
        }
    }

    solidPlatforms() {
        return this.level.platforms.filter(function (platform) {
            return !platform.gone;
        });
    }

    nearZone(zone, margin) {
        const player = this.player;
        return player.y + player.h > zone.y - margin
            && player.y < zone.y + zone.h + margin;
    }

    windAt(player) {
        for (const zone of this.level.zones) {
            if (zone.kind !== "wind" || !zone.active) {
                continue;
            }
            if (overlaps(player.x, player.y, player.w, player.h, zone.x, zone.y, zone.w, zone.h)) {
                return zone.direction * zone.strength;
            }
        }
        return 0;
    }

    // ------------------------------------------------------------- triggers

    collectCrystals() {
        const player = this.player;

        for (const crystal of this.level.crystals) {
            if (crystal.taken) {
                continue;
            }

            if (overlaps(player.x, player.y, player.w, player.h, crystal.x - 22, crystal.y - 26, 44, 52)) {
                crystal.taken = true;
                this.stats.crystals += 1;
                this.spawnSparkle(crystal.x, crystal.y);
                this.emit("crystal", { total: this.stats.crystals });
            }
        }
    }

    touchCheckpoints() {
        const player = this.player;

        for (const checkpoint of this.level.checkpoints) {
            if (checkpoint.active) {
                continue;
            }

            if (overlaps(player.x, player.y, player.w, player.h, checkpoint.x - 34, checkpoint.y - 110, 68, 110)) {
                checkpoint.active = true;
                checkpoint.pop = 1;
                this.respawn = { x: checkpoint.x, y: checkpoint.y };
                this.stats.checkpoints += 1;
                this.spawnSparkle(checkpoint.x, checkpoint.y - 70);
                this.emit("checkpoint");
            }
        }
    }

    touchZones() {
        const player = this.player;

        for (const zone of this.level.zones) {
            if (zone.kind !== "deadend" || zone.triggered) {
                continue;
            }

            if (overlaps(player.x, player.y, player.w, player.h, zone.x, zone.y, zone.w, zone.h)) {
                zone.triggered = true;
                this.stats.deadEndFound = true;
                this.frozen = true;
                this.emit("setback", { cause: "wrongway", respawn: false });
            }
        }
    }

    touchGoal() {
        const player = this.player;
        const goal = this.level.goal;

        if (this.finished) {
            return;
        }

        if (overlaps(player.x, player.y, player.w, player.h, goal.x, goal.y, goal.w, goal.h)) {
            this.finished = true;
            this.frozen = true;
            this.emit("goal");
        }
    }

    /** Only fires when the player drops out of the world with nothing below. */
    checkFall() {
        if (this.player.y <= this.level.height) {
            return;
        }

        this.registerSetback(this.airborneCause, true);
    }

    /** Why the climber left the ground, so the setback card can name it. */
    leaveCause(groundType, inWind) {
        if (this.crumbleUnderfoot) {
            return "crumble";
        }
        if (this.player.vy < -300) {
            return "fall";
        }
        if (groundType === "ice") {
            return "slip";
        }
        if (inWind) {
            return "wind";
        }
        return "fall";
    }

    /**
     * A landing only counts as a setback when it cost real height. Anything
     * shorter is just part of climbing, so the player keeps their flow.
     */
    judgeLanding() {
        const drop = this.player.y - this.airborneFromY;

        if (drop < TUNING.stumbleFall) {
            return;
        }

        if (drop < TUNING.bigFall) {
            this.emit("stumble");
            return;
        }

        // The last checkpoint is a floor on how much progress a fall can cost.
        const landedBelowCheckpoint = this.player.y + this.player.h > this.respawn.y;
        this.registerSetback(this.airborneCause, landedBelowCheckpoint);
    }

    registerSetback(cause, respawn) {
        this.stats.setbacks += 1;
        this.frozen = true;
        this.emit("setback", { cause: cause, respawn: respawn });
    }

    /** Continue from where the climber landed, without moving them. */
    resume() {
        this.frozen = false;
    }

    respawnPlayer() {
        const player = this.player;

        player.x = this.respawn.x - player.w / 2;
        player.y = this.respawn.y - player.h;
        player.vx = 0;
        player.vy = 0;
        player.onGround = true;
        player.groundType = "rock";
        player.squash = 0.4;

        this.airborneFromY = player.y;
        this.crumbleUnderfoot = false;

        // Give every crumbling ledge back so a respawn is never a soft lock.
        for (const platform of this.level.platforms) {
            if (platform.type === "crumble") {
                platform.crumbling = false;
                platform.gone = false;
                platform.timer = 0;
                platform.cooldown = 0;
            }
        }

        this.spawnSparkle(this.respawn.x, this.respawn.y - 40);
        this.frozen = false;
        this.updateCamera(0, true);
    }

    grantAbility(key, seconds) {
        if (Object.prototype.hasOwnProperty.call(this.abilities, key)) {
            this.abilities[key] = Math.max(this.abilities[key], seconds);
        }
    }

    // ------------------------------------------------------------ particles

    spawnPuff(x, y, count, color) {
        for (let i = 0; i < count; i += 1) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 26,
                y: y - Math.random() * 8,
                vx: (Math.random() - 0.5) * 90,
                vy: -Math.random() * 70,
                life: 0.45 + Math.random() * 0.3,
                maxLife: 0.75,
                size: 4 + Math.random() * 6,
                color: color
            });
        }
    }

    spawnSparkle(x, y) {
        for (let i = 0; i < 14; i += 1) {
            const angle = (Math.PI * 2 * i) / 14;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * (90 + Math.random() * 70),
                vy: Math.sin(angle) * (90 + Math.random() * 70),
                life: 0.5 + Math.random() * 0.25,
                maxLife: 0.75,
                size: 3 + Math.random() * 4,
                color: "#7fe3ff"
            });
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i -= 1) {
            const particle = this.particles[i];
            particle.life -= dt;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.vy += 240 * dt;
            particle.vx *= 1 - dt * 1.6;
        }
    }

    // --------------------------------------------------------------- camera

    updateCamera(dt, snap) {
        const player = this.player;
        const level = this.level;

        let targetX = player.x + player.w / 2 - this.viewWidth / 2;
        let targetY = player.y + player.h / 2 - this.viewHeight * 0.58;

        if (this.viewWidth >= level.width) {
            targetX = (level.width - this.viewWidth) / 2;
        } else {
            targetX = Math.max(0, Math.min(level.width - this.viewWidth, targetX));
        }

        targetY = Math.max(0, Math.min(level.height - this.viewHeight, targetY));

        if (snap) {
            this.camera.x = targetX;
            this.camera.y = targetY;
            return;
        }

        const ease = Math.min(1, dt * 8);
        this.camera.x += (targetX - this.camera.x) * ease;
        this.camera.y += (targetY - this.camera.y) * ease;
    }
}
