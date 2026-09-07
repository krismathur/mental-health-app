/**
 * Simulation for Deep Diver: free swimming, oxygen, treasure runs and hazards.
 * It knows nothing about the DOM or drawing.
 *
 * The core loop the player lives: swim down for treasure, watch the air gauge,
 * swim back up and bank the haul on the ship. Oxygen is the pressure; pacing
 * yourself is the skill.
 *
 * main.js steps this at a fixed rate and drains game.events, so gameplay stays
 * identical no matter the display refresh rate.
 */

import { cloneWorld } from "./levels.js";

export const FIXED_STEP = 1 / 120;

export const TUNING = {
    // Water feel: acceleration in every direction, heavy drag, gentle idle lift.
    swimAccel: 1500,
    maxSpeed: 270,
    kickMaxSpeed: 360,
    waterDrag: 2.2,
    idleBuoyancy: -26,

    // Oxygen: a full tank, steady drain, heavier drain while hauling treasure.
    maxOxygen: 100,
    drainPerSecond: 2.0,
    drainCarrying: 3.0,
    calmDrainScale: 0.5,
    surfaceRefillPerSecond: 30,
    oxygenPickup: 30,
    oxygenRespawn: 18,
    lowOxygen: 30,

    // Jellyfish stings cost air and the treasure in your hands.
    stingOxygen: 10,
    stingInvulnSeconds: 2.5,
    jellyRadius: 34,

    playerWidth: 46,
    playerHeight: 64
};

const ABILITY_KEYS = ["light", "calm", "fins", "kick"];

function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export class Game {
    constructor() {
        this.level = cloneWorld();
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
            x: level.spawn.x - TUNING.playerWidth / 2,
            y: level.spawn.y,
            w: TUNING.playerWidth,
            h: TUNING.playerHeight,
            vx: 0,
            vy: 0,
            facing: 1,
            animTime: 0,
            invuln: 0
        };

        this.oxygen = TUNING.maxOxygen;
        this.carrying = null;
        this.rescuing = null;
        this.lowAirWarned = false;
        this.currentCardShown = false;
        this.abilities = { light: 0, calm: 0, fins: 0, kick: 0 };

        this.stats = {
            banked: 0,
            treasureTotal: level.treasures.length,
            treasureValue: 0,
            oxygenGrabbed: 0,
            rescues: 0,
            stings: 0,
            setbacks: 0,
            deepestMeters: 0,
            elapsed: 0
        };

        for (const treasure of level.treasures) {
            treasure.state = "waiting"; // waiting | carried | banked
            treasure.pop = 0;
        }

        for (const bubble of level.oxygen) {
            bubble.taken = false;
            bubble.timer = 0;
        }

        for (const jelly of level.jellies) {
            jelly.phase = Math.random() * Math.PI * 2;
        }

        for (const current of level.currents) {
            // Start in the calm phase so a dive never opens mid-surge.
            current.timer = current.activeFor || 0;
            current.active = false;
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

    depthMeters() {
        const below = this.player.y + this.player.h - this.level.waterline;
        return Math.max(0, Math.round(below * this.level.metersPerUnit));
    }

    atSurface() {
        return this.player.y < this.level.surfaceZone.y;
    }

    // ------------------------------------------------------------ main step

    update(dt, input) {
        if (this.frozen) {
            return;
        }

        this.time += dt;
        this.stats.elapsed += dt;

        // While the buddy is towing the player up, the world keeps moving but
        // the player has no control and nothing can hurt them.
        if (this.rescuing) {
            this.updateRescue(dt);
            this.updateCurrents(dt);
            this.updateJellies(dt);
            this.updateParticles(dt);
            this.updateCamera(dt, false);
            return;
        }

        for (const key of ABILITY_KEYS) {
            if (this.abilities[key] > 0) {
                this.abilities[key] = Math.max(0, this.abilities[key] - dt);
                if (this.abilities[key] === 0) {
                    this.emit("abilityEnded", { ability: key });
                }
            }
        }

        this.updateCurrents(dt);
        this.updateJellies(dt);
        this.updatePlayer(dt, input);
        this.updateOxygen(dt);
        this.updateBubbleRespawns(dt);
        this.updateParticles(dt);

        this.touchTreasure();
        this.touchOxygen();
        this.touchJellies();
        this.touchBankZone();

        this.stats.deepestMeters = Math.max(this.stats.deepestMeters, this.depthMeters());

        this.updateCamera(dt, false);
    }

    // -------------------------------------------------------------- systems

    updateCurrents(dt) {
        for (const current of this.level.currents) {
            current.timer += dt;
            const phase = current.timer % current.period;
            const active = phase < current.activeFor;

            if (active && !current.active && this.nearRect(current, 260)) {
                this.emit("surge");
            }

            current.active = active;
        }
    }

    updateJellies(dt) {
        for (const jelly of this.level.jellies) {
            jelly.phase += dt * jelly.speed;
            const wobble = Math.sin(jelly.phase) * jelly.range;
            jelly.drawX = jelly.x + (jelly.axis === "x" ? wobble : 0);
            jelly.drawY = jelly.y + (jelly.axis === "y" ? wobble : Math.sin(jelly.phase * 2.3) * 14);
        }
    }

    updatePlayer(dt, input) {
        const player = this.player;
        const maxSpeed = this.abilities.kick > 0 ? TUNING.kickMaxSpeed : TUNING.maxSpeed;

        const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

        if (dx !== 0) {
            player.vx += dx * TUNING.swimAccel * dt;
            player.facing = dx;
        }
        if (dy !== 0) {
            player.vy += dy * TUNING.swimAccel * dt;
        }

        // Idle drift: divers float gently upward when they stop kicking.
        if (dx === 0 && dy === 0) {
            player.vy += TUNING.idleBuoyancy * dt;
        }

        // Currents shove sideways unless steady fins are on.
        if (this.abilities.fins <= 0) {
            for (const current of this.level.currents) {
                if (!current.active) {
                    continue;
                }
                if (overlaps(player.x, player.y, player.w, player.h, current.x, current.y, current.w, current.h)) {
                    player.vx += current.direction * current.strength * dt;

                    if (!this.currentCardShown && Math.abs(player.vx) > maxSpeed * 0.9) {
                        this.currentCardShown = true;
                        this.registerSetback("current", false);
                    }
                }
            }
        }

        // Water drag pulls everything back toward stillness.
        const drag = Math.max(0, 1 - TUNING.waterDrag * dt);
        player.vx *= drag;
        player.vy *= drag;

        const speed = Math.hypot(player.vx, player.vy);
        const cap = maxSpeed * 1.35; // currents may briefly push past normal speed
        if (speed > cap) {
            player.vx = (player.vx / speed) * cap;
            player.vy = (player.vy / speed) * cap;
        }

        this.moveX(player.vx * dt);
        this.moveY(player.vy * dt);

        // The waterline is the ceiling: the diver bobs at the surface.
        if (player.y < this.level.waterline - 20) {
            player.y = this.level.waterline - 20;
            player.vy = Math.max(0, player.vy);
        }

        player.invuln = Math.max(0, player.invuln - dt);
        player.animTime += dt;

        if (speed > 90 && Math.random() < dt * 6) {
            this.spawnPuff(player.x + player.w / 2 - player.facing * 20, player.y + 14, 1, "#cfeeff");
        }
    }

    moveX(dx) {
        const player = this.player;
        player.x += dx;

        for (const rock of this.level.rocks) {
            if (!overlaps(player.x, player.y, player.w, player.h, rock.x, rock.y, rock.w, rock.h)) {
                continue;
            }
            if (dx > 0) {
                player.x = rock.x - player.w;
            } else if (dx < 0) {
                player.x = rock.x + rock.w;
            }
            player.vx = 0;
        }

        player.x = Math.max(0, Math.min(this.level.width - player.w, player.x));
    }

    moveY(dy) {
        const player = this.player;
        player.y += dy;

        for (const rock of this.level.rocks) {
            if (!overlaps(player.x, player.y, player.w, player.h, rock.x, rock.y, rock.w, rock.h)) {
                continue;
            }
            if (dy > 0) {
                player.y = rock.y - player.h;
            } else if (dy < 0) {
                player.y = rock.y + rock.h;
            }
            player.vy = 0;
        }

        player.y = Math.max(0, Math.min(this.level.height - player.h, player.y));
    }

    // --------------------------------------------------------------- oxygen

    updateOxygen(dt) {
        if (this.atSurface()) {
            this.oxygen = Math.min(TUNING.maxOxygen, this.oxygen + TUNING.surfaceRefillPerSecond * dt);
            return;
        }

        let drain = this.carrying ? TUNING.drainCarrying : TUNING.drainPerSecond;
        if (this.abilities.calm > 0) {
            drain *= TUNING.calmDrainScale;
        }

        const before = this.oxygen;
        this.oxygen = Math.max(0, this.oxygen - drain * dt);

        if (!this.lowAirWarned && this.oxygen <= TUNING.lowOxygen && before > TUNING.lowOxygen) {
            this.lowAirWarned = true;
            this.registerSetback("lowair", false);
            return;
        }

        if (this.oxygen <= 0) {
            this.rescue();
        }
    }

    updateBubbleRespawns(dt) {
        for (const bubble of this.level.oxygen) {
            if (bubble.taken) {
                bubble.timer -= dt;
                if (bubble.timer <= 0) {
                    bubble.taken = false;
                }
            }
        }
    }

    /** Out of air: the dive buddy grabs you and tows you back to the ship. */
    rescue() {
        this.stats.rescues += 1;

        if (this.carrying) {
            this.dropTreasure();
        }

        this.rescuing = { t: 0 };
        this.emit("rescueStart");
    }

    /** The tow itself: a fast, straight glide up to the ship, air refilling. */
    updateRescue(dt) {
        const player = this.player;
        const target = {
            x: this.level.spawn.x - player.w / 2,
            y: this.level.spawn.y
        };

        this.rescuing.t += dt;
        this.oxygen = Math.min(TUNING.maxOxygen, this.oxygen + 45 * dt);

        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const distance = Math.hypot(dx, dy);
        const speed = 720;

        if (distance <= speed * dt) {
            player.x = target.x;
            player.y = target.y;
            player.vx = 0;
            player.vy = 0;
            player.invuln = 2;

            this.oxygen = TUNING.maxOxygen;
            this.lowAirWarned = false;
            this.rescuing = null;

            this.spawnSparkle(player.x + player.w / 2, player.y);
            this.registerSetback("panic", false);
            return;
        }

        player.vx = (dx / distance) * speed;
        player.vy = (dy / distance) * speed;
        player.x += player.vx * dt;
        player.y += player.vy * dt;
        player.facing = dx >= 0 ? 1 : -1;
        player.animTime += dt;

        // A stream of bubbles trails the pair as they race upward.
        if (Math.random() < dt * 22) {
            this.spawnPuff(player.x + player.w / 2, player.y + player.h, 2, "#cfeeff");
        }
    }

    /** The carried treasure floats back to where it was found. */
    dropTreasure() {
        if (!this.carrying) {
            return;
        }
        this.carrying.state = "waiting";
        this.carrying.pop = 0;
        this.carrying = null;
    }

    // ------------------------------------------------------------- triggers

    touchTreasure() {
        if (this.carrying) {
            return;
        }

        const player = this.player;

        for (const treasure of this.level.treasures) {
            if (treasure.state !== "waiting") {
                continue;
            }

            if (overlaps(player.x, player.y, player.w, player.h, treasure.x - 30, treasure.y - 30, 60, 60)) {
                treasure.state = "carried";
                this.carrying = treasure;
                this.spawnSparkle(treasure.x, treasure.y);
                this.emit("treasure", { name: treasure.name, value: treasure.value });
                return;
            }
        }
    }

    touchOxygen() {
        const player = this.player;

        for (const bubble of this.level.oxygen) {
            if (bubble.taken) {
                continue;
            }

            if (overlaps(player.x, player.y, player.w, player.h, bubble.x - 26, bubble.y - 26, 52, 52)) {
                bubble.taken = true;
                bubble.timer = TUNING.oxygenRespawn;
                this.oxygen = Math.min(TUNING.maxOxygen, this.oxygen + TUNING.oxygenPickup);
                this.stats.oxygenGrabbed += 1;
                this.spawnSparkle(bubble.x, bubble.y);
                this.emit("oxygen");

                if (this.oxygen > TUNING.lowOxygen) {
                    this.lowAirWarned = false;
                }
            }
        }
    }

    touchJellies() {
        const player = this.player;

        if (player.invuln > 0 || this.abilities.fins > 0) {
            return;
        }

        const cx = player.x + player.w / 2;
        const cy = player.y + player.h / 2;

        for (const jelly of this.level.jellies) {
            const jx = jelly.drawX === undefined ? jelly.x : jelly.drawX;
            const jy = jelly.drawY === undefined ? jelly.y : jelly.drawY;

            if (Math.hypot(cx - jx, cy - jy) < TUNING.jellyRadius + 26) {
                player.invuln = TUNING.stingInvulnSeconds;
                player.vx = (cx - jx) * 6;
                player.vy = (cy - jy) * 6;
                this.oxygen = Math.max(1, this.oxygen - TUNING.stingOxygen);
                this.stats.stings += 1;

                const dropped = Boolean(this.carrying);
                this.dropTreasure();
                this.spawnPuff(cx, cy, 10, "#e6b3ff");
                this.registerSetback("sting", false, { dropped: dropped });
                return;
            }
        }
    }

    touchBankZone() {
        if (!this.carrying) {
            return;
        }

        const player = this.player;
        const zone = this.level.bankZone;

        if (overlaps(player.x, player.y, player.w, player.h, zone.x, zone.y, zone.w, zone.h)) {
            const treasure = this.carrying;
            treasure.state = "banked";
            this.carrying = null;

            this.stats.banked += 1;
            this.stats.treasureValue += treasure.value;
            this.spawnSparkle(player.x + player.w / 2, player.y);
            this.emit("bank", { name: treasure.name, value: treasure.value });

            if (this.stats.banked >= this.stats.treasureTotal) {
                this.finished = true;
                this.frozen = true;
                this.emit("complete");
            }
        }
    }

    nearRect(rect, margin) {
        const player = this.player;
        return player.y + player.h > rect.y - margin
            && player.y < rect.y + rect.h + margin;
    }

    registerSetback(cause, respawn, extra) {
        this.stats.setbacks += 1;
        this.frozen = true;
        this.emit("setback", Object.assign({ cause: cause, respawn: respawn }, extra || {}));
    }

    resume() {
        this.frozen = false;
    }

    grantAbility(key, seconds) {
        if (Object.prototype.hasOwnProperty.call(this.abilities, key)) {
            this.abilities[key] = Math.max(this.abilities[key], seconds);
        }
    }

    /** Where the guiding light should point: the ship when hauling, else loot. */
    guideTarget() {
        if (this.carrying) {
            const zone = this.level.bankZone;
            return { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 };
        }

        const cx = this.player.x + this.player.w / 2;
        const cy = this.player.y + this.player.h / 2;
        let best = null;
        let bestDistance = Infinity;

        for (const treasure of this.level.treasures) {
            if (treasure.state !== "waiting") {
                continue;
            }
            const distance = Math.hypot(treasure.x - cx, treasure.y - cy);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = treasure;
            }
        }

        return best ? { x: best.x, y: best.y } : null;
    }

    // ------------------------------------------------------------ particles

    spawnPuff(x, y, count, color) {
        for (let i = 0; i < count; i += 1) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 26,
                y: y - Math.random() * 8,
                vx: (Math.random() - 0.5) * 90,
                vy: -30 - Math.random() * 70,
                life: 0.45 + Math.random() * 0.3,
                maxLife: 0.75,
                size: 3 + Math.random() * 5,
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
            particle.vy -= 60 * dt; // bubbles drift up
            particle.vx *= 1 - dt * 1.6;
        }
    }

    // --------------------------------------------------------------- camera

    updateCamera(dt, snap) {
        const player = this.player;
        const level = this.level;

        let targetX = player.x + player.w / 2 - this.viewWidth / 2;
        let targetY = player.y + player.h / 2 - this.viewHeight * 0.5;

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
