/**
 * Canvas drawing for Deep Diver.
 *
 * The camera always shows VIEW_HEIGHT world units vertically and as much width
 * as the screen allows, so the game fills a phone, a tablet or a desktop
 * without changing how it plays. Every image has a flat-colour fallback.
 *
 * Same drawing pipeline as The Impossible Mountain, painted as an ocean: the
 * surface is bright at the top of the world and the seabed is dark at the bottom,
 * so rising toward the goal literally means swimming up into the light.
 */

import { images } from "./assets.js";

export const VIEW_HEIGHT = 620;

// On a tall phone the default zoom would only show a couple of body widths to
// either side, so we pull the camera back until this much world is in frame.
const MIN_VIEW_WIDTH = 430;

// Water colours: sunlit near the surface, deep and dark down on the seabed.
const WATER_LIGHT = "#2ea3d6";
const WATER_DEEP = "#062338";

// Rising bubbles drift up through the whole scene.
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

    // How deep the top of the view currently is, 0 at the surface, 1 on the bed.
    const level = game.level;
    const camera = game.camera;
    const span = Math.max(1, level.height - viewHeight);
    const depthTop = Math.max(0, Math.min(1, camera.y / span));
    const depthBottom = Math.max(0, Math.min(1, (camera.y + viewHeight) / span));

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, mixWater(depthTop));
    gradient.addColorStop(1, mixWater(depthBottom));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

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
    const t = Math.pow(depth, 0.8);
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
        // Bubbles rise, so they travel up the screen over time.
        const y = ((bubble.y - drift * bubble.speed) % 1 + 1) % 1 * height;
        const x = ((bubble.x + Math.sin(drift * 0.5 + bubble.drift) * 0.02) % 1) * width;
        ctx.beginPath();
        ctx.arc(x, y, bubble.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ------------------------------------------------------------------- terrain

function drawPlatform(ctx, platform, game) {
    if (platform.gone) {
        ctx.save();
        ctx.setLineDash([10, 9]);
        ctx.strokeStyle = "rgba(210, 245, 255, 0.5)";
        ctx.lineWidth = 3;
        roundedPath(ctx, platform.x, platform.y, platform.w, platform.h, 10);
        ctx.stroke();
        ctx.restore();
        return;
    }

    let shakeX = 0;
    let alpha = 1;

    if (platform.crumbling) {
        shakeX = Math.sin(game.time * 60) * 3.5;
        alpha = 0.75 + Math.sin(game.time * 30) * 0.2;
    }

    ctx.save();
    ctx.translate(shakeX, 0);
    ctx.globalAlpha = alpha;

    // Soft drop shadow keeps ledges readable against the water.
    ctx.fillStyle = "rgba(3, 18, 32, 0.34)";
    roundedPath(ctx, platform.x + 4, platform.y + 7, platform.w, platform.h, 10);
    ctx.fill();

    const isIce = platform.type === "ice";
    const isCrumble = platform.type === "crumble";

    ctx.save();
    roundedPath(ctx, platform.x, platform.y, platform.w, platform.h, 10);
    ctx.clip();

    // Slick kelp-smoothed rock is teal; coral shelves are warm; fragile coral pale.
    let base = "#5a4632";
    let cap = "#7a6244";
    if (isIce) {
        base = "#1f7d78";
        cap = "#57c7bd";
    } else if (isCrumble) {
        base = "#8a5f5a";
        cap = "#b98a80";
    }

    const body = ctx.createLinearGradient(0, platform.y, 0, platform.y + platform.h);
    body.addColorStop(0, cap);
    body.addColorStop(1, base);
    ctx.fillStyle = body;
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);

    // A ridge of growth along the top edge, the surface the diver pushes off.
    ctx.fillStyle = isIce ? "rgba(150, 240, 230, 0.8)" : "rgba(120, 210, 180, 0.55)";
    const bumps = Math.max(2, Math.round(platform.w / 26));
    ctx.beginPath();
    ctx.moveTo(platform.x, platform.y + 6);
    for (let i = 0; i <= bumps; i += 1) {
        const bx = platform.x + (platform.w * i) / bumps;
        const by = platform.y + (i % 2 === 0 ? 1 : 5);
        ctx.lineTo(bx, by);
    }
    ctx.lineTo(platform.x + platform.w, platform.y + 8);
    ctx.lineTo(platform.x, platform.y + 8);
    ctx.closePath();
    ctx.fill();

    if (isCrumble) {
        ctx.strokeStyle = "rgba(60, 30, 30, 0.7)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(platform.x + platform.w * 0.3, platform.y);
        ctx.lineTo(platform.x + platform.w * 0.38, platform.y + platform.h);
        ctx.moveTo(platform.x + platform.w * 0.68, platform.y);
        ctx.lineTo(platform.x + platform.w * 0.6, platform.y + platform.h);
        ctx.stroke();
    }

    ctx.restore();

    ctx.strokeStyle = "rgba(4, 24, 40, 0.4)";
    ctx.lineWidth = 2.5;
    roundedPath(ctx, platform.x, platform.y, platform.w, platform.h, 10);
    ctx.stroke();

    ctx.restore();
}

function drawHintRoute(ctx, game) {
    if (game.abilities.hint <= 0) {
        return;
    }

    const pulse = 0.5 + Math.sin(game.time * 6) * 0.35;
    const playerY = game.player.y;

    for (const id of game.level.route) {
        const platform = game.level.platforms.find(function (item) {
            return item.id === id;
        });

        if (!platform || platform.y > playerY + 140 || platform.y < playerY - 620) {
            continue;
        }

        ctx.save();
        ctx.strokeStyle = "rgba(140, 236, 255, " + (0.55 + pulse * 0.45).toFixed(3) + ")";
        ctx.lineWidth = 6;
        ctx.shadowColor = "rgba(120, 220, 255, 0.9)";
        ctx.shadowBlur = 18;
        roundedPath(ctx, platform.x - 3, platform.y - 3, platform.w + 6, platform.h + 6, 12);
        ctx.stroke();
        ctx.restore();
    }
}

// ----------------------------------------------------------------- set pieces

/** Air bubbles to gather (the old "crystals"). */
function drawCrystals(ctx, game) {
    for (const crystal of game.level.crystals) {
        if (crystal.taken) {
            continue;
        }

        const bob = Math.sin(game.time * 2.6 + crystal.x * 0.02) * 6;
        const y = crystal.y + bob;

        ctx.save();
        ctx.translate(crystal.x, y);

        ctx.fillStyle = "rgba(180, 240, 255, 0.22)";
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();

        // A glassy bubble with a highlight.
        ctx.fillStyle = "rgba(200, 245, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(-5, -5, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/** Glowing air pockets you resurface to (the old "checkpoints"). */
function drawCheckpoints(ctx, game) {
    for (const checkpoint of game.level.checkpoints) {
        const x = checkpoint.x;
        const y = checkpoint.y;

        ctx.save();

        // A little vent in the rock releasing a stream of bubbles.
        ctx.fillStyle = "#3a2e22";
        roundedPath(ctx, x - 16, y - 20, 32, 20, 6);
        ctx.fill();

        const active = checkpoint.active;
        const glow = active ? "rgba(120, 236, 255, 0.34)" : "rgba(150, 180, 200, 0.18)";
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y - 60, 40 + (active ? Math.sin(game.time * 3) * 5 : 0), 0, Math.PI * 2);
        ctx.fill();

        const count = 5;
        for (let i = 0; i < count; i += 1) {
            const phase = (game.time * (active ? 1.4 : 0.7) + i / count) % 1;
            const by = y - 18 - phase * 84;
            const bx = x + Math.sin(phase * Math.PI * 3 + i) * 9;
            ctx.fillStyle = active
                ? "rgba(190, 245, 255, " + (0.8 - phase * 0.7).toFixed(2) + ")"
                : "rgba(200, 220, 235, " + (0.5 - phase * 0.45).toFixed(2) + ")";
            ctx.beginPath();
            ctx.arc(bx, by, 3 + phase * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

/** The surface: bright light and a rippling waterline (the old "goal"). */
function drawGoal(ctx, game) {
    const goal = game.level.goal;
    const x = goal.x + goal.w / 2;
    const baseY = goal.y + goal.h;

    ctx.save();

    ctx.fillStyle = "rgba(190, 244, 255, " + (0.26 + Math.sin(game.time * 2) * 0.08).toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(x, baseY - 60, 96, 0, Math.PI * 2);
    ctx.fill();

    // Rippling waterline across the top of the surface glow.
    ctx.strokeStyle = "rgba(235, 252, 255, 0.9)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i <= 12; i += 1) {
        const wx = x - 90 + (180 * i) / 12;
        const wy = baseY - 120 + Math.sin(game.time * 4 + i) * 6;
        if (i === 0) {
            ctx.moveTo(wx, wy);
        } else {
            ctx.lineTo(wx, wy);
        }
    }
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "700 22px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SURFACE", x, baseY - 84);

    ctx.restore();
}

function drawSigns(ctx, game) {
    for (const zone of game.level.zones) {
        if (zone.kind !== "deadend") {
            continue;
        }

        const x = zone.x + zone.w / 2;
        const y = zone.y + zone.h;

        ctx.save();
        ctx.fillStyle = "#2f5461";
        fillRoundRect(ctx, x - 78, y - 100, 156, 50, 10);
        ctx.strokeStyle = "#7fd6e0";
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = "#eafcff";
        ctx.font = "900 20px Nunito, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("NO WAY UP", x, y - 76);
        ctx.font = "800 14px Nunito, sans-serif";
        ctx.fillText("try the other side", x, y - 60);
        ctx.restore();
    }
}

function fillRoundRect(ctx, x, y, w, h, r) {
    roundedPath(ctx, x, y, w, h, r);
    ctx.fill();
    roundedPath(ctx, x, y, w, h, r);
}

/** Surging current streaks (the old "wind"). */
function drawWind(ctx, game) {
    for (const zone of game.level.zones) {
        if (zone.kind !== "wind" || !zone.active) {
            continue;
        }

        ctx.save();
        ctx.strokeStyle = "rgba(190, 240, 255, 0.5)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";

        for (let i = 0; i < 16; i += 1) {
            const seed = i * 137.5;
            const y = zone.y + ((seed % zone.h) + i * 7) % zone.h;
            const travel = (game.time * 420 + seed * 3) % (zone.w + 220);
            const x = zone.x + zone.w - travel;
            const length = 60 + (i % 4) * 26;

            ctx.globalAlpha = 0.28 + (i % 3) * 0.14;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + length, y);
            ctx.stroke();
        }

        ctx.restore();
    }
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

function drawPlayer(ctx, game, character) {
    const player = game.player;
    const centerX = player.x + player.w / 2;
    const footY = player.y + player.h;

    ctx.save();

    ctx.fillStyle = "rgba(3, 18, 32, 0.24)";
    ctx.beginPath();
    ctx.ellipse(centerX, footY + 4, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const swimming = player.onGround && Math.abs(player.vx) > 60;
    const bob = swimming ? Math.abs(Math.sin(player.animTime * 13)) * 5 : Math.sin(player.animTime * 2.4) * 3;
    const squashY = 1 + player.squash;
    const squashX = 1 - player.squash * 0.55;

    let tilt = 0;
    if (swimming) {
        tilt = Math.sin(player.animTime * 13) * 0.06 + player.facing * 0.05;
    } else if (!player.onGround) {
        tilt = player.facing * (player.vy < 0 ? 0.12 : -0.08);
    }

    ctx.translate(centerX, footY - bob);
    ctx.rotate(tilt);
    ctx.scale(player.facing * squashX, squashY);

    const sprite = images[character.image];
    const height = 104;

    if (sprite) {
        const width = height * (sprite.width / sprite.height);
        ctx.drawImage(sprite, -width / 2, -height, width, height);
    } else {
        ctx.fillStyle = character.tint;
        roundedPath(ctx, -20, -height, 40, height, 14);
        ctx.fill();
    }

    ctx.restore();

    if (game.abilities.floaty > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(160, 240, 255, 0.85)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, footY - 52, 62 + Math.sin(game.time * 5) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    if (game.abilities.boost > 0) {
        ctx.save();
        ctx.fillStyle = "rgba(120, 236, 255, 0.5)";
        ctx.beginPath();
        ctx.ellipse(centerX, footY + 2, 30, 10, 0, 0, Math.PI * 2);
        ctx.fill();
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

    drawSigns(ctx, game);

    for (const platform of game.level.platforms) {
        drawPlatform(ctx, platform, game);
    }

    drawHintRoute(ctx, game);
    drawCheckpoints(ctx, game);
    drawGoal(ctx, game);
    drawCrystals(ctx, game);
    drawWind(ctx, game);
    drawPlayer(ctx, game, character);
    drawParticles(ctx, game);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}
