/**
 * Canvas drawing for The Impossible Mountain.
 *
 * The camera always shows VIEW_HEIGHT world units vertically and as much width
 * as the screen allows, so the game fills a phone, a tablet or a desktop
 * without changing how it plays. Every image has a flat-colour fallback.
 */

import { images } from "./assets.js";

export const VIEW_HEIGHT = 620;

// On a tall phone the default zoom would only show a couple of body widths to
// either side, so we pull the camera back until this much world is in frame.
const MIN_VIEW_WIDTH = 430;

// World units covered by one texture tile. Bigger reads as chunky rock at the
// sizes these ledges are actually drawn.
const TILE = 130;
const SKY_TOP = "#1c74c4";
const SKY_BOTTOM = "#8fcdf0";

// Wispy foreground clouds. The painted background already has its own, so
// these stay faint and only add a sense of drifting height.
const CLOUDS = [
    { x: 120, y: 420, scale: 1.15 },
    { x: 700, y: 1180, scale: 0.85 },
    { x: 260, y: 1900, scale: 1.3 },
    { x: 900, y: 2500, scale: 0.95 }
];

const SNOWFLAKES = [];
for (let i = 0; i < 60; i += 1) {
    SNOWFLAKES.push({
        x: Math.random(),
        y: Math.random(),
        size: 1.4 + Math.random() * 2.6,
        speed: 0.02 + Math.random() * 0.05,
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

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, SKY_TOP);
    gradient.addColorStop(1, SKY_BOTTOM);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const sky = images.sky;
    const level = game.level;
    const camera = game.camera;
    const viewHeightPx = height;

    if (sky) {
        // Map the camera's vertical travel onto the artwork so the summit shows
        // the top of the painting and the base shows the treeline.
        const span = Math.max(1, level.height - viewHeight);
        const t = Math.max(0, Math.min(1, camera.y / span));

        const drawHeight = viewHeightPx * 1.5;
        const drawWidth = Math.max(width, drawHeight * (sky.width / sky.height));
        const y = t * (viewHeightPx - drawHeight);
        const x = (width - drawWidth) / 2 - (camera.x * scale * 0.12);

        ctx.globalAlpha = 0.96;
        ctx.drawImage(sky, x, y, drawWidth, drawHeight);
        ctx.globalAlpha = 1;
    }

    // Soft haze so sprites read clearly against the painting.
    ctx.fillStyle = "rgba(190, 224, 248, 0.18)";
    ctx.fillRect(0, 0, width, height);

    drawSnow(ctx, game, width, height);
}

function drawSnow(ctx, game, width, height) {
    const drift = game.time;
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";

    for (const flake of SNOWFLAKES) {
        const y = ((flake.y + drift * flake.speed) % 1) * height;
        const x = ((flake.x + Math.sin(drift * 0.4 + flake.drift) * 0.02) % 1) * width;
        ctx.beginPath();
        ctx.arc(x, y, flake.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawClouds(ctx, game) {
    const camera = game.camera;

    for (const cloud of CLOUDS) {
        // Parallax: clouds lag behind the world so distance reads clearly.
        const x = cloud.x + Math.sin(game.time * 0.06 + cloud.y) * 40 + camera.x * 0.35;
        const y = cloud.y + camera.y * 0.22;
        const s = cloud.scale;

        ctx.save();
        ctx.filter = "blur(6px)";
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.ellipse(x, y, 90 * s, 24 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 62 * s, y + 8 * s, 52 * s, 17 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 66 * s, y + 10 * s, 58 * s, 18 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ------------------------------------------------------------------- terrain

/**
 * Fills a rect with the rocky middle of a tile. The artwork has a snow cap
 * baked into its top edge, so sampling below it stops the cap from repeating
 * down the face of tall blocks; drawSnowCap paints a crisp one instead.
 */
function drawTexturedBody(ctx, image, x, y, w, h) {
    const sourceY = Math.round(image.height * 0.3);
    const sourceHeight = image.height - sourceY;
    const tileHeight = TILE * 0.78;

    const columns = Math.ceil(w / TILE);
    const rows = Math.ceil(h / tileHeight);

    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            ctx.drawImage(
                image,
                0, sourceY, image.width, sourceHeight,
                x + column * TILE, y + row * tileHeight, TILE, tileHeight
            );
        }
    }
}

/** Scalloped snow along the top edge of a ledge. */
function drawSnowCap(ctx, x, y, w, height, color) {
    const bumps = Math.max(2, Math.round(w / 30));

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - 2);
    ctx.lineTo(x + w, y - 2);
    ctx.lineTo(x + w, y + height);

    for (let i = bumps; i > 0; i -= 1) {
        const from = x + (w * i) / bumps;
        const to = x + (w * (i - 1)) / bumps;
        ctx.quadraticCurveTo((from + to) / 2, y + height + 7, to, y + height);
    }

    ctx.closePath();
    ctx.fill();
}

function drawPlatform(ctx, platform, game) {
    if (platform.gone) {
        ctx.save();
        ctx.setLineDash([10, 9]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
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

    // Drop shadow keeps ledges readable against the bright painting.
    ctx.fillStyle = "rgba(12, 40, 68, 0.28)";
    roundedPath(ctx, platform.x + 4, platform.y + 7, platform.w, platform.h, 10);
    ctx.fill();

    const isIce = platform.type === "ice";
    const texture = isIce ? images.ice : images.rock;

    ctx.save();
    roundedPath(ctx, platform.x, platform.y, platform.w, platform.h, 10);
    ctx.clip();

    if (texture) {
        drawTexturedBody(ctx, texture, platform.x, platform.y, platform.w, platform.h);
    } else {
        ctx.fillStyle = isIce ? "#a8dcf7" : "#a0703f";
        ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    }

    if (platform.type === "crumble") {
        ctx.fillStyle = "rgba(196, 138, 76, 0.35)";
        ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    }

    drawSnowCap(
        ctx,
        platform.x,
        platform.y,
        platform.w,
        Math.min(13, platform.h * 0.42),
        isIce ? "rgba(255, 255, 255, 0.72)" : "#f7fbff"
    );

    ctx.restore();

    if (platform.type === "crumble") {
        ctx.strokeStyle = "rgba(120, 70, 30, 0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(platform.x + platform.w * 0.3, platform.y);
        ctx.lineTo(platform.x + platform.w * 0.38, platform.y + platform.h);
        ctx.moveTo(platform.x + platform.w * 0.68, platform.y);
        ctx.lineTo(platform.x + platform.w * 0.6, platform.y + platform.h);
        ctx.stroke();
    }

    ctx.strokeStyle = "rgba(18, 50, 79, 0.35)";
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
        ctx.strokeStyle = "rgba(255, 214, 102, " + (0.55 + pulse * 0.45).toFixed(3) + ")";
        ctx.lineWidth = 6;
        ctx.shadowColor = "rgba(255, 200, 60, 0.9)";
        ctx.shadowBlur = 18;
        roundedPath(ctx, platform.x - 3, platform.y - 3, platform.w + 6, platform.h + 6, 12);
        ctx.stroke();
        ctx.restore();
    }
}

// ----------------------------------------------------------------- set pieces

function drawCrystals(ctx, game) {
    for (const crystal of game.level.crystals) {
        if (crystal.taken) {
            continue;
        }

        const bob = Math.sin(game.time * 2.6 + crystal.x * 0.02) * 6;
        const y = crystal.y + bob;

        ctx.save();
        ctx.translate(crystal.x, y);

        ctx.fillStyle = "rgba(140, 230, 255, 0.28)";
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();

        const gem = images.crystal;
        if (gem) {
            const height = 40;
            const width = height * (gem.width / gem.height);
            ctx.drawImage(gem, -width / 2, -height / 2, width, height);
        } else {
            ctx.fillStyle = "#63e0ff";
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(14, 0);
            ctx.lineTo(0, 20);
            ctx.lineTo(-14, 0);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}

function drawCheckpoints(ctx, game) {
    for (const checkpoint of game.level.checkpoints) {
        const x = checkpoint.x;
        const y = checkpoint.y;

        ctx.save();

        ctx.fillStyle = "#6b4b2c";
        roundedPath(ctx, x - 4, y - 96, 8, 96, 4);
        ctx.fill();

        const wave = checkpoint.active ? Math.sin(game.time * 7) * 6 : 0;
        ctx.fillStyle = checkpoint.active ? "#f6ad55" : "#b9c7d4";
        ctx.beginPath();
        ctx.moveTo(x + 4, y - 92);
        ctx.quadraticCurveTo(x + 34, y - 84 + wave, x + 62, y - 74);
        ctx.lineTo(x + 62, y - 46);
        ctx.quadraticCurveTo(x + 34, y - 56 - wave, x + 4, y - 48);
        ctx.closePath();
        ctx.fill();

        if (checkpoint.active) {
            ctx.fillStyle = "rgba(255, 214, 102, 0.3)";
            ctx.beginPath();
            ctx.arc(x, y - 70, 44 + Math.sin(game.time * 3) * 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

function drawGoal(ctx, game) {
    const goal = game.level.goal;
    const x = goal.x + goal.w / 2;
    const baseY = goal.y + goal.h;

    ctx.save();

    ctx.fillStyle = "rgba(255, 221, 120, " + (0.2 + Math.sin(game.time * 2) * 0.08).toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(x, baseY - 60, 92, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#7a5230";
    roundedPath(ctx, x - 5, baseY - 130, 10, 130, 5);
    ctx.fill();

    const wave = Math.sin(game.time * 6) * 8;
    ctx.fillStyle = "#ed8936";
    ctx.beginPath();
    ctx.moveTo(x + 5, baseY - 126);
    ctx.quadraticCurveTo(x + 44, baseY - 116 + wave, x + 84, baseY - 104);
    ctx.lineTo(x + 84, baseY - 64);
    ctx.quadraticCurveTo(x + 44, baseY - 78 - wave, x + 5, baseY - 68);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "700 22px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TOP", x + 44, baseY - 90);

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
        ctx.fillStyle = "#7a5230";
        ctx.fillRect(x - 4, y - 54, 8, 54);

        ctx.fillStyle = "#f2d9a8";
        roundedPath(ctx, x - 78, y - 100, 156, 50, 10);
        ctx.fill();
        ctx.strokeStyle = "#a67c47";
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = "#8a5a1e";
        ctx.font = "900 20px Nunito, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("DEAD END", x, y - 76);
        ctx.font = "800 14px Nunito, sans-serif";
        ctx.fillText("try the other side", x, y - 60);
        ctx.restore();
    }
}

function drawWind(ctx, game) {
    for (const zone of game.level.zones) {
        if (zone.kind !== "wind" || !zone.active) {
            continue;
        }

        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";

        for (let i = 0; i < 16; i += 1) {
            const seed = i * 137.5;
            const y = zone.y + ((seed % zone.h) + i * 7) % zone.h;
            const travel = (game.time * 460 + seed * 3) % (zone.w + 220);
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

    ctx.fillStyle = "rgba(12, 40, 68, 0.22)";
    ctx.beginPath();
    ctx.ellipse(centerX, footY + 4, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const running = player.onGround && Math.abs(player.vx) > 60;
    const bob = running ? Math.abs(Math.sin(player.animTime * 13)) * 5 : Math.sin(player.animTime * 2.4) * 2;
    const squashY = 1 + player.squash;
    const squashX = 1 - player.squash * 0.55;

    let tilt = 0;
    if (running) {
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
        ctx.strokeStyle = "rgba(180, 235, 255, 0.85)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, footY - 52, 62 + Math.sin(game.time * 5) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    if (game.abilities.boost > 0) {
        ctx.save();
        ctx.fillStyle = "rgba(255, 209, 102, 0.5)";
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

    drawClouds(ctx, game);
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
