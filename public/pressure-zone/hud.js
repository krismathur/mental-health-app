/**
 * All DOM handling for the game shell: menu, character creator, HUD, map,
 * dialogue, choices, cinematic beats, pause profile and results.
 *
 * Nothing in here touches the simulation directly; game.js passes state in
 * and receives callbacks out.
 */
import {
    BACKPACKS, DEFAULT_APPEARANCE, HAIR_COLORS, HAIR_STYLES, JACKETS, OUTFITS, SKIN_TONES
} from "./character.js";
import { STATS, describeStat, profileSummary } from "./mental.js";
import { UNLOCKS, friendshipBand, xpIntoLevel } from "./progress.js";
import { BLOCKS, CITY, POIS, ROADS } from "./world-data.js";

const el = (id) => document.getElementById(id);

function formatClock(seconds) {
    const total = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function formatTimeOfDay(hour) {
    const h = Math.floor(hour) % 24;
    const m = Math.floor((hour % 1) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const WEATHER_LABELS = {
    clear: "Clear",
    cloudy: "Overcast",
    rain: "Rain",
    storm: "Storm",
    fog: "Fog"
};

export class Hud {
    constructor(handlers = {}) {
        this.handlers = handlers;
        this.appearance = { ...DEFAULT_APPEARANCE };
        this.dialogueQueue = [];
        this.toastTimers = new Set();
        this.tipTimer = null;
        this.bindMenu();
        this.bindCreator();
        this.bindHud();
    }

    // ---------- Screens ----------

    show(id) {
        const node = el(id);
        if (node) node.hidden = false;
    }

    hide(id) {
        const node = el(id);
        if (node) node.hidden = true;
    }

    setLoading(ratio, status) {
        const fill = el("loadingFill");
        if (fill) fill.style.width = `${Math.round(ratio * 100)}%`;
        if (status) {
            const label = el("loadingStatus");
            if (label) label.textContent = status;
        }
        const percent = el("loadingPercent");
        if (percent) percent.textContent = `${Math.round(ratio * 100)}%`;
        window.__cityLoader?.set(ratio, status);
    }

    showMenu(saveSummary) {
        this.hide("loadingScreen");
        this.hide("creatorScreen");
        this.hide("hudLayer");
        this.hide("pauseScreen");
        this.show("menuScreen");
        window.__cityLoader?.done();
        const hint = el("loadingHint");
        if (hint) hint.hidden = true;
        const button = el("continueButton");
        if (saveSummary) {
            button.hidden = false;
            el("continueDetail").textContent = saveSummary;
        } else {
            button.hidden = true;
        }
    }

    // ---------- Menu ----------

    bindMenu() {
        el("playButton").addEventListener("click", () => {
            this.hide("menuScreen");
            this.show("creatorScreen");
            this.handlers.onCreatorOpen?.(this.appearance);
        });
        el("continueButton").addEventListener("click", () => this.handlers.onContinue?.());
        el("freeRoamButton").addEventListener("click", () => {
            this.hide("menuScreen");
            this.show("creatorScreen");
            this.freeRoam = true;
            this.handlers.onCreatorOpen?.(this.appearance);
        });
        el("controlsButton").addEventListener("click", () => this.show("controlsScreen"));
        el("controlsClose").addEventListener("click", () => this.hide("controlsScreen"));
    }

    // ---------- Character creator ----------

    bindCreator() {
        this.buildSwatches("skinOptions", SKIN_TONES, "skin");
        this.buildChips("hairOptions", HAIR_STYLES, "hair");
        this.buildSwatches("hairColorOptions", HAIR_COLORS, "hairColor");
        this.buildChips("outfitOptions", OUTFITS, "outfit");
        this.buildChips("jacketOptions", JACKETS, "jacket");
        this.buildChips("backpackOptions", BACKPACKS, "backpack");

        el("creatorBack").addEventListener("click", () => {
            this.hide("creatorScreen");
            this.show("menuScreen");
        });

        el("creatorForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const name = new FormData(event.target).get("playerName");
            this.appearance.name = String(name || "Rowan").trim().slice(0, 14) || "Rowan";
            this.hide("creatorScreen");
            this.handlers.onStart?.({ ...this.appearance }, { freeRoam: Boolean(this.freeRoam) });
        });

        el("rotateLeft").addEventListener("click", () => this.handlers.onPreviewRotate?.(-0.5));
        el("rotateRight").addEventListener("click", () => this.handlers.onPreviewRotate?.(0.5));
    }

    buildSwatches(containerId, options, key) {
        const container = el(containerId);
        container.innerHTML = "";
        for (const option of options) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "swatch";
            button.style.background = `#${option.color.toString(16).padStart(6, "0")}`;
            button.title = option.label;
            button.setAttribute("aria-label", option.label);
            button.setAttribute("aria-pressed", String(this.appearance[key] === option.id));
            button.addEventListener("click", () => this.selectOption(container, button, key, option.id));
            container.appendChild(button);
        }
    }

    buildChips(containerId, options, key) {
        const container = el(containerId);
        container.innerHTML = "";
        for (const option of options) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "chip";
            button.textContent = option.label;
            button.setAttribute("aria-pressed", String(this.appearance[key] === option.id));
            button.addEventListener("click", () => this.selectOption(container, button, key, option.id));
            container.appendChild(button);
        }
    }

    selectOption(container, button, key, value) {
        for (const sibling of container.children) sibling.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-pressed", "true");
        this.appearance[key] = value;
        this.handlers.onAppearanceChange?.({ ...this.appearance });
    }

    // ---------- HUD ----------

    bindHud() {
        el("pauseButton").addEventListener("click", () => this.handlers.onPause?.());
        el("mapButton").addEventListener("click", () => this.handlers.onMap?.());
        el("mapClose").addEventListener("click", () => this.handlers.onMap?.());
        el("resumeButton").addEventListener("click", () => this.handlers.onResume?.());
        el("saveButton").addEventListener("click", () => this.handlers.onSave?.());
        el("quitButton").addEventListener("click", () => this.handlers.onQuit?.());
        el("resultsContinue").addEventListener("click", () => this.handlers.onResultsContinue?.());
        el("resultsReplay").addEventListener("click", () => this.handlers.onResultsReplay?.());
        el("audioToggle").addEventListener("change", (event) => this.handlers.onAudioToggle?.(event.target.checked));
        el("qualityToggle").addEventListener("change", (event) => this.handlers.onQualityToggle?.(event.target.checked));

        for (const button of document.querySelectorAll("[data-touch]")) {
            const action = button.dataset.touch;
            button.addEventListener("touchstart", (event) => {
                event.preventDefault();
                this.handlers.onTouchAction?.(action, true);
            }, { passive: false });
            button.addEventListener("touchend", (event) => {
                event.preventDefault();
                this.handlers.onTouchAction?.(action, false);
            }, { passive: false });
        }

        if ("ontouchstart" in window) el("touchControls").hidden = false;
    }

    enterGame() {
        this.show("hudLayer");
        this.tipTimer = setTimeout(() => el("controlsTip").classList.add("hidden"), 14000);
    }

    /** Called every frame with the current world state. */
    update(state) {
        el("districtLabel").textContent = state.district;
        el("clockLabel").textContent = formatTimeOfDay(state.hour);
        el("weatherLabel").textContent = WEATHER_LABELS[state.weather] || state.weather;

        const level = xpIntoLevel(state.xp);
        el("levelValue").textContent = level.level;
        el("xpFill").style.width = `${level.ratio * 100}%`;

        // Objective
        const mission = state.mission;
        const objective = el("objectiveCard");
        if (mission?.missionId) {
            objective.hidden = false;
            el("chapterLabel").textContent = `Chapter ${mission.chapter}`;
            el("missionTitle").textContent = mission.title;
            el("objectiveText").textContent = mission.objective;
            el("objectiveHint").textContent = mission.hint || "";
        } else {
            objective.hidden = false;
            el("chapterLabel").textContent = "Free roam";
            el("missionTitle").textContent = "Bayline";
            el("objectiveText").textContent = "Explore the district";
            el("objectiveHint").textContent = "";
        }

        // Mission timer
        const timerCard = el("timerCard");
        if (mission?.timer !== null && mission?.timer !== undefined && !state.match) {
            timerCard.hidden = false;
            el("timerValue").textContent = formatClock(mission.timer);
            timerCard.classList.toggle("urgent", mission.timer < 30);
        } else {
            timerCard.hidden = true;
        }

        // Compass
        const compass = el("compassCard");
        if (state.marker) {
            compass.hidden = false;
            el("compassArrow").style.transform = `rotate(${state.marker.angle}rad)`;
            el("compassDistance").textContent = `${Math.round(state.marker.distance)} m`;
        } else {
            compass.hidden = true;
        }

        // Vehicle
        const vehicleCard = el("vehicleCard");
        if (state.vehicle) {
            vehicleCard.hidden = false;
            el("vehicleName").textContent = state.vehicle.label;
            const kph = Math.round(Math.abs(state.vehicle.speed) * 3.6);
            el("speedValue").textContent = kph;
            el("speedFill").style.width = `${Math.min(100, (kph / 80) * 100)}%`;
        } else {
            vehicleCard.hidden = true;
        }

        // Scoreboard
        const scoreCard = el("scoreCard");
        if (state.match) {
            scoreCard.hidden = false;
            el("homeScore").textContent = state.match.playerScore;
            el("awayScore").textContent = state.match.opponentScore;
            el("matchClock").textContent = state.match.clock ? formatClock(state.match.clock) : "--:--";
            el("shotClock").textContent = Math.ceil(state.match.shotClock);
        } else {
            scoreCard.hidden = true;
        }

        // Shot meter
        const meter = el("shotMeter");
        if (state.shot) {
            meter.hidden = false;
            el("shotFill").style.left = `${state.shot.power * 100}%`;
            el("shotGreen").style.left = `${Math.max(0, (state.shot.ideal - 0.07) * 100)}%`;
            el("shotGreen").style.width = `${14}%`;
        } else {
            meter.hidden = true;
        }

        // Interaction prompt
        const prompt = el("actionPrompt");
        if (state.prompt) {
            prompt.hidden = false;
            el("promptKey").textContent = state.prompt.key;
            el("promptText").textContent = state.prompt.text;
        } else {
            prompt.hidden = true;
        }
    }

    // ---------- Dialogue ----------

    showDialogue(speaker, line) {
        const box = el("dialogueBox");
        box.hidden = false;
        el("dialogueSpeaker").textContent = speaker;
        el("dialogueLine").textContent = line;
    }

    hideDialogue() {
        el("dialogueBox").hidden = true;
    }

    showChoice(title, options, onPick) {
        const box = el("choiceBox");
        box.hidden = false;
        el("choiceTitle").textContent = title;
        const list = el("choiceOptions");
        list.innerHTML = "";
        options.forEach((option, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "choice-option";
            button.innerHTML = `${index + 1}. ${option.label}<small>${option.detail || ""}</small>`;
            button.addEventListener("click", () => {
                box.hidden = true;
                onPick(option);
            });
            list.appendChild(button);
        });
        this.activeChoice = { options, onPick };
    }

    pickChoiceByIndex(index) {
        if (!this.activeChoice) return false;
        const option = this.activeChoice.options[index];
        if (!option) return false;
        el("choiceBox").hidden = true;
        const handler = this.activeChoice.onPick;
        this.activeChoice = null;
        handler(option);
        return true;
    }

    hideChoice() {
        el("choiceBox").hidden = true;
        this.activeChoice = null;
    }

    // ---------- Feedback ----------

    toast(text, badge = "") {
        const stack = el("toastStack");
        const node = document.createElement("div");
        node.className = "toast";
        node.innerHTML = badge ? `<b>${badge}</b><span>${text}</span>` : `<span>${text}</span>`;
        stack.appendChild(node);
        const timer = setTimeout(() => {
            node.classList.add("fade");
            setTimeout(() => node.remove(), 450);
        }, 3400);
        this.toastTimers.add(timer);
        while (stack.children.length > 4) stack.firstChild.remove();
    }

    announce(line, duration = 2600) {
        const node = el("announcerLine");
        node.hidden = false;
        node.textContent = line;
        clearTimeout(this.announceTimer);
        this.announceTimer = setTimeout(() => { node.hidden = true; }, duration);
    }

    setCinematic(active, { title = "", subtitle = "" } = {}) {
        el("cinematicBars").hidden = !active;
        const card = el("titleCard");
        if (active && title) {
            card.hidden = false;
            el("titleCardMain").textContent = title;
            el("titleCardSub").textContent = subtitle;
        } else {
            card.hidden = true;
        }
    }

    // ---------- Map ----------

    toggleMap(visible, state) {
        el("mapScreen").hidden = !visible;
        if (visible) this.drawMap(state);
    }

    drawMap(state) {
        const canvas = el("mapCanvas");
        const context = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;
        const spanX = CITY.maxX - CITY.minX;
        const spanZ = CITY.maxZ - CITY.minZ;
        const scale = Math.min(width / spanX, height / spanZ);
        const originX = (width - spanX * scale) / 2;
        const originY = (height - spanZ * scale) / 2;
        const toX = (x) => originX + (x - CITY.minX) * scale;
        const toY = (z) => originY + (z - CITY.minZ) * scale;

        context.fillStyle = "#0a0d11";
        context.fillRect(0, 0, width, height);

        // Blocks
        for (const block of BLOCKS) {
            context.fillStyle = block.kind === "park"
                ? "rgba(70, 110, 74, 0.35)"
                : block.kind === "sports"
                    ? "rgba(200, 120, 60, 0.22)"
                    : "rgba(255, 255, 255, 0.045)";
            context.fillRect(toX(block.x), toY(block.z), block.w * scale, block.d * scale);
        }

        // Roads
        context.strokeStyle = "rgba(255, 255, 255, 0.2)";
        context.lineWidth = Math.max(2, CITY.roadWidth * scale);
        for (const road of ROADS) {
            context.beginPath();
            if (road.axis === "x") {
                context.moveTo(toX(road.from), toY(road.at));
                context.lineTo(toX(road.to), toY(road.at));
            } else {
                context.moveTo(toX(road.at), toY(road.from));
                context.lineTo(toX(road.at), toY(road.to));
            }
            context.stroke();
        }

        // Places
        context.font = "600 11px Inter, sans-serif";
        for (const [id, poi] of Object.entries(POIS)) {
            if (id === "homeDoor" || id === "tournament") continue;
            const known = id === "home" || id === "court" || id === "park" || id === "store"
                || state.discovered.includes(id);
            context.fillStyle = known ? "rgba(255, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.2)";
            context.beginPath();
            context.arc(toX(poi.x), toY(poi.z), 4, 0, Math.PI * 2);
            context.fill();
            if (known) {
                context.fillStyle = "rgba(255, 255, 255, 0.55)";
                context.fillText(poi.label, toX(poi.x) + 8, toY(poi.z) + 4);
            }
        }

        // Friends
        for (const friend of state.friends || []) {
            context.fillStyle = "#58a7d8";
            context.beginPath();
            context.arc(toX(friend.x), toY(friend.z), 5, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = "rgba(255, 255, 255, 0.7)";
            context.fillText(friend.name, toX(friend.x) + 8, toY(friend.z) - 6);
        }

        // Objective
        if (state.marker?.place) {
            context.fillStyle = "#4fbf7f";
            context.beginPath();
            context.arc(toX(state.marker.place.x), toY(state.marker.place.z), 7, 0, Math.PI * 2);
            context.fill();
        }

        // Player, drawn as a heading triangle.
        const px = toX(state.player.x);
        const py = toY(state.player.z);
        context.save();
        context.translate(px, py);
        context.rotate(-state.player.facing + Math.PI);
        context.fillStyle = "#ff8a3d";
        context.beginPath();
        context.moveTo(0, -8);
        context.lineTo(6, 7);
        context.lineTo(-6, 7);
        context.closePath();
        context.fill();
        context.restore();
    }

    // ---------- Pause profile ----------

    togglePause(visible, state) {
        el("pauseScreen").hidden = !visible;
        if (visible) this.renderProfile(state);
    }

    renderProfile(state) {
        el("pauseName").textContent = state.name;
        const summary = profileSummary(state.mental);
        el("pauseSub").textContent = `Level ${state.level} · ${state.district} · Mental strength ${summary.overall}`;

        const statList = el("statList");
        statList.innerHTML = "";
        for (const stat of STATS) {
            const value = Math.round(state.mental.stats[stat.id] || 0);
            const row = document.createElement("div");
            row.className = "stat-row";
            row.innerHTML = `
                <header><strong>${stat.label}</strong><em>${value}</em></header>
                <div class="stat-track"><i style="width:${value}%"></i></div>
                <small>${describeStat(state.mental, stat.id)}</small>
            `;
            statList.appendChild(row);
        }

        const historyList = el("historyList");
        historyList.innerHTML = "";
        const history = state.mental.history.slice(0, 7);
        if (!history.length) {
            const empty = document.createElement("li");
            empty.className = "history-empty";
            empty.textContent = "Nothing yet. Go play.";
            historyList.appendChild(empty);
        }
        for (const entry of history) {
            const item = document.createElement("li");
            item.innerHTML = `<span>${entry.note}</span><b>+${entry.delta}</b>`;
            historyList.appendChild(item);
        }

        const friendList = el("friendList");
        friendList.innerHTML = "";
        for (const friend of state.friends) {
            const value = state.friendship[friend.id] ?? 0;
            const row = document.createElement("div");
            row.className = "friend-row";
            row.innerHTML = `
                <header><strong>${friend.name}</strong><span>${friendshipBand(value)}</span></header>
                <div class="friend-track"><i style="width:${value}%"></i></div>
            `;
            friendList.appendChild(row);
        }

        const unlockList = el("unlockList");
        unlockList.innerHTML = "";
        for (const unlock of UNLOCKS) {
            const owned = state.unlocked.includes(unlock.id);
            const row = document.createElement("div");
            row.className = `unlock-row${owned ? "" : " locked"}`;
            row.innerHTML = `<span>${unlock.label}</span><b>${owned ? "UNLOCKED" : `LV ${unlock.level}`}</b>`;
            unlockList.appendChild(row);
        }
    }

    // ---------- Results ----------

    showResults({ eyebrow, title, score, line, stats }) {
        el("resultsEyebrow").textContent = eyebrow;
        el("resultsTitle").textContent = title;
        el("resultsScore").textContent = score;
        el("resultsLine").textContent = line;
        const container = el("resultsStats");
        container.innerHTML = "";
        for (const stat of stats) {
            const node = document.createElement("div");
            node.className = "results-stat";
            node.innerHTML = `<b>${stat.value}</b><span>${stat.label}</span>`;
            container.appendChild(node);
        }
        this.show("resultsScreen");
    }

    hideResults() {
        this.hide("resultsScreen");
    }
}

export { formatClock, formatTimeOfDay };
