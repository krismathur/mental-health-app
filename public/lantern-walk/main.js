/**
 * Lantern Walk - screen flow, input, the light-meter rules and the game loop.
 *
 * main.js owns everything the player touches: menus, HUD, the setback cards and
 * the reward payout, plus the simple world state (where the walker is, how much
 * oil is left in the lantern, which flasks are gathered). scene.js turns that
 * state into the 3D picture; it knows nothing about the rules.
 */

import { LanternScene } from "./scene.js";
import { CHARACTERS, getCharacter } from "./characters.js";
import { getLevel, cloneLevel } from "./levels.js";
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
const scene = new LanternScene(canvas);

const state = {
    progress: loadProgress(),
    character: null,
    level: null,
    world: null,
    running: false,
    paused: false,
    lastFrame: 0,
    setbacksSeen: {},
    runStatPoints: 0,
    stumbleIndex: 0,
    lowWarned: false,
    toastTimer: 0,
    pendingSetback: null
};

const input = { left: false, right: false };

// A fresh world for one walk. Abilities are timers, like the mountain game.
function freshWorld(level) {
    return {
        x: 0,
        light: level.startLight,
        facing: 1,
        walking: false,
        time: 0,
        oils: level.oils.map(function (oil) {
            return { x: oil.x, taken: false };
        }),
        oilsTaken: 0,
        setbacks: 0,
        everGuttered: false,
        finished: false,
        frozen: false,
        abilities: { warmGlow: 0, brightEyes: 0, steadyPace: 0 }
    };
}

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
            <span class="character-swatch" style="background:${character.coat}"></span>
            <div>
                <div class="character-name">${character.name}</div>
                <div class="character-trait">${character.trait}</div>
            </div>
        `;

        card.addEventListener("click", function () {
            state.progress.character = character.id;
            saveProgress(state.progress);
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
    KeyD: "right"
};

window.addEventListener("keydown", function (event) {
    if (event.code === "Escape" && state.running) {
        togglePause();
        return;
    }

    const action = KEY_MAP[event.code];
    if (!action || !state.running || state.paused) {
        return;
    }

    event.preventDefault();
    input[action] = true;
});

window.addEventListener("keyup", function (event) {
    const action = KEY_MAP[event.code];
    if (!action) {
        return;
    }
    input[action] = false;
});

function setupTouchControls() {
    const usesTouch = window.matchMedia("(pointer: coarse)").matches;
    el("touchControls").hidden = !usesTouch;

    for (const button of document.querySelectorAll("[data-hold]")) {
        const action = button.dataset.hold;

        button.addEventListener("pointerdown", function (event) {
            event.preventDefault();
            button.setPointerCapture(event.pointerId);
            button.classList.add("is-held");
            input[action] = true;
        });

        const release = function () {
            button.classList.remove("is-held");
            input[action] = false;
        };

        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", release);
    }
}

function clearInput() {
    input.left = false;
    input.right = false;
}

// -------------------------------------------------------------- game start

function startLevel() {
    const level = cloneLevel(getLevel(0));

    state.character = getCharacter(state.progress.character);
    state.level = level;
    state.world = freshWorld(level);
    state.setbacksSeen = {};
    state.runStatPoints = 0;
    state.stumbleIndex = 0;
    state.lowWarned = false;
    state.paused = false;
    state.running = true;

    scene.setCharacter(state.character);
    scene.buildLevel(level);

    clearInput();
    showScreen("playScreen");
    showOverlay("pauseOverlay", false);
    showOverlay("setbackOverlay", false);
    showOverlay("completeOverlay", false);

    // The stage is now visible, so the canvas finally has a real size.
    scene.resize();

    toast(level.subtitle, 3200);
    updateHud();
}

function quitToMenu() {
    state.running = false;
    state.paused = false;
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
    clearInput();
    showOverlay("pauseOverlay", state.paused);
}

// ---------------------------------------------------------------- simulation

function stepWorld(dt) {
    const world = state.world;
    const level = state.level;

    world.time += dt;

    // Walk.
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const speed = level.walkSpeed * (world.abilities.steadyPace > 0 ? 1.35 : 1);
    world.walking = direction !== 0;
    if (direction !== 0) {
        world.facing = direction;
        world.x = Math.max(0, Math.min(level.homeX, world.x + direction * speed * dt));
    }

    // Ability timers.
    for (const key of Object.keys(world.abilities)) {
        if (world.abilities[key] > 0) {
            world.abilities[key] = Math.max(0, world.abilities[key] - dt);
        }
    }

    // The lantern burns down; Warm Glow slows it.
    const drain = level.drainPerSecond * (world.abilities.warmGlow > 0 ? 0.45 : 1);
    world.light = Math.max(0, world.light - drain * dt);

    // Gather oil flasks.
    for (const oil of world.oils) {
        if (oil.taken) {
            continue;
        }
        if (Math.abs(world.x - oil.x) <= level.pickupRadius) {
            oil.taken = true;
            world.oilsTaken += 1;
            world.light = Math.min(1, world.light + level.refill);
            playChime();
            toast("Oil topped up — nice and bright.", 1400);
        }
    }

    // A low-light warning once, before it actually gutters.
    if (world.light > 0 && world.light < 0.25 && !state.lowWarned) {
        state.lowWarned = true;
        state.stumbleIndex += 1;
        toast(getStumbleLine(state.stumbleIndex), 1800);
    }
    if (world.light > 0.35) {
        state.lowWarned = false;
    }

    // Guttered out: a setback.
    if (world.light <= 0) {
        world.setbacks += 1;
        world.everGuttered = true;
        openSetback({ cause: "dark" });
        return;
    }

    // Home.
    if (world.x >= level.homeX - 0.5 && !world.finished) {
        world.finished = true;
        completeLevel();
    }
}

// ----------------------------------------------------------------- setback

function openSetback(event) {
    const cause = event.cause;
    const seen = state.setbacksSeen[cause] || 0;
    state.setbacksSeen[cause] = seen + 1;

    const card = getSetback(cause, seen);
    state.pendingSetback = event;
    state.world.frozen = true;

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
            grantAbility(choice.ability);
            html += ` · ${getAbilityLabel(choice.ability)}`;
        }

        html += "</span>";
    }

    response.className = "setback-response" + (choice.stat ? "" : " is-gentle");
    response.innerHTML = html;
    response.hidden = false;

    list.appendChild(continueButton());
}

function grantAbility(key) {
    const world = state.world;

    // "calm" isn't a timed buff; it relights the lantern fuller right now.
    if (key === "calm") {
        world.light = Math.max(world.light, 0.7);
        return;
    }

    const seconds = getAbilitySeconds(key);
    if (Object.prototype.hasOwnProperty.call(world.abilities, key)) {
        world.abilities[key] = Math.max(world.abilities[key], seconds);
    }
}

function continueButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "game-btn game-btn-primary";
    button.textContent = "Relight and Walk On";
    button.addEventListener("click", closeSetback);
    return button;
}

function closeSetback() {
    state.pendingSetback = null;
    showOverlay("setbackOverlay", false);
    state.paused = false;
    clearInput();

    const world = state.world;
    if (!world) {
        return;
    }

    // Always leave the walker with at least a small flame so the walk continues.
    if (world.light <= 0.05) {
        world.light = 0.35;
    }
    world.frozen = false;
    toast("Lantern relit. Keep walking home.", 1800);
}

// ---------------------------------------------------------- level complete

function completeLevel() {
    state.running = false;
    state.paused = false;
    clearInput();
    playChime();

    const level = state.level;
    const world = state.world;
    const progress = state.progress;

    const runStats = {
        setbacks: world.setbacks,
        oils: world.oilsTaken,
        oilTotal: level.oils.length
    };

    const fresh = earnedBadges(runStats, progress.badges);
    progress.badges = progress.badges.concat(fresh);
    progress.oils += world.oilsTaken;
    progress.walks += 1;
    saveProgress(progress);

    const xp = 25 + world.oilsTaken * 3 + state.runStatPoints;

    if (typeof window.addRewardProgress === "function") {
        window.addRewardProgress({ xp: xp, stars: 1, activityCompletions: 1 });
    }

    el("completeTitle").textContent = world.setbacks > 0
        ? "You made it home — after " + world.setbacks + (world.setbacks === 1 ? " dark moment!" : " dark moments!")
        : "You made it home!";

    el("completeReflection").textContent = level.reflection;

    el("completeStats").innerHTML = `
        <div class="score-tile"><b>${world.oilsTaken}/${level.oils.length}</b><span>Oil found</span></div>
        <div class="score-tile"><b>${world.everGuttered ? "No" : "Yes"}</b><span>Stayed lit</span></div>
        <div class="score-tile"><b>${world.setbacks}</b><span>Comebacks</span></div>
        <div class="score-tile"><b>+${xp}</b><span>MindZone XP</span></div>
    `;

    renderBadgeStrip(el("completeBadges"), progress.badges, fresh);
    showOverlay("completeOverlay", true);
}

// -------------------------------------------------------------------- HUD

function updateHud() {
    const world = state.world;
    if (!world) {
        return;
    }

    const level = state.level;
    el("hudOil").textContent = String(world.oilsTaken);
    el("hudOilTotal").textContent = "/" + level.oils.length;

    const pct = Math.round(world.light * 100);
    el("lightFill").style.width = pct + "%";
    const meter = el("lightMeter");
    meter.classList.toggle("is-low", world.light < 0.25);

    const abilities = world.abilities;
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

// ---------------------------------------------------------- little sounds

let audioCtx = null;

function playChime() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = 660;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.32);
    } catch (error) {
        // Sound is a nicety; never let it break the game.
    }
}

// -------------------------------------------------------------- game loop

function frame(now) {
    window.requestAnimationFrame(frame);

    const delta = Math.min(0.05, (now - state.lastFrame) / 1000 || 0);
    state.lastFrame = now;

    if (state.running && !state.paused && state.world && !state.world.frozen) {
        stepWorld(delta);
        updateHud();
    }

    if (state.world) {
        scene.update(delta, state.world);
    }
}

// ------------------------------------------------------------------- wiring

function wireUi() {
    el("playBtn").addEventListener("click", function () {
        renderCharacterCards();
        showScreen("characterScreen");
    });

    el("backToStartBtn").addEventListener("click", function () {
        showScreen("startScreen");
    });

    el("confirmCharacterBtn").addEventListener("click", function () {
        startLevel();
    });

    el("pauseBtn").addEventListener("click", togglePause);
    el("resumeBtn").addEventListener("click", togglePause);

    el("restartBtn").addEventListener("click", startLevel);
    el("quitBtn").addEventListener("click", quitToMenu);
    el("replayBtn").addEventListener("click", startLevel);

    window.addEventListener("resize", function () {
        scene.resize();
    });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden && state.running && !state.paused) {
            togglePause();
        }
    });
}

function boot() {
    wireUi();
    setupTouchControls();
    renderStartStats();
    renderBadgeStrip(el("startBadges"), state.progress.badges);
    scene.resize();
    window.requestAnimationFrame(frame);
}

boot();
