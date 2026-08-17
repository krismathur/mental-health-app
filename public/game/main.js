/**
 * The Impossible Mountain - screen flow, input and the game loop.
 *
 * main.js owns everything the player touches: menus, HUD, the setback cards and
 * the reward payout. The simulation itself lives in engine.js and knows nothing
 * about the DOM, which keeps both halves easy to change on their own.
 */

import { loadAssets } from "./assets.js";
import { playSound, unlockAudio, isMuted, toggleMute } from "./audio.js";
import { CHARACTERS, getCharacter } from "./characters.js";
import { getLevel } from "./levels.js";
import { Game, FIXED_STEP } from "./engine.js";
import { draw } from "./render.js";
import {
    getSetback,
    getStumbleLine,
    getAbilityLabel,
    getAbilitySeconds,
    earnedBadges
} from "./mental-strength.js";
import {
    loadProgress,
    saveProgress,
    STAT_META,
    BADGES,
    statLevel,
    statFraction
} from "./progress.js";

const el = function (id) {
    return document.getElementById(id);
};

const canvas = el("gameCanvas");
const ctx = canvas.getContext("2d");

const state = {
    progress: loadProgress(),
    character: null,
    game: null,
    running: false,
    paused: false,
    lastFrame: 0,
    accumulator: 0,
    setbacksSeen: {},
    runStatPoints: 0,
    stumbleIndex: 0,
    toastTimer: 0,
    pendingSetback: null
};

const input = { left: false, right: false, jump: false, jumpPressed: false };

// ---------------------------------------------------------------- screens

function showScreen(id) {
    for (const screen of document.querySelectorAll(".game-screen")) {
        screen.classList.toggle("is-active", screen.id === id);
    }
}

function showOverlay(id, visible) {
    el(id).hidden = !visible;
}

function toast(message, milliseconds) {
    const node = el("stageToast");
    node.textContent = message;
    node.hidden = false;

    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(function () {
        node.hidden = true;
    }, milliseconds || 2600);
}

// ------------------------------------------------------------ start screen

function renderStartStats() {
    const container = el("startStats");
    container.innerHTML = "";

    for (const meta of STAT_META) {
        const points = state.progress.stats[meta.key];
        const pill = document.createElement("div");
        pill.className = "stat-pill";
        pill.innerHTML = `
            <span class="stat-pill-top">
                <span aria-hidden="true">${meta.icon}</span>
                ${meta.label}
                <span class="stat-pill-level">Lv ${statLevel(points)}</span>
            </span>
            <span class="stat-bar"><span style="width:${Math.round(statFraction(points) * 100)}%"></span></span>
        `;
        container.appendChild(pill);
    }
}

function renderBadgeStrip(container, ids, highlight) {
    container.innerHTML = "";

    for (const badge of BADGES) {
        const owned = ids.includes(badge.id);
        const chip = document.createElement("span");
        chip.className = "badge-chip"
            + (owned ? "" : " is-locked")
            + (highlight && highlight.includes(badge.id) ? " is-new" : "");
        chip.title = badge.hint;
        chip.innerHTML = `<span aria-hidden="true">${badge.icon}</span> ${badge.label}`;
        container.appendChild(chip);
    }
}

// -------------------------------------------------------- character select

function renderCharacterCards() {
    const grid = el("characterGrid");
    grid.innerHTML = "";

    for (const character of CHARACTERS) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "character-card"
            + (character.id === state.progress.character ? " is-selected" : "");
        card.dataset.characterId = character.id;
        card.innerHTML = `
            <img src="images/${character.image}.png" alt="${character.name}">
            <div>
                <div class="character-name">${character.name}</div>
                <div class="character-trait">${character.trait}</div>
            </div>
        `;

        card.addEventListener("click", function () {
            state.progress.character = character.id;
            saveProgress(state.progress);
            playSound("click");
            renderCharacterCards();
        });

        grid.appendChild(card);
    }
}

// ------------------------------------------------------------------- input

const KEY_MAP = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "jump",
    KeyW: "jump",
    Space: "jump"
};

window.addEventListener("keydown", function (event) {
    const action = KEY_MAP[event.code];

    if (event.code === "Escape" && state.running) {
        togglePause();
        return;
    }

    // Leave the keys alone on menus and overlays so they still scroll and tab.
    if (!action || !state.running || state.paused) {
        return;
    }

    event.preventDefault();
    unlockAudio();

    if (action === "jump") {
        if (!input.jump) {
            input.jumpPressed = true;
        }
        input.jump = true;
    } else {
        input[action] = true;
    }
});

window.addEventListener("keyup", function (event) {
    const action = KEY_MAP[event.code];
    if (!action) {
        return;
    }

    event.preventDefault();

    if (action === "jump") {
        input.jump = false;
    } else {
        input[action] = false;
    }
});

function setupTouchControls() {
    // Coarse pointer means fingers, which is what the on-screen pad is for.
    // A laptop with a touchscreen still gets the keyboard experience.
    const usesTouch = window.matchMedia("(pointer: coarse)").matches;
    el("touchControls").hidden = !usesTouch;

    for (const button of document.querySelectorAll("[data-hold]")) {
        const action = button.dataset.hold;

        button.addEventListener("pointerdown", function (event) {
            event.preventDefault();
            unlockAudio();
            button.setPointerCapture(event.pointerId);
            button.classList.add("is-held");

            if (action === "jump") {
                input.jumpPressed = true;
                input.jump = true;
            } else {
                input[action] = true;
            }
        });

        const release = function () {
            button.classList.remove("is-held");
            if (action === "jump") {
                input.jump = false;
            } else {
                input[action] = false;
            }
        };

        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", release);
    }
}

function clearInput() {
    input.left = false;
    input.right = false;
    input.jump = false;
    input.jumpPressed = false;
}

// -------------------------------------------------------------- game start

function startLevel() {
    const level = getLevel(0);

    state.character = getCharacter(state.progress.character);
    state.game = new Game(level);
    state.setbacksSeen = {};
    state.runStatPoints = 0;
    state.stumbleIndex = 0;
    state.accumulator = 0;
    state.paused = false;
    state.running = true;

    clearInput();
    showScreen("playScreen");
    showOverlay("pauseOverlay", false);
    showOverlay("setbackOverlay", false);
    showOverlay("completeOverlay", false);

    toast(level.subtitle, 3200);
    updateHud();
}

function quitToMenu() {
    state.running = false;
    state.paused = false;
    state.game = null;
    clearInput();
    renderStartStats();
    renderBadgeStrip(el("startBadges"), state.progress.badges);
    showOverlay("pauseOverlay", false);
    showScreen("startScreen");
}

function togglePause() {
    if (!state.running || !el("setbackOverlay").hidden || !el("completeOverlay").hidden) {
        return;
    }

    state.paused = !state.paused;
    state.accumulator = 0;
    clearInput();
    showOverlay("pauseOverlay", state.paused);
}

// ----------------------------------------------------------------- setback

function openSetback(event) {
    const cause = event.cause;
    const seen = state.setbacksSeen[cause] || 0;
    state.setbacksSeen[cause] = seen + 1;

    const card = getSetback(cause, seen);
    state.pendingSetback = event;

    el("setbackFace").textContent = card.face;
    el("setbackKicker").textContent = card.kicker;
    el("setbackTitle").textContent = card.title;
    el("setbackText").textContent = card.text;
    el("setbackResponse").hidden = true;

    const list = el("choiceList");
    list.innerHTML = "";

    card.choices.forEach(function (choice, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "choice-btn";
        button.innerHTML = `<span class="choice-index">${index + 1}</span><span>${choice.text}</span>`;
        button.addEventListener("click", function () {
            pickChoice(choice, button, list);
        });
        list.appendChild(button);
    });

    state.paused = true;
    clearInput();
    playSound("setback");
    showOverlay("setbackOverlay", true);
}

function pickChoice(choice, button, list) {
    for (const other of list.querySelectorAll(".choice-btn")) {
        other.disabled = true;
    }
    button.classList.add("is-picked");

    const response = el("setbackResponse");
    let html = choice.response;

    if (choice.stat) {
        const meta = STAT_META.find(function (item) {
            return item.key === choice.stat;
        });

        state.progress.stats[choice.stat] += choice.points;
        state.runStatPoints += choice.points;
        saveProgress(state.progress);

        html += `<span class="reward-line">+${choice.points} ${meta.label}`;

        if (choice.ability) {
            const seconds = getAbilitySeconds(choice.ability);
            state.game.grantAbility(choice.ability, seconds);
            html += ` · ${getAbilityLabel(choice.ability)}`;
        }

        html += "</span>";
        playSound("reward");
    } else {
        playSound("click");
    }

    response.className = "setback-response" + (choice.stat ? "" : " is-gentle");
    response.innerHTML = html;
    response.hidden = false;

    list.appendChild(continueButton());
}

function continueButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "game-btn game-btn-primary";
    button.textContent = "Keep Climbing";
    button.addEventListener("click", closeSetback);
    return button;
}

function closeSetback() {
    const event = state.pendingSetback;
    state.pendingSetback = null;

    showOverlay("setbackOverlay", false);
    state.paused = false;
    state.accumulator = 0;
    clearInput();

    if (!state.game) {
        return;
    }

    if (event && event.respawn) {
        state.game.respawnPlayer();
        toast("Back to your last flag. Let's go again!", 2200);
    } else {
        state.game.resume();
    }
}

// ---------------------------------------------------------- level complete

function completeLevel() {
    state.running = false;
    state.paused = false;
    clearInput();
    playSound("complete");

    const level = state.game.level;
    const stats = state.game.stats;
    const progress = state.progress;

    const fresh = earnedBadges(stats, progress.badges);
    progress.badges = progress.badges.concat(fresh);
    progress.crystals += stats.crystals;
    progress.climbs += 1;
    progress.bestMeters = Math.max(progress.bestMeters, stats.bestHeightMeters);
    saveProgress(progress);

    const xp = 25 + stats.crystals * 3 + state.runStatPoints;

    // Feed the same XP meters the rest of MindZone uses.
    if (typeof window.addRewardProgress === "function") {
        window.addRewardProgress({ xp: xp, stars: 1, activityCompletions: 1 });
    }

    el("completeTitle").textContent = stats.setbacks > 0
        ? "You made it — after " + stats.setbacks + (stats.setbacks === 1 ? " fall!" : " falls!")
        : "You made it!";

    el("completeReflection").textContent = level.reflection;

    el("completeStats").innerHTML = `
        <div class="score-tile"><b>${stats.crystals}/${stats.crystalTotal}</b><span>Crystals</span></div>
        <div class="score-tile"><b>${stats.bestHeightMeters}m</b><span>Climbed</span></div>
        <div class="score-tile"><b>${stats.setbacks}</b><span>Comebacks</span></div>
        <div class="score-tile"><b>+${xp}</b><span>MindZone XP</span></div>
    `;

    renderBadgeStrip(el("completeBadges"), progress.badges, fresh);
    showOverlay("completeOverlay", true);
}

// -------------------------------------------------------------------- HUD

function updateHud() {
    if (!state.game) {
        return;
    }

    const stats = state.game.stats;
    el("hudCrystals").textContent = String(stats.crystals);
    el("hudCrystalTotal").textContent = "/" + stats.crystalTotal;
    el("hudHeight").textContent = String(stats.heightMeters);

    const abilities = state.game.abilities;
    const active = Object.keys(abilities).find(function (key) {
        return abilities[key] > 0;
    });

    const chip = el("hudAbility");
    if (active) {
        chip.hidden = false;
        chip.textContent = getAbilityLabel(active).split(" — ")[0]
            + " " + Math.ceil(abilities[active]) + "s";
    } else {
        chip.hidden = true;
    }
}

// ------------------------------------------------------------ event drain

function handleEvents() {
    const game = state.game;

    for (const event of game.events) {
        switch (event.type) {
            case "jump":
                playSound("jump");
                break;
            case "land":
                playSound("land");
                break;
            case "step":
                playSound("step");
                break;
            case "crystal":
                playSound("crystal");
                break;
            case "checkpoint":
                playSound("checkpoint");
                toast("Checkpoint! You'll come back here.", 2000);
                break;
            case "crumbleStart":
                playSound("crumble");
                break;
            case "gust":
                toast("Gust incoming — wait for it to pass!", 1800);
                break;
            case "stumble":
                state.stumbleIndex += 1;
                toast(getStumbleLine(state.stumbleIndex), 1600);
                break;
            case "setback":
                openSetback(event);
                break;
            case "goal":
                completeLevel();
                break;
            default:
                break;
        }
    }

    game.events.length = 0;
}

// -------------------------------------------------------------- game loop

function frame(now) {
    window.requestAnimationFrame(frame);

    const delta = Math.min(0.25, (now - state.lastFrame) / 1000 || 0);
    state.lastFrame = now;

    if (!state.game) {
        return;
    }

    if (state.running && !state.paused) {
        state.accumulator += delta;

        let steps = 0;
        while (state.accumulator >= FIXED_STEP && steps < 240) {
            state.game.update(FIXED_STEP, input);
            state.accumulator -= FIXED_STEP;
            steps += 1;
        }

        handleEvents();
        updateHud();
    }

    draw(ctx, state.game, state.character);
}

// ------------------------------------------------------------------- wiring

function wireUi() {
    el("playBtn").addEventListener("click", function () {
        unlockAudio();
        playSound("click");
        renderCharacterCards();
        showScreen("characterScreen");
    });

    el("backToStartBtn").addEventListener("click", function () {
        playSound("click");
        showScreen("startScreen");
    });

    el("confirmCharacterBtn").addEventListener("click", function () {
        playSound("click");
        startLevel();
    });

    el("pauseBtn").addEventListener("click", togglePause);
    el("resumeBtn").addEventListener("click", togglePause);

    el("restartBtn").addEventListener("click", function () {
        playSound("click");
        startLevel();
    });

    el("quitBtn").addEventListener("click", function () {
        playSound("click");
        quitToMenu();
    });

    el("replayBtn").addEventListener("click", function () {
        playSound("click");
        startLevel();
    });

    const muteBtn = el("muteBtn");
    const paintMute = function () {
        muteBtn.textContent = isMuted() ? "🔇" : "🔊";
        muteBtn.setAttribute("aria-label", isMuted() ? "Turn sound on" : "Turn sound off");
    };
    paintMute();

    muteBtn.addEventListener("click", function () {
        toggleMute();
        paintMute();
        playSound("click");
    });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden && state.running && !state.paused) {
            togglePause();
        }
    });
}

async function boot() {
    wireUi();
    setupTouchControls();
    renderStartStats();
    renderBadgeStrip(el("startBadges"), state.progress.badges);

    await loadAssets();

    window.requestAnimationFrame(frame);
}

boot();
