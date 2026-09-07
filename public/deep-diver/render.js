/**
 * Canvas drawing for Deep Diver.
 *
 * The camera always shows VIEW_HEIGHT world units vertically and as much width
 * as the screen allows, so the game fills a phone, a tablet or a desktop
 * without changing how it plays.
 *
 * Painted as an open ocean: sky and ship at the waterline, water that darkens
 * with depth, rocks, treasure glinting in the deep and jellyfish drifting by.
 */

import { images } from "./assets.js";

export const VIEW_HEIGHT = 620;

// On a tall phone the default zoom would only show a couple of body widths to
// either side, so we pull the camera back until this much world is in frame.
const MIN_VIEW_WIDTH = 430;

// Water colours: sunlit near the surface, deep and dark down on the seabed.
const WATER_LIGHT = "#2ea3d6";
const WATER_DEEP = "#04182b";
const SKY = "#aee3f7";

// Ambient bubbles drift up through the whole scene.
const BUBBLES = [];
for (let i = 0; i < 46; i += 1) {
    BUBBLES.push({
        x: Math.random(),
        y: Math.random(),
        size: 1.2 + Math.random() * 3.2,
        speed: 0.03 + Math.random() * 0.08,
        drift: Math.random() * Math.PI * 2
    });
}

/** Sizes the backing store for the device pixel ratio and returns the scale. */
export function resizeCanvas(canvas) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    let viewHeight = VIEW_HEIGHT;
    if ((width / height) * viewHeight < MIN_VIEW_WIDTH) {
        viewHeight = MIN_VIEW_WIDTH / (width / height);
    }

    const scale = height / viewHeight;

    return {
        scale: scale,
        viewWidth: width / scale,
        viewHeight: viewHeight
    };
}

function roundedPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, radius);
    } else {
        ctx.rect(x, y, w, h);
    }
}

// ------------------------------------------------------------------ background

function drawBackground(ctx, game, canvas, scale, viewHeight) {
    const width = canvas.width;
    const height = canvas.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const level = game.level;
    const camera = game.camera;
    const span = Math.max(1, level.height - level.waterline);
    const depthTop = Math.max(0, Math.min(1, (camera.y - level.waterline) / span));
    const depthBottom = Math.max(0, Math.min(1, (camera.y + viewHeight - level.waterline) / span));

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, mixWater(depthTop));
    gradient.addColorStop(1, mixWater(depthBottom));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Sky above the waterline, when it's in frame.
    const waterlineScreen = (level.waterline - camera.y) * scale;
    if (waterlineScreen > 0) {
        ctx.fillStyle = SKY;
        ctx.fillRect(0, 0, width, Math.min(height, waterlineScreen));

        // Rippling waterline.
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        const steps = 24;
        for (let i = 0; i <= steps; i += 1) {
            const wx = (width * i) / steps;
            const wy = waterlineScreen + Math.sin(game.time * 2.4 + i * 0.9) * 5;
            if (i === 0) {
                ctx.moveTo(wx, wy);
            } else {
                ctx.lineTo(wx, wy);
            }
        }
        ctx.stroke();
    }

    drawGodRays(ctx, game, width, height, depthTop);
    drawBubbles(ctx, game, width, height);

    // A touch of deep-blue haze so sprites read cleanly against the water.
    ctx.fillStyle = "rgba(6, 30, 52, 0.12)";
    ctx.fillRect(0, 0, width, height);
}

/** Blends the light surface colour toward the deep colour by depth 0..1. */
function mixWater(depth) {
    const a = hexToRgb(WATER_LIGHT);
    const b = hexToRgb(WATER_DEEP);
    const t = Math.pow(Math.max(0, depth), 0.75);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return "rgb(" + r + "," + g + "," + bl + ")";
}

function hexToRgb(hex) {
    const value = parseInt(hex.slice(1), 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

/** Soft shafts of sunlight, strongest near the surface. */
function drawGodRays(ctx, game, width, height, depthTop) {
    const strength = Math.max(0, 0.5 - depthTop) * 0.5;
    if (strength <= 0.01) {
        return;
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i += 1) {
        const sway = Math.sin(game.time * 0.3 + i) * width * 0.05;
        const x = (i + 0.5) * (width / 4) + sway;
        ctx.fillStyle = "rgba(180, 234, 255, " + strength.toFixed(3) + ")";
        ctx.beginPath();
        ctx.moveTo(x - 40, 0);
        ctx.lineTo(x + 40, 0);
        ctx.lineTo(x + 150, height);
        ctx.lineTo(x - 30, height);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

function drawBubbles(ctx, game, width, height) {
    const drift = game.time;
    ctx.fillStyle = "rgba(220, 246, 255, 0.5)";

    for (const bubble of BUBBLES) {
        const y = ((bubble.y - drift * bubble.speed) % 1 + 1) % 1 * height;
        const x = ((bubble.x + Math.sin(drift * 0.5 + bubble.drift) * 0.02) % 1) * width;
        ctx.beginPath();
        ctx.arc(x, y, bubble.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ---------------------------------------------------------------------- ship

function drawShip(ctx, game) {
    const ship = game.level.ship;
    const bob = Math.sin(game.time * 1.4) * 4;
    const x = ship.x;
    const y = ship.y + bob;

    ctx.save();

    // Hull.
    ctx.fillStyle = "#6b4226";
    ctx.beginPath();
    ctx.moveTo(x, y + 40);
    ctx.lineTo(x + ship.w, y + 40);
    ctx.lineTo(x + ship.w - 60, y + ship.h);
    ctx.lineTo(x + 60, y + ship.h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#8a5a33";
    ctx.fillRect(x + 10, y + 26, ship.w - 20, 18);

    // Mast and sail.
    ctx.fillStyle = "#4e3018";
    ctx.fillRect(x + ship.w / 2 - 6, y - 110, 12, 140);
    ctx.fillStyle = "#f4ead2";
    ctx.beginPath();
    ctx.moveTo(x + ship.w / 2 + 8, y - 104);
    ctx.quadraticCurveTo(x + ship.w / 2 + 120, y - 60, x + ship.w / 2 + 8, y - 8);
    ctx.closePath();
    ctx.fill();

    // Flag.
    ctx.fillStyle = "#f6e05e";
    ctx.beginPath();
    ctx.moveTo(x + ship.w / 2 - 6, y - 110);
    ctx.lineTo(x + ship.w / 2 - 52, y - 98);
    ctx.lineTo(x + ship.w / 2 - 6, y - 86);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // The drop-off spot, glowing under the hull.
    const zone = game.level.bankZone;
    const pulse = 0.28 + Math.sin(game.time * 3) * 0.1;
    ctx.save();
    ctx.fillStyle = "rgba(246, 224, 94, " + pulse.toFixed(3) + ")";
    roundedPath(ctx, zone.x, zone.y, zone.w, zone.h, 26);
    ctx.fill();
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = "rgba(246, 224, 94, 0.85)";
    ctx.lineWidth = 3;
    roundedPath(ctx, zone.x, zone.y, zone.w, zone.h, 26);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 250, 220, 0.95)";
    ctx.font = "900 20px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DROP TREASURE HERE", zone.x + zone.w / 2, zone.y + zone.h / 2 + 6);
    ctx.restore();
}

// --------------------------------------------------------------------- rocks

function drawRock(ctx, rock) {
    ctx.save();

    ctx.fillStyle = "rgba(3, 18, 32, 0.34)";
    roundedPath(ctx, rock.x + 5, rock.y + 8, rock.w, rock.h, 26);
    ctx.fill();

    const body = ctx.createLinearGradient(0, rock.y, 0, rock.y + rock.h);
    body.addColorStop(0, "#4c5c6b");
    body.addColorStop(1, "#2a3742");
    ctx.fillStyle = body;
    roundedPath(ctx, rock.x, rock.y, rock.w, rock.h, 26);
    ctx.fill();

    // A fringe of seaweed growth on top.
    ctx.fillStyle = "rgba(96, 190, 150, 0.55)";
    const tufts = Math.max(2, Math.round(rock.w / 60));
    for (let i = 0; i < tufts; i += 1) {
        const tx = rock.x + 24 + ((rock.w - 48) * i) / Math.max(1, tufts - 1);
        ctx.beginPath();
        ctx.ellipse(tx, rock.y + 4, 16, 8, 0, Math.PI, 0);
        ctx.fill();
    }

    ctx.strokeStyle = "rgba(4, 24, 40, 0.4)";
    ctx.lineWidth = 2.5;
    roundedPath(ctx, rock.x, rock.y, rock.w, rock.h, 26);
    ctx.stroke();

    ctx.restore();
}

// ------------------------------------------------------------------ pick-ups

function drawTreasures(ctx, game) {
    for (const treasure of game.level.treasures) {
        if (treasure.state !== "waiting") {
            continue;
        }

        const bob = Math.sin(game.time * 2 + treasure.x * 0.01) * 4;
        const x = treasure.x;
        const y = treasure.y + bob;

        ctx.save();

        // Golden glow so loot is visible from a distance in dark water.
        const glow = 0.22 + Math.sin(game.time * 2.6 + treasure.y) * 0.08;
        ctx.fillStyle = "rgba(246, 224, 94, " + glow.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(x, y, 42, 0, Math.PI * 2);
        ctx.fill();

        // Chest base.
        ctx.fillStyle = "#7a4a22";
        roundedPath(ctx, x - 26, y - 12, 52, 32, 7);
        ctx.fill();
        ctx.fillStyle = "#93591f";
        roundedPath(ctx, x - 26, y - 22, 52, 16, 8);
        ctx.fill();
        ctx.fillStyle = "#f6e05e";
        ctx.fillRect(x - 5, y - 12, 10, 14);
        ctx.strokeStyle = "#3f2712";
        ctx.lineWidth = 2.5;
        roundedPath(ctx, x - 26, y - 22, 52, 42, 8);
        ctx.stroke();

        // Icon + value tag above.
        ctx.font = "26px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(treasure.icon, x, y - 34);
        ctx.fillStyle = "rgba(255, 250, 220, 0.95)";
        ctx.font = "800 15px Nunito, sans-serif";
        ctx.fillText("+" + treasure.value, x, y + 40);

        ctx.restore();
    }
}

function drawOxygen(ctx, game) {
    for (const bubble of game.level.oxygen) {
        if (bubble.taken) {
            continue;
        }

        const bob = Math.sin(game.time * 2.6 + bubble.x * 0.02) * 6;
        const x = bubble.x;
        const y = bubble.y + bob;

        ctx.save();

        ctx.fillStyle = "rgba(180, 240, 255, 0.22)";
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(200, 245, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.font = "900 13px Nunito, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("O₂", x, y + 5);

        ctx.restore();
    }
}

// -------------------------------------------------------------------- hazards

function drawJellies(ctx, game) {
    for (const jelly of game.level.jellies) {
        const x = jelly.drawX === undefined ? jelly.x : jelly.drawX;
        const y = jelly.drawY === undefined ? jelly.y : jelly.drawY;
        const squish = 1 + Math.sin(jelly.phase * 3) * 0.08;

        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = "rgba(226, 160, 255, 0.28)";
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();

        // Bell.
        ctx.fillStyle = "rgba(230, 170, 255, 0.85)";
        ctx.beginPath();
        ctx.ellipse(0, -6, 26 * squish, 22 / squish, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fill();

        // Tentacles.
        ctx.strokeStyle = "rgba(230, 170, 255, 0.7)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        for (let i = -2; i <= 2; i += 1) {
            const sway = Math.sin(jelly.phase * 4 + i) * 6;
            ctx.beginPath();
            ctx.moveTo(i * 9, -4);
            ctx.quadraticCurveTo(i * 9 + sway, 16, i * 9 + sway * 1.6, 32);
            ctx.stroke();
        }

        ctx.restore();
    }
}

/** Surging current streaks. */
function drawCurrents(ctx, game) {
    for (const current of game.level.currents) {
        if (!current.active) {
            continue;
        }

        ctx.save();
        ctx.strokeStyle = "rgba(190, 240, 255, 0.5)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";

        for (let i = 0; i < 18; i += 1) {
            const seed = i * 137.5;
            const y = current.y + ((seed % current.h) + i * 7) % current.h;
            const travel = (game.time * 460 + seed * 3) % (current.w + 220);
            const x = current.direction > 0
                ? current.x + travel - 220
                : current.x + current.w - travel;
            const length = (60 + (i % 4) * 26) * current.direction;

            ctx.globalAlpha = 0.28 + (i % 3) * 0.14;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + length, y);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ------------------------------------------------------------- guiding light

function drawGuide(ctx, game) {
    if (game.abilities.light <= 0) {
        return;
    }

    const target = game.guideTarget();
    if (!target) {
        return;
    }

    const px = game.player.x + game.player.w / 2;
    const py = game.player.y + game.player.h / 2;
    const angle = Math.atan2(target.y - py, target.x - px);
    const pulse = (game.time * 140) % 70;

    ctx.save();
    for (let i = 0; i < 6; i += 1) {
        const distance = 60 + i * 70 + pulse;
        const alpha = Math.max(0, 0.85 - i * 0.13);
        ctx.fillStyle = "rgba(140, 236, 255, " + alpha.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(px + Math.cos(angle) * distance, py + Math.sin(angle) * distance, 7 - i * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawParticles(ctx, game) {
    for (const particle of game.particles) {
        const alpha = Math.max(0, particle.life / particle.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// -------------------------------------------------------------------- player

/**
 * The swim pose: the diver's body rotates so their head points where they're
 * going — head-down when diving, horizontal when cruising, upright when idle.
 * The rotation happens in facing-flipped space so it mirrors cleanly and the
 * sprite is never upside down.
 */
function swimRotation(player, moving) {
    let target = 0;

    if (moving) {
        // Angle of travel with sideways speed folded into facing space.
        const rel = Math.atan2(player.vy, Math.abs(player.vx) + 0.001);
        target = rel + Math.PI / 2;
    }

    if (player.swimRot === undefined) {
        player.swimRot = 0;
    }
    player.swimRot += (target - player.swimRot) * 0.14;
    return player.swimRot;
}

function drawDiverSprite(ctx, sprite, tint, x, y, facing, rotation, wobble) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    ctx.rotate(rotation + wobble);

    const height = 96;

    if (sprite) {
        const width = height * (sprite.width / sprite.height);
        ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
    } else {
        ctx.fillStyle = tint;
        roundedPath(ctx, -18, -height / 2, 36, height, 14);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * The dive buddy, drawn only during a rescue: they swim just ahead of the
 * player along the tow direction, holding on with a visible grip.
 */
function drawBuddy(ctx, game, character, playerX, playerY, playerRot) {
    const player = game.player;

    // The buddy is always a different diver than the one the player picked.
    const buddyKey = character.image === "climber-teal" ? "climber-orange" : "climber-teal";
    const buddyTint = character.image === "climber-teal" ? "#dd6b20" : "#2c9c92";

    // Just ahead of the player along the direction of travel.
    const speed = Math.hypot(player.vx, player.vy) || 1;
    const dirX = player.vx / speed;
    const dirY = player.vy / speed;
    const buddyX = playerX + dirX * 74;
    const buddyY = playerY + dirY * 74;

    // The grip: a short arm from the buddy back to the player's wrist.
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(buddyX - dirX * 26, buddyY - dirY * 26);
    ctx.lineTo(playerX + dirX * 24, playerY + dirY * 24);
    ctx.stroke();
    ctx.restore();

    const wobble = Math.sin(player.animTime * 13) * 0.1;
    drawDiverSprite(ctx, images[buddyKey], buddyTint, buddyX, buddyY, player.facing, playerRot, wobble);

    // A little "got you!" glow around the pair.
    ctx.save();
    ctx.strokeStyle = "rgba(160, 240, 255, 0.5)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.arc((playerX + buddyX) / 2, (playerY + buddyY) / 2, 84, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawPlayer(ctx, game, character) {
    const player = game.player;
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;

    const speed = Math.hypot(player.vx, player.vy);
    const swimming = speed > 30 || Boolean(game.rescuing);
    const rotation = swimRotation(player, swimming);

    // A flutter-kick wobble while moving, a slow drift when hanging still.
    const wobble = swimming
        ? Math.sin(player.animTime * 11) * 0.09
        : Math.sin(player.animTime * 2.2) * 0.05;

    ctx.save();

    // Flash while invulnerable after a sting.
    if (player.invuln > 0 && !game.rescuing && Math.sin(game.time * 24) > 0) {
        ctx.globalAlpha = 0.45;
    }

    drawDiverSprite(
        ctx,
        images[character.image],
        character.tint,
        centerX,
        centerY,
        player.facing,
        rotation,
        wobble
    );

    ctx.restore();

    if (game.rescuing) {
        drawBuddy(ctx, game, character, centerX, centerY, rotation);
    }

    // Carried treasure floats just behind the diver.
    if (game.carrying) {
        const tx = centerX - player.facing * 34;
        const ty = centerY + 16 + Math.sin(game.time * 4) * 3;

        ctx.save();
        ctx.fillStyle = "rgba(246, 224, 94, 0.3)";
        ctx.beginPath();
        ctx.arc(tx, ty, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(game.carrying.icon, tx, ty + 8);
        ctx.restore();
    }

    // Ability rings.
    if (game.abilities.calm > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(160, 240, 255, 0.85)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 56 + Math.sin(game.time * 5) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    if (game.abilities.fins > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(150, 255, 200, 0.8)";
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// ---------------------------------------------------------------------- draw

export function draw(ctx, game, character) {
    const canvas = ctx.canvas;
    const view = resizeCanvas(canvas);
    game.setViewport(view.viewWidth, view.viewHeight);

    drawBackground(ctx, game, canvas, view.scale, view.viewHeight);

    ctx.setTransform(
        view.scale, 0, 0, view.scale,
        -game.camera.x * view.scale,
        -game.camera.y * view.scale
    );

    drawShip(ctx, game);

    for (const rock of game.level.rocks) {
        drawRock(ctx, rock);
    }

    drawCurrents(ctx, game);
    drawTreasures(ctx, game);
    drawOxygen(ctx, game);
    drawJellies(ctx, game);
    drawGuide(ctx, game);
    drawPlayer(ctx, game, character);
    drawParticles(ctx, game);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}
