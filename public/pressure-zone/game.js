/**
 * CITY MISSIONS - game orchestrator.
 *
 * Owns the renderer, the frame loop, the interaction layer and the glue
 * between the world simulation and the mission logic. Everything visual
 * lives in the other modules; this file decides what happens when.
 */
import * as THREE from "./vendor/three.module.js";
import { CityBuilder } from "./city-build.js";
import { PostProcessing, SkySystem, WEATHER_TYPES } from "./sky.js";
import { applyEnvironment, materials } from "./materials.js";
import { createCharacter } from "./character.js";
import { ChaseCamera, InputController, Player } from "./player.js";
import { Vehicle } from "./vehicles.js";
import { TrafficSignals, TrafficSystem, buildParkedCars } from "./traffic.js";
import { CourtCrowd, CrowdSystem, FRIENDS, FriendCharacter } from "./npc.js";
import { AudioEngine } from "./audio.js";
import {
    Announcer, Basketball, Defender, MatchState,
    computeShotQuality, idealPower, shotPoints, animateShot
} from "./basketball.js";
import { DISCOVERIES, MissionSystem } from "./missions.js";
import { composure, recordBehaviour } from "./mental.js";
import {
    XP_AWARDS, awardXp, clearSave, createProgress, hasUnlock, load, save, xpIntoLevel
} from "./progress.js";
import { COURT, POIS, districtAt, groundHeight } from "./world-data.js";
import { Hud } from "./hud.js";

const canvas = document.getElementById("scene");

class Game {
    constructor() {
        this.clock = new THREE.Clock();
        this.state = "loading";
        this.progress = createProgress();
        this.freeRoam = false;
        this.paused = false;
        this.mapOpen = false;
        this.hour = 8.2;
        this.timeScale = 24; // one real second is 24 in-game seconds
        this.weather = "clear";
        this.dialogue = null;
        this.shotCharge = null;
        this.ballOwner = null;
        this.match = null;
        this.matchTimers = { opponent: 0, announce: 0 };
        this.drillActive = false;
        this.interactable = null;
        this.frameTimes = [];
        this.quality = 1;
        this.stats = { fps: 60, drawCalls: 0, triangles: 0, mode: "menu" };
        this.pendingCinematic = null;
        this.discoveredThisSession = new Set();

        window.__cityLoader?.set(0.08, "Starting Bayline");
        this.setupHud();
        this.boot().catch((error) => {
            console.error(error);
            window.__cityLoader?.fail(error?.message || "Could not start the city");
        });
    }

    setupRenderer() {
        if (!canvas) throw new Error("The 3D canvas is missing from the page");
        try {
            this.renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: false,
                powerPreference: "high-performance",
                failIfMajorPerformanceCaveat: false
            });
        } catch {
            throw new Error("This browser could not start WebGL. Try Chrome, or update Safari.");
        }
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.renderer.shadowMap.enabled = false;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.16, 900);
        this.camera.position.set(-100, 6, -14);

        window.addEventListener("resize", () => this.onResize());
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.post?.setSize(width, height);
        if (this.previewRenderer) {
            const preview = document.getElementById("previewCanvas");
            this.previewRenderer.setSize(preview.clientWidth, preview.clientHeight, false);
            this.previewCamera.aspect = preview.clientWidth / Math.max(1, preview.clientHeight);
            this.previewCamera.updateProjectionMatrix();
        }
    }

    setupHud() {
        this.hud = new Hud({
            onCreatorOpen: (appearance) => this.openPreview(appearance),
            onAppearanceChange: (appearance) => this.updatePreview(appearance),
            onPreviewRotate: (amount) => { this.previewRotation += amount; },
            onStart: (appearance, options) => this.startGame(appearance, options),
            onContinue: () => this.continueGame(),
            onPause: () => this.togglePause(true),
            onResume: () => this.togglePause(false),
            onMap: () => this.toggleMap(),
            onSave: () => this.saveGame(true),
            onQuit: () => this.quitToMenu(),
            onResultsContinue: () => this.closeResults(false),
            onResultsReplay: () => this.closeResults(true),
            onAudioToggle: (enabled) => this.audio.setEnabled(enabled),
            onQualityToggle: (high) => this.setQuality(high),
            onTouchAction: (action, down) => this.handleTouchAction(action, down)
        });
        this.audio = new AudioEngine();
    }

    // ---------- Boot ----------

    async boot() {
        const yieldFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

        this.hud.setLoading(0.12, "Starting the renderer");
        await yieldFrame();
        this.setupRenderer();

        this.hud.setLoading(0.2, "Painting the streets");
        await yieldFrame();
        const surfaces = [
            () => materials.asphalt(),
            () => materials.sidewalk(),
            () => materials.brick(0xa8735a),
            () => materials.concreteWall(),
            () => materials.plaster(),
            () => materials.grass(),
            () => materials.dirt(),
            () => materials.roofGravel(),
            () => materials.shingle(),
            () => materials.bark(),
            () => materials.foliage(),
            () => materials.court(),
            () => materials.metal()
        ];
        for (let index = 0; index < surfaces.length; index += 1) {
            this.hud.setLoading(0.2 + (index / surfaces.length) * 0.16, "Painting the streets");
            await yieldFrame();
            surfaces[index]();
        }

        this.builder = new CityBuilder(this.scene);
        const cityPhases = this.builder.phases();
        for (let index = 0; index < cityPhases.length; index += 1) {
            const [label, action] = cityPhases[index];
            const start = 0.36 + (index / cityPhases.length) * 0.46;
            this.hud.setLoading(start, label);
            await yieldFrame();
            await action((fraction) => {
                this.hud.setLoading(start + fraction * (0.46 / cityPhases.length), label);
            });
        }
        const built = this.builder.result();
        this.colliders = built.colliders;
        this.lampPositions = built.lamps;
        this.floodlightPositions = built.floodlights || [];
        this.hoops = this.builder.hoops;

        this.hud.setLoading(0.86, "Lighting the district");
        await yieldFrame();
        this.buildAtmosphere();

        this.hud.setLoading(0.92, "Filling the streets");
        await yieldFrame();
        this.buildLife();

        this.hud.setLoading(0.97, "Almost ready");
        await yieldFrame();
        this.finishBoot();
        this.hud.setLoading(1, "Ready");

        const saved = load();
        this.hud.showMenu(saved
            ? `Level ${saved.level} · ${saved.missions.completed.length} of 6 chapters`
            : null);
        this.savedGame = saved;
        this.state = "menu";
        this.renderLoop();
        this.scheduleDeferredWork();
    }

    buildWorld() {
        this.builder = new CityBuilder(this.scene);
        const built = this.builder.build();
        this.colliders = built.colliders;
        this.lampPositions = built.lamps;
        this.floodlightPositions = built.floodlights || [];
        this.hoops = this.builder.hoops;
    }

    buildAtmosphere() {
        this.sky = new SkySystem(this.scene, this.renderer);
        this.sky.setTime(this.hour);
        this.sky.onThunder = () => this.audio.thunder();
        this.post = new PostProcessing(this.renderer, this.scene, this.camera);
        this.post.setSize(window.innerWidth, window.innerHeight);
        // The env map is expensive; the menu backdrop looks fine without it and
        // we fill it in after the first frame so Play is not waiting on PMREM.

        // A small pool of street lights follows the player so nights read as
        // lit without paying for a light per lamp post.
        this.streetLights = [];
        for (let index = 0; index < 10; index += 1) {
            const light = new THREE.PointLight(0xffcb8f, 0, 34, 1.7);
            light.visible = false;
            this.scene.add(light);
            this.streetLights.push(light);
        }
        this.roomLight = new THREE.PointLight(0xffd9a8, 0, 11, 2);
        this.roomLight.position.set(POIS.home.x, 2.9, POIS.home.z);
        this.scene.add(this.roomLight);

        // Court floodlights. One casts the shadow players actually notice; the
        // rest are fill, which keeps four spot shadow maps off the budget.
        this.floodlights = this.floodlightPositions.map((position, index) => {
            const light = new THREE.SpotLight(0xf2f6ff, 0, 46, 0.86, 0.55, 1.25);
            light.position.copy(position);
            light.target.position.set(COURT.x, 0, COURT.z);
            // Uneven banks give players a readable shadow; four equal towers
            // cancel each other out and the court looks flat.
            light.userData.bank = index < 2 ? 1 : 0.45;
            light.castShadow = index === 0;
            if (light.castShadow) {
                light.shadow.mapSize.set(1024, 1024);
                light.shadow.camera.near = 4;
                light.shadow.camera.far = 60;
                light.shadow.bias = -0.0009;
            }
            this.scene.add(light, light.target);
            return light;
        });
    }

    buildLife() {
        this.signals = new TrafficSignals();
        this.traffic = new TrafficSystem(this.scene, this.signals);
        this.crowd = new CrowdSystem(this.scene);
        this.courtCrowd = new CourtCrowd(this.scene);

        this.friends = FRIENDS.map((definition) => new FriendCharacter(this.scene, definition));
        this.friendById = Object.fromEntries(this.friends.map((friend) => [friend.id, friend]));
        this.opponent = null;

        this.ball = new Basketball(this.scene);
        this.ball.setHoop(this.hoops[1]);
        this.ball.onBounce = (intensity) => this.audio.bounce(intensity);
        this.ball.onRim = (kind) => this.audio.rim(kind);
        this.ball.onScore = () => this.onBallScored();
        this.ball.onLoose = () => this.onBallLoose();

        this.announcer = new Announcer((line) => this.hud.announce(line));

        this.vehicles = [
            new Vehicle(this.scene, "bike", { x: -93.8, z: -20.5, heading: Math.PI / 2 }, { color: 0x2f6b73 }),
            new Vehicle(this.scene, "skateboard", { x: -93.4, z: -27, heading: 0 }, { color: 0xc44a35 }),
            new Vehicle(this.scene, "car", { x: -89.6, z: -34, heading: 0 }, { color: 0x35404e })
        ];
    }

    finishBoot() {
        this.input = new InputController(canvas);
        this.chase = new ChaseCamera(this.camera, this.colliders);
    }

    /** Work that is visible later, not on the first Play click. */
    scheduleDeferredWork() {
        const run = (fn) => {
            if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 900 });
            else setTimeout(fn, 40);
        };
        run(() => {
            this.renderer.shadowMap.enabled = this.quality >= 1;
            if (!this.sky.environment) {
                this.sky.refreshEnvironment();
                applyEnvironment(this.sky.environment);
            }
        });
        run(() => buildParkedCars(this.scene, this.colliders));
    }

    ensureOpponent() {
        if (this.opponent) return this.opponent;
        this.opponent = new FriendCharacter(this.scene, {
            id: "riverside",
            name: "Riverside guard",
            look: {
                name: "Kai", skin: "tan", hair: "buzz", hairColor: "black",
                outfit: "night", jacket: "none", backpack: "none", height: 1.04
            },
            home: { x: COURT.x + 4, z: COURT.z + 3 }
        });
        return this.opponent;
    }

    // ---------- Character preview ----------

    openPreview(appearance) {
        const preview = document.getElementById("previewCanvas");
        if (!this.previewRenderer) {
            this.previewRenderer = new THREE.WebGLRenderer({ canvas: preview, antialias: true, alpha: true });
            this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
            this.previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.previewRenderer.shadowMap.enabled = true;

            this.previewScene = new THREE.Scene();
            this.previewCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
            this.previewCamera.position.set(0, 1.1, 3.6);

            // Three point lighting so the character reads as a hero shot.
            const key = new THREE.DirectionalLight(0xfff0dc, 3.4);
            key.position.set(2.4, 3.4, 3);
            key.castShadow = true;
            key.shadow.mapSize.set(1024, 1024);
            const fill = new THREE.DirectionalLight(0x9dbde0, 1.1);
            fill.position.set(-3, 1.8, 1.6);
            const rim = new THREE.DirectionalLight(0xffc796, 2.2);
            rim.position.set(-1.4, 2.6, -3.4);
            this.previewScene.add(key, fill, rim, new THREE.HemisphereLight(0x8fb3d8, 0x3a352c, 0.6));

            const floor = new THREE.Mesh(
                new THREE.CircleGeometry(2.4, 40).rotateX(-Math.PI / 2),
                new THREE.MeshStandardMaterial({ color: 0x1a1f26, roughness: 0.6, metalness: 0.2 })
            );
            floor.receiveShadow = true;
            this.previewScene.add(floor);
            if (this.sky?.environment) this.previewScene.environment = this.sky.environment;

            this.previewRotation = 0.4;
        }
        this.previewRenderer.setSize(preview.clientWidth, preview.clientHeight, false);
        this.previewCamera.aspect = preview.clientWidth / Math.max(1, preview.clientHeight);
        this.previewCamera.updateProjectionMatrix();
        this.updatePreview(appearance);
    }

    updatePreview(appearance) {
        if (!this.previewScene) return;
        if (this.previewRig) this.previewScene.remove(this.previewRig.root);
        this.previewRig = createCharacter(appearance, "full");
        this.previewRig.root.traverse((child) => {
            if (child.isMesh) child.castShadow = true;
        });
        this.previewScene.add(this.previewRig.root);
    }

    renderPreview(dt) {
        if (!this.previewRig || document.getElementById("creatorScreen").hidden) return;
        this.previewRotation += dt * 0.22;
        this.previewRig.root.rotation.y = this.previewRotation;
        this.previewRig.update(dt, { speed: 0, mode: "idle" });
        this.previewCamera.lookAt(0, 0.92, 0);
        this.previewRenderer.render(this.previewScene, this.previewCamera);
    }

    // ---------- Session ----------

    startGame(appearance, { freeRoam = false } = {}) {
        this.progress = createProgress();
        this.progress.appearance = appearance;
        this.freeRoam = freeRoam;
        this.beginSession(appearance);
        if (!freeRoam) {
            this.missions.start("morning");
            this.playOpeningCinematic();
        } else {
            this.player.teleport(-95.5, -24, Math.PI / 2);
            this.hud.toast("Free roam. No missions, just the city.");
        }
    }

    continueGame() {
        const saved = this.savedGame || load();
        if (!saved) return;
        this.progress = saved;
        this.freeRoam = false;
        this.hour = saved.world.hour ?? 8.2;
        this.weather = saved.world.weather ?? "clear";
        this.beginSession(saved.appearance || {});
        const next = this.missions.nextMissionId();
        if (next) this.missions.start(next);
        this.player.teleport(-95.5, -24, Math.PI / 2);
        this.hud.toast(`Welcome back, ${this.progress.appearance?.name || "Rowan"}.`);
    }

    beginSession(appearance) {
        this.hud.hide("menuScreen");
        this.hud.hide("creatorScreen");
        this.hud.enterGame();
        this.audio.start();
        this.audio.resume();

        this.player = new Player(this.scene, appearance, this.colliders);
        this.player.teleport(POIS.home.x, POIS.home.z + 1.6, 0);
        this.player.onFootstep = (surface, intensity) => this.audio.footstep(surface, intensity);

        this.chase = new ChaseCamera(this.camera, this.colliders);
        this.missions = new MissionSystem(this.progress, {
            onEvent: (event) => this.onMissionEvent(event)
        });

        this.sky.setTime(this.hour);
        this.sky.setWeather(this.weather);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality >= 1 ? 1.5 : 1));
        this.renderer.shadowMap.enabled = this.quality >= 1;
        if (!this.sky.environment) {
            this.sky.refreshEnvironment();
            applyEnvironment(this.sky.environment);
        }
        this.state = "playing";
        this.stats.mode = "playing";
        this.sessionStart = performance.now();
        this.placeFriends();
    }

    placeFriends() {
        this.friendById.mara.object.position.set(-93, groundHeight(-93, -18), -18);
        this.friendById.mara.faceToward({ x: POIS.home.x, z: POIS.home.z });
        this.friendById.dev.object.position.set(COURT.x - 4, groundHeight(COURT.x - 4, COURT.z + 4), COURT.z + 4);
        this.friendById.nia.object.position.set(-38, groundHeight(-38, 22), 22);
    }

    playOpeningCinematic() {
        const home = POIS.home;
        this.player.frozen = true;
        this.hud.setCinematic(true, { title: "Maple Rise", subtitle: "Bayline District · 08:12" });
        this.post.setCinematic(0.9);
        this.chase.playCinematic({
            position: new THREE.Vector3(home.x + 3.2, 2.1, home.z + 2.6),
            lookAt: new THREE.Vector3(home.x - 0.6, 1.25, home.z - 1.2),
            duration: 5,
            orbit: -0.5
        });
        this.pendingCinematic = { kind: "opening", timer: 5 };
    }

    skipCinematic() {
        this.chase.skipCinematic();
        if (this.pendingCinematic) this.endCinematic();
    }

    endCinematic() {
        this.pendingCinematic = null;
        this.hud.setCinematic(false);
        this.post.setCinematic(0);
        this.player.frozen = false;
    }

    // ---------- Mission events ----------

    onMissionEvent(event) {
        const { type, detail } = event;
        if (type === "missionStarted") {
            this.hud.toast(detail.mission.title, `CH ${detail.mission.chapter}`);
            if (detail.mission.weather) this.setWeather(detail.mission.weather);
            if (detail.mission.id === "the-long-way") this.triggerChainSnap();
            if (detail.mission.id === "the-final") this.prepareFinal();
        }
        if (type === "stepChanged" && detail.step?.type === "choice") {
            this.hud.showChoice(detail.step.label, detail.step.options, (option) => {
                this.missions.handle("choice", { option: option.id });
                this.audio.blip(720, 0.1);
                this.applyChoiceEffect(option);
            });
        }
        if (type === "stepChanged" && detail.step?.type === "match") {
            this.startMatch("tournament");
        }
        if (type === "stepChanged" && detail.step?.type === "drill") {
            this.startDrill();
        }
        if (type === "timerExpired") {
            this.hud.toast("The store shutters came down.", "LATE");
            this.hud.announce("You are going to have to fix this another way.", 3600);
            this.audio.sting(false);
        }
        if (type === "missionCompleted") {
            this.onMissionCompleted(detail);
        }
    }

    onMissionCompleted({ mission, xp }) {
        this.audio.sting(true);
        this.hud.toast(`${mission.title} complete`, `+${xp.amount} XP`);
        for (const unlock of xp.unlocks) {
            this.hud.toast(unlock.detail, unlock.label.toUpperCase());
        }
        if (xp.levelUp) this.hud.announce(`Level ${xp.level}`, 2600);

        // Feed the wider MindZone reward system.
        if (typeof window.addRewardProgress === "function") {
            window.addRewardProgress({ xp: Math.round(xp.amount / 3), stars: 1, activityCompletions: 1 });
        }
        this.saveGame(false);

        if (mission.next) {
            setTimeout(() => {
                if (this.state !== "playing") return;
                this.advanceStoryTime(mission.next);
                this.missions.start(mission.next);
            }, 1800);
        } else {
            this.showFinalResults();
        }
    }

    /** Story jumps push the clock so the final lands under floodlights. */
    advanceStoryTime(nextMissionId) {
        const jumps = {
            practice: 0.4,
            "jersey-run": 0.8,
            "the-long-way": 0.6,
            "warm-up": 3.2,
            "the-final": 1.4
        };
        const jump = jumps[nextMissionId];
        if (jump) {
            this.hour = (this.hour + jump) % 24;
            this.sky.setTime(this.hour);
        }
        if (nextMissionId === "warm-up") this.setWeather("cloudy");
    }

    triggerChainSnap() {
        const bike = this.vehicles.find((vehicle) => vehicle.kind === "bike");
        if (this.player.mode === "vehicle") this.player.exitVehicle();
        if (bike) {
            bike.damaged = true;
            bike.mesh.rotation.z = 0.9;
            bike.mesh.position.copy(this.player.position);
            bike.position.copy(this.player.position);
        }
        this.setWeather("storm");
        this.player.frozen = true;
        this.hud.setCinematic(true, { title: "Chain snapped", subtitle: "Somewhere on Centre Street" });
        this.post.setCinematic(0.8);
        this.chase.playCinematic({
            position: this.player.position.clone().add(new THREE.Vector3(2.4, 1.1, 2.4)),
            lookAt: this.player.position.clone().add(new THREE.Vector3(0, 0.7, 0)),
            duration: 3.6,
            orbit: 0.6
        });
        this.pendingCinematic = { kind: "chain-snap", timer: 3.6 };
        this.chase.addShake(0.7);
        setTimeout(() => {
            this.missions.handle("scripted", { step: "breakdown" });
        }, 3700);
    }

    applyChoiceEffect(option) {
        if (option.effect?.devConfidence) {
            this.devBoost = option.effect.devConfidence;
            this.hud.announce("Dev's next few go down easier.", 3000);
        }
        if (option.effect?.playerAccuracy) {
            this.accuracyBoost = option.effect.playerAccuracy;
            this.hud.announce("Your release feels clean.", 3000);
        }
        if (option.effect?.teamMorale) {
            this.teamMorale = option.effect.teamMorale;
            this.hud.announce("The bench is louder than it was.", 3000);
        }
        if (option.id === "alley") this.player.teleport(POIS.alley.x, POIS.alley.z, 0);
        if (option.id === "park") this.player.teleport(POIS.park.x + 10, POIS.park.z, 0);
        if (option.id === "wait") this.hour = (this.hour + 0.3) % 24;
    }

    prepareFinal() {
        this.hour = 20.4;
        this.sky.setTime(this.hour);
        this.setWeather("clear");
        this.courtCrowd.setVisible(true);
        this.ensureOpponent().object.visible = true;
        // A rider's position is driven by the seat, so a teleport would be ignored.
        if (this.player.mode === "vehicle") {
            this.player.exitVehicle();
            this.audio.stopEngine();
            this.audio.stopRoll();
        }
        this.player.teleport(COURT.x - 3, COURT.z + 5, Math.PI);
        this.friendById.dev.object.position.set(COURT.x - 6, groundHeight(COURT.x - 6, COURT.z - 3), COURT.z - 3);
        this.friendById.mara.object.position.set(COURT.x + 2, groundHeight(COURT.x + 2, COURT.z - 4), COURT.z - 4);

        this.hud.setCinematic(true, { title: "Fulton Cup Final", subtitle: "Bayline vs Riverside · 20:24" });
        this.post.setCinematic(1.1);
        this.player.frozen = true;
        this.chase.playCinematic({
            position: new THREE.Vector3(COURT.x + 15, 6.5, COURT.z + 16),
            lookAt: new THREE.Vector3(COURT.x, 2, COURT.z),
            duration: 5.2,
            orbit: -0.34
        });
        this.pendingCinematic = { kind: "tip-off", timer: 5.2 };
        this.audio.setCrowd(0.6, 0.2);
        this.audio.whistle();
        setTimeout(() => this.missions.handle("scripted", { step: "tip-off" }), 5300);
    }

    // ---------- Basketball ----------

    startDrill() {
        this.drillActive = true;
        this.ballOwner = "player";
        this.ball.attachTo(this.player);
        this.player.setDribbling(true);
        this.hud.announce("Hold the shoot button, release in the green.", 4200);
    }

    startMatch(mode) {
        this.match = new MatchState(mode);
        // Riverside start hot: the game opens with the player already behind,
        // which is the setback the whole chapter is built around.
        if (mode === "tournament") {
            this.match.opponentScore = 8;
            this.matchTimers.opponent = 9;
        }
        this.drillActive = false;
        this.ballOwner = "player";
        this.ball.attachTo(this.player);
        this.player.setDribbling(true);
        this.courtCrowd.setVisible(true);
        this.ensureOpponent().object.visible = true;
        this.defender = new Defender(this.opponent, 0.62);
        this.audio.setCrowd(0.75, 0.3);
        this.announcer.say("pressure", true);
        this.hud.toast("Riverside 8 - 0. Long way to go.", "TIP-OFF");
    }

    beginShotCharge() {
        if (this.ballOwner !== "player") return;
        if (!this.drillActive && !this.match) return;
        this.shotCharge = { power: 0, direction: 1 };
    }

    releaseShot() {
        if (!this.shotCharge) return;
        const power = this.shotCharge.power;
        this.shotCharge = null;

        const hoop = this.hoops[1];
        const from = this.player.position.clone().add(new THREE.Vector3(0, 1.72, 0));
        const distance = Math.hypot(hoop.position.x - from.x, hoop.position.z - from.z);
        const contest = this.defender ? this.defender.pressure : 0;
        const pressure = this.match ? this.match.pressure : 0.1;

        const quality = computeShotQuality({
            distance,
            contest,
            power,
            timing: 1,
            moving: Math.min(1, this.player.speed / 4),
            pressure,
            composure: composure(this.progress.mental) + (this.accuracyBoost || 0)
        });

        const made = Math.random() < quality;
        // A make is aimed at the middle of the ring; a miss is aimed off it,
        // so the physics still decides exactly how it misses.
        const target = hoop.position.clone();
        if (!made) {
            target.x += (Math.random() - 0.5) * 0.5;
            target.z += (Math.random() - 0.5) * 0.5;
            target.y += 0.12;
        }

        this.player.setDribbling(false);
        animateShot(this.player.rig);
        this.ball.shoot(from, target, power, made ? 0.97 : 0.55);
        this.ballOwner = null;
        this.pendingShot = { made, distance, pressure, contest };
        this.progress.stats.shotsTaken += 1;
        this.chase.addShake(0.1);
        if (this.match) this.match.resetShotClock();
    }

    passBall() {
        if (this.ballOwner !== "player" || !this.match) return;
        const mate = this.friendById.dev;
        this.ball.passTo(
            this.player.position.clone().add(new THREE.Vector3(0, 1.4, 0)),
            mate.object.position.clone().add(new THREE.Vector3(0, 1.4, 0))
        );
        this.ballOwner = "teammate";
        this.player.setDribbling(false);
        recordBehaviour(this.progress.mental, "passedInsteadOfForcing");
        this.hud.announce("Good look. Dev takes it.", 2000);
        // The teammate finishes more often when you helped him warm up.
        const chance = 0.42 + (this.devBoost || 0);
        setTimeout(() => {
            if (!this.match) return;
            if (Math.random() < chance) {
                this.match.recordShot(true, 2);
                this.audio.rim("swish");
                this.audio.cheer(0.8);
                this.courtCrowd.react(0.7);
                this.announcer.say("make");
            } else {
                this.audio.rim("rim");
                this.announcer.say("miss");
            }
            this.returnBallToPlayer(0.4);
        }, 1500);
    }

    onBallScored() {
        this.audio.cheer(this.match ? 1 : 0.4);
        this.courtCrowd.react(0.9);

        if (this.drillActive) {
            this.progress.stats.shotsMade += 1;
            awardXp(this.progress, XP_AWARDS.shotMade, "Shot made");
            this.missions.handle("shotMade", {});
            this.hud.toast("Good release.", "MAKE");
        }

        if (this.match) {
            const shot = this.pendingShot || { distance: 4 };
            const points = shotPoints(shot.distance);
            this.match.recordShot(true, points);
            this.progress.stats.shotsMade += 1;
            if (this.match.pressure > 0.55) {
                recordBehaviour(this.progress.mental, "scoredUnderPressure");
            }
            if (this.match.streak === 3) {
                recordBehaviour(this.progress.mental, "hitStreak");
                this.announcer.say("comeback", true);
            }
            if (this.match.missStreak === 0 && this.wasCold) {
                recordBehaviour(this.progress.mental, "recoveredFromMissStreak");
                this.wasCold = false;
            }
            this.announcer.say("make");
        }
        this.returnBallToPlayer(1.1);
    }

    onBallLoose() {
        if (this.pendingShot && !this.pendingShot.scored) {
            if (this.match) {
                this.match.recordShot(false);
                if (this.match.missStreak >= 3) this.wasCold = true;
                this.announcer.say("miss");
            }
        }
        this.returnBallToPlayer(0.5);
    }

    returnBallToPlayer(delay = 0.8) {
        if (this.ballReturnTimer) clearTimeout(this.ballReturnTimer);
        this.ballReturnTimer = setTimeout(() => {
            if (this.state !== "playing") return;
            this.pendingShot = null;
            this.ballOwner = "player";
            this.ball.state = "held";
            this.ball.attachTo(this.player);
            this.player.setDribbling(true);
            if (this.match) this.match.resetShotClock();
        }, delay * 1000);
    }

    updateMatch(dt) {
        if (!this.match) return;
        this.match.tick(dt);
        this.announcer.update(dt);

        // Riverside score on their own rhythm, slower when you are composed.
        this.matchTimers.opponent -= dt;
        if (this.matchTimers.opponent <= 0) {
            const calm = composure(this.progress.mental) + (this.teamMorale || 0);
            this.matchTimers.opponent = 11 + calm * 9 + Math.random() * 6;
            if (Math.random() < 0.72 - calm * 0.25) {
                this.match.opponentScores(Math.random() < 0.24 ? 3 : 2);
                this.audio.groan();
                this.courtCrowd.react(0.2);
            }
        }

        // Shot clock violation turns the ball over.
        if (this.match.shotClock <= 0 && this.ballOwner === "player") {
            this.audio.whistle();
            this.hud.announce("Shot clock. Riverside ball.", 2200);
            this.match.resetShotClock();
            this.match.opponentScores(2);
        }

        this.audio.setCrowd(0.7, this.match.pressure * 0.8);
        if (this.match.pressure > 0.75) this.announcer.say("pressure");

        if (this.match.finished) {
            const result = this.match.result;
            if (result !== "win") recordBehaviour(this.progress.mental, "keptPlayingWhileBehind");
            if (this.weather === "storm" || this.weather === "rain") {
                recordBehaviour(this.progress.mental, "playedInStorm");
            }
            this.missions.handle("matchEnd", { result });
            this.showMatchResults();
            this.match = null;
            this.defender = null;
            this.ball.mesh.visible = false;
            this.ballOwner = null;
            this.player.setDribbling(false);
            this.audio.setCrowd(0.25, 0);
            if (result === "win") this.audio.cheer(1.4);
        }
    }

    showMatchResults() {
        const match = this.match;
        const won = match.result === "win";
        const accuracy = Math.round(match.accuracy * 100);
        this.hud.showResults({
            eyebrow: won ? "Champions" : "Full time",
            title: "Fulton Cup Final",
            score: match.scoreline,
            line: won
                ? "Down eight at the tip and you took it back one possession at a time."
                : "Riverside held on. You were a different player by the fourth than you were at the tip.",
            stats: [
                { value: `${accuracy}%`, label: "Shooting" },
                { value: match.bestStreak, label: "Best run" },
                { value: match.attempts, label: "Attempts" }
            ]
        });
        this.state = "results";
        this.stats.mode = "results";
    }

    showFinalResults() {
        this.saveGame(false);
    }

    closeResults(replay) {
        this.hud.hideResults();
        this.state = "playing";
        this.stats.mode = "playing";
        this.courtCrowd.setVisible(false);
        if (this.opponent) this.opponent.object.visible = false;
        if (replay) {
            this.missions.handle("retry", {});
            this.hud.toast("Running it back.", "AGAIN");
            this.startMatch("tournament");
        } else {
            this.hud.toast("Bayline is yours to explore.", "FREE ROAM");
            this.freeRoam = true;
        }
    }

    // ---------- Interaction ----------

    findInteractable() {
        const position = this.player.position;
        let best = null;
        let bestDistance = 3.2;

        if (this.player.mode === "vehicle") {
            return { kind: "exit", key: "F", text: `Get off the ${this.player.vehicle.spec.label}` };
        }

        for (const friend of this.friends) {
            const distance = friend.distanceTo(position);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = { kind: "talk", key: "E", text: `Talk to ${friend.name}`, friend };
            }
        }

        for (const vehicle of this.vehicles) {
            if (!hasUnlock(this.progress, vehicle.kind) && vehicle.kind !== "bike") continue;
            const distance = vehicle.distanceTo(position);
            const range = vehicle.kind === "car" ? 3.4 : 2.4;
            if (distance < range && distance < bestDistance + 0.8) {
                bestDistance = distance;
                best = vehicle.damaged
                    ? { kind: "broken", key: "E", text: "The chain is snapped", vehicle }
                    : { kind: "ride", key: "F", text: `Ride the ${vehicle.spec.label}`, vehicle };
            }
        }

        const store = POIS.store;
        const storeDistance = Math.hypot(position.x - store.x, position.z - store.z);
        const step = this.missions?.step;
        if (storeDistance < 4.5 && step?.type === "collect") {
            best = { kind: "collect", key: "E", text: "Pick up Dev's jersey", item: step.item };
        }

        const courtDistance = Math.hypot(position.x - COURT.x, position.z - COURT.z);
        if (!best && courtDistance < 14 && this.ballOwner !== "player" && !this.match && !this.drillActive) {
            best = { kind: "ball", key: "E", text: "Pick up the ball" };
        }

        return best;
    }

    interact() {
        const target = this.interactable;
        if (!target) return;
        this.audio.blip(560, 0.07);

        if (target.kind === "talk") {
            this.startDialogue(target.friend);
        } else if (target.kind === "ride") {
            this.player.enterVehicle(target.vehicle);
            if (target.vehicle.spec.engine) this.audio.startEngine();
            this.missions?.handle("ride", { vehicle: target.vehicle.kind });
        } else if (target.kind === "exit") {
            this.player.exitVehicle();
            this.audio.stopEngine();
            this.audio.stopRoll();
        } else if (target.kind === "collect") {
            this.missions?.handle("collect", { item: target.item });
            this.hud.toast("Got the jersey.", "PICKED UP");
        } else if (target.kind === "ball") {
            this.ballOwner = "player";
            this.ball.attachTo(this.player);
            this.player.setDribbling(true);
        } else if (target.kind === "broken") {
            this.hud.announce("That is not getting fixed out here.", 2400);
        }
    }

    startDialogue(friend) {
        const step = this.missions?.step;
        const lines = step?.type === "talk" && step.friend === friend.id && step.dialogue
            ? step.dialogue
            : [{ speaker: friend.name, line: this.idleLineFor(friend) }];
        this.dialogue = { friend, lines, index: 0 };
        this.player.frozen = true;
        this.player.lookAtPoint(friend.object.position.clone().setY(1.5));
        this.hud.showDialogue(lines[0].speaker, lines[0].line);
    }

    idleLineFor(friend) {
        const value = this.progress.friendship[friend.id] ?? 0;
        const lines = {
            mara: value > 55
                ? "You looked good out there. Do not let it go to your head."
                : "Court is east on Main. Do not be late.",
            dev: value > 55
                ? "I kept shooting after you left. Made nine straight."
                : "I keep pulling them short. It is in my head, I know.",
            nia: "There is a way onto the roof off the alley. I never told you that."
        };
        return lines[friend.id] || "Hey.";
    }

    advanceDialogue() {
        if (!this.dialogue) return;
        this.dialogue.index += 1;
        if (this.dialogue.index >= this.dialogue.lines.length) {
            const friend = this.dialogue.friend;
            this.dialogue = null;
            this.hud.hideDialogue();
            this.player.frozen = false;
            this.missions?.handle("talk", { friend: friend.id });
            return;
        }
        const line = this.dialogue.lines[this.dialogue.index];
        this.hud.showDialogue(line.speaker, line.line);
        this.audio.blip(440, 0.04, "sine", 0.014);
    }

    checkArrivals() {
        if (!this.missions) return;
        const step = this.missions.step;
        const position = this.player.position;

        if (step?.type === "goto") {
            const place = POIS[step.place];
            if (place) {
                const distance = Math.hypot(position.x - place.x, position.z - place.z);
                if (distance < place.radius) this.missions.handle("arrive", { place: step.place });
            }
        }

        // Optional steps get skipped when the player found another way.
        if (step?.optional && step.type === "ride") {
            const distance = Math.hypot(position.x - POIS.store.x, position.z - POIS.store.z);
            if (distance < 40) this.missions.skipOptionalStep();
        }

        // Discoveries are rewarded once, quietly.
        for (const discovery of DISCOVERIES) {
            if (this.progress.discovered.includes(discovery.id)) continue;
            const place = POIS[discovery.place];
            if (!place) continue;
            if (Math.hypot(position.x - place.x, position.z - place.z) < place.radius) {
                this.progress.discovered.push(discovery.id);
                recordBehaviour(this.progress.mental, discovery.behaviour);
                const xp = awardXp(this.progress, XP_AWARDS.discovery, discovery.label);
                this.hud.toast(discovery.label, `+${xp.amount} XP`);
                this.audio.blip(880, 0.14, "triangle", 0.026);
            }
        }
    }

    // ---------- Frame ----------

    handleActions(actions) {
        for (const code of actions) {
            if (code === "Escape") {
                if (this.mapOpen) this.toggleMap();
                else if (this.state === "playing" || this.paused) this.togglePause(!this.paused);
                continue;
            }
            if (this.paused || this.state !== "playing") continue;

            if (code === "KeyM") this.toggleMap();
            if (this.mapOpen) continue;

            if (this.dialogue && (code === "KeyE" || code === "Space" || code === "Enter")) {
                this.advanceDialogue();
                continue;
            }
            if (this.hud.activeChoice && ["Digit1", "Digit2", "Digit3"].includes(code)) {
                this.hud.pickChoiceByIndex(Number(code.slice(5)) - 1);
                continue;
            }
            if (code === "KeyE" || code === "KeyF") this.interact();
            if (code === "KeyG") this.passBall();
            if (code === "KeyJ") this.beginShotCharge();
            if (code === "Enter" && this.pendingCinematic) this.skipCinematic();
        }
    }

    handleTouchAction(action, down) {
        if (action === "interact" && down) {
            if (this.dialogue) this.advanceDialogue();
            else this.interact();
        }
        if (action === "shoot") {
            if (down) this.beginShotCharge();
            else this.releaseShot();
        }
        if (action === "sprint") this.touchSprint = down;
    }

    /**
     * Nearest standable point to a target, spiralling outward past any collider.
     * Points of interest sit at the centre of a building or court, so dropping the
     * player straight onto one would bury them in geometry.
     */
    findOpenSpot(x, z, radius = 6) {
        const clear = (px, pz) => !this.colliders.some((collider) => (
            collider.height > 1
            && px > collider.minX - 0.6 && px < collider.maxX + 0.6
            && pz > collider.minZ - 0.6 && pz < collider.maxZ + 0.6
        ));
        if (clear(x, z)) return { x, z };
        for (let ring = 1; ring <= 8; ring += 1) {
            const distance = radius * 0.5 + ring * 2.4;
            for (let step = 0; step < 12; step += 1) {
                const angle = (step / 12) * Math.PI * 2;
                const px = x + Math.cos(angle) * distance;
                const pz = z + Math.sin(angle) * distance;
                if (clear(px, pz)) return { x: px, z: pz };
            }
        }
        return { x, z };
    }

    togglePause(paused) {
        if (this.state !== "playing" && !paused) return;
        this.paused = paused;
        this.hud.togglePause(paused, this.profileState());
        if (paused && document.pointerLockElement) document.exitPointerLock();
    }

    toggleMap() {
        this.mapOpen = !this.mapOpen;
        this.hud.toggleMap(this.mapOpen, this.mapState());
        if (this.mapOpen && document.pointerLockElement) document.exitPointerLock();
    }

    profileState() {
        return {
            name: this.progress.appearance?.name || "Rowan",
            level: this.progress.level,
            district: districtAt(this.player.position.x, this.player.position.z),
            mental: this.progress.mental,
            friends: FRIENDS,
            friendship: this.progress.friendship,
            unlocked: this.progress.unlocked
        };
    }

    mapState() {
        const marker = this.missions?.markerPlace;
        return {
            player: { x: this.player.position.x, z: this.player.position.z, facing: this.player.facing },
            discovered: this.progress.discovered,
            friends: this.friends.map((friend) => ({
                name: friend.name,
                x: friend.object.position.x,
                z: friend.object.position.z
            })),
            marker: marker ? { place: marker } : null
        };
    }

    setWeather(name) {
        if (!WEATHER_TYPES[name]) return;
        this.weather = name;
        this.sky.setWeather(name);
    }

    setQuality(high) {
        this.quality = high ? 1 : 0.7;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 2 : 1));
        this.renderer.shadowMap.enabled = high;
        this.post.enabled = high;
        this.post.setAmbientOcclusion(high ? 0.62 : 0);
        this.post.setSize(window.innerWidth, window.innerHeight);
    }

    saveGame(showToast) {
        this.progress.world = { hour: this.hour, weather: this.weather, day: 1 };
        this.progress.stats.timePlayed += Math.round((performance.now() - (this.sessionStart || 0)) / 1000);
        this.sessionStart = performance.now();
        const ok = save(this.progress);
        if (showToast) this.hud.toast(ok ? "Progress saved." : "Could not save here.", ok ? "SAVED" : "");
    }

    quitToMenu() {
        this.saveGame(false);
        this.togglePause(false);
        this.state = "menu";
        this.stats.mode = "menu";
        this.hud.hide("hudLayer");
        this.savedGame = load();
        this.hud.showMenu(this.savedGame
            ? `Level ${this.savedGame.level} · ${this.savedGame.missions.completed.length} of 6 chapters`
            : null);
    }

    updateStreetLights(dt) {
        const night = this.sky.nightFactor;
        this.updateFloodlights(dt, night);
        if (night < 0.2) {
            for (const light of this.streetLights) light.visible = false;
            this.roomLight.intensity = 0;
            return;
        }
        const position = this.player ? this.player.position : this.camera.position;
        const sorted = this.lampPositions
            .map((lamp) => ({ lamp, distance: lamp.distanceToSquared(position) }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, this.streetLights.length);
        this.streetLights.forEach((light, index) => {
            const entry = sorted[index];
            if (!entry || entry.distance > 3600) {
                light.visible = false;
                return;
            }
            light.visible = true;
            light.position.copy(entry.lamp);
            light.intensity = 40 * night;
        });

        const indoors = this.player
            && Math.abs(this.player.position.x - POIS.home.x) < 5
            && Math.abs(this.player.position.z - POIS.home.z) < 4.5;
        this.roomLight.intensity = indoors ? 9 : Math.max(0, night * 4);
    }

    /** Floodlights come on at dusk, and go to full for the final. */
    updateFloodlights(dt, night) {
        if (!this.floodlights?.length) return;
        const position = this.player ? this.player.position : this.camera.position;
        const nearCourt = Math.hypot(position.x - COURT.x, position.z - COURT.z) < 70;
        const target = nearCourt ? Math.max(night, this.match ? 0.8 : 0) : 0;
        for (const light of this.floodlights) {
            const want = target * 130 * light.userData.bank;
            light.intensity += (want - light.intensity) * Math.min(1, dt * 2.5);
            light.visible = light.intensity > 2;
        }
    }

    updateShotCharge(dt) {
        if (!this.shotCharge) return;
        // The meter sweeps up then back down, so timing matters as much as hold.
        this.shotCharge.power += this.shotCharge.direction * dt * 0.95;
        if (this.shotCharge.power >= 1) {
            this.shotCharge.power = 1;
            this.shotCharge.direction = -1;
        } else if (this.shotCharge.power <= 0) {
            this.shotCharge.power = 0;
            this.shotCharge.direction = 1;
        }
    }

    frame(dt) {
        if (this.state !== "playing" && this.state !== "results") {
            this.sky?.update(dt, this.camera.position);
            return;
        }
        if (this.paused || this.mapOpen) {
            this.sky.update(dt, this.player.position);
            return;
        }

        const raw = this.input.read();
        const input = {
            ...raw,
            sprint: raw.sprint || Boolean(this.touchSprint)
        };

        // Camera look.
        if (!this.chase.cinematicActive) {
            this.chase.rotate(input.mouse.x * 0.0022, input.mouse.y * 0.0018);
            if (input.cameraLeft) this.chase.rotate(-dt * 1.7, 0);
            if (input.cameraRight) this.chase.rotate(dt * 1.7, 0);
            if (input.wheel) this.chase.setDistance(this.chase.distance + input.wheel * 0.5);
        }

        const frozen = Boolean(this.dialogue) || Boolean(this.pendingCinematic) || Boolean(this.hud.activeChoice);
        const moveInput = frozen
            ? { forward: 0, right: 0, sprint: false, jump: false, brake: false, cameraYaw: this.chase.yaw }
            : { ...input, cameraYaw: this.chase.yaw };

        if (this.player.mode === "vehicle") {
            const vehicle = this.player.vehicle;
            vehicle.update(dt, moveInput, this.colliders);
            vehicle.setHeadlights(this.sky.nightFactor > 0.32);
            this.player.update(dt, moveInput);
            if (vehicle.spec.engine) {
                this.audio.updateEngine(Math.min(1, Math.abs(vehicle.speed) / vehicle.spec.topSpeed), Math.abs(moveInput.forward));
            } else {
                this.audio.roll(Math.abs(vehicle.speed), vehicle.surface);
            }
        } else {
            this.player.update(dt, moveInput);
        }

        if (this.freeCam) {
            this.camera.position.copy(this.freeCam.position);
            this.camera.lookAt(this.freeCam.lookAt);
        } else {
            this.chase.update(dt, this.player);
        }

        // Time of day and weather.
        this.hour = (this.hour + (dt * this.timeScale) / 3600) % 24;
        this.sky.setTime(this.hour);
        this.sky.update(dt, this.player.position);
        this.updateStreetLights(dt);

        // World systems.
        this.signals.update(dt);
        this.traffic.update(dt, this.sky.nightFactor, this.player.position);
        this.crowd.update(dt, {
            playerPosition: this.player.position,
            wetness: WEATHER_TYPES[this.weather].wetness,
            nightFactor: this.sky.nightFactor,
            hour: this.hour
        });
        this.courtCrowd.update(dt);
        for (const friend of this.friends) friend.update(dt, this.player.position);
        this.opponent?.update(dt, this.player.position);

        // Basketball.
        this.updateShotCharge(dt);
        if (this.ballOwner === "player" && this.ball.state === "held") {
            this.ballPhase = (this.ballPhase || 0) + dt * (this.shotCharge ? 0.6 : 2.4);
            this.ball.dribbleAt(this.player.position, this.player.facing, this.ballPhase);
        } else {
            this.ball.update(dt);
        }
        if (this.defender && this.match) {
            this.defender.update(dt, this.ball, this.player.position, this.hoops[1]);
        }
        this.updateMatch(dt);

        // Missions.
        this.missions?.tick(dt);
        this.checkArrivals();
        this.interactable = this.findInteractable();

        // Cinematic bookkeeping.
        if (this.pendingCinematic) {
            this.pendingCinematic.timer -= dt;
            if (this.pendingCinematic.timer <= 0) this.endCinematic();
        }

        // Audio ambience.
        const indoors = Math.abs(this.player.position.x - POIS.home.x) < 5
            && Math.abs(this.player.position.z - POIS.home.z) < 4.5;
        this.audio.updateAmbience(dt, this.player.position, {
            wetness: WEATHER_TYPES[this.weather].wetness,
            nightFactor: this.sky.nightFactor,
            indoors
        });

        this.updateHud();
    }

    updateHud() {
        const marker = this.missions?.markerPlace;
        let markerInfo = null;
        if (marker) {
            const dx = marker.x - this.player.position.x;
            const dz = marker.z - this.player.position.z;
            const distance = Math.hypot(dx, dz);
            const worldAngle = Math.atan2(dx, dz);
            markerInfo = { angle: -(worldAngle - this.chase.yaw) + Math.PI, distance };
        }

        this.hud.update({
            district: districtAt(this.player.position.x, this.player.position.z),
            hour: this.hour,
            weather: this.weather,
            xp: this.progress.xp,
            mission: this.missions ? this.missions.snapshot() : null,
            marker: markerInfo,
            vehicle: this.player.mode === "vehicle"
                ? { label: this.player.vehicle.spec.label, speed: this.player.vehicle.speed }
                : null,
            match: this.match,
            shot: this.shotCharge
                ? {
                    power: this.shotCharge.power,
                    ideal: idealPower(Math.hypot(
                        this.hoops[1].position.x - this.player.position.x,
                        this.hoops[1].position.z - this.player.position.z
                    ))
                }
                : null,
            prompt: this.interactable && !this.dialogue
                ? { key: this.interactable.key, text: this.interactable.text }
                : null
        });
    }

    renderLoop() {
        const loop = () => {
            requestAnimationFrame(loop);
            const dt = Math.min(this.clock.getDelta(), 0.05);

            if (this.input) this.handleActions(this.input.consumeActions());
            this.frame(dt);
            this.renderPreview(dt);

            if (this.state === "playing" || this.state === "results") {
                this.post.render(dt, this.sky.flash * 0.6);
            } else if (this.state === "menu" || this.state === "loading") {
                // Idle camera drift over the city behind the menu.
                this.menuAngle = (this.menuAngle || 0) + dt * 0.028;
                const radius = 96;
                this.camera.position.set(
                    Math.cos(this.menuAngle) * radius + 20,
                    38,
                    Math.sin(this.menuAngle) * radius - 10
                );
                this.camera.lookAt(20, 8, -10);
                if (this.sky) this.sky.update(dt, this.camera.position);
                if (this.post) this.post.render(dt);
                else this.renderer.render(this.scene, this.camera);
            }

            this.frameTimes.push(dt);
            if (this.frameTimes.length > 40) this.frameTimes.shift();
            const average = this.frameTimes.reduce((sum, value) => sum + value, 0) / this.frameTimes.length;
            this.stats.fps = 1 / Math.max(average, 0.0001);
            this.stats.drawCalls = this.post ? this.post.sceneCost.calls : this.renderer.info.render.calls;
            this.stats.triangles = this.post ? this.post.sceneCost.triangles : this.renderer.info.render.triangles;
        };
        loop();
    }
}

let game;
try {
    game = new Game();
} catch (error) {
    console.error(error);
    window.__cityLoader?.fail(error?.message || "Could not start the city");
}

// Mouse shooting: hold to load, release to fire.
canvas?.addEventListener("mousedown", (event) => {
    if (event.button === 0) game?.beginShotCharge();
});
window.addEventListener("mouseup", (event) => {
    if (event.button === 0) game?.releaseShot();
});
window.addEventListener("keyup", (event) => {
    if (event.code === "KeyJ") game?.releaseShot();
});

/** Debug and automation surface used by the screenshot harness. */
window.__city = {
    get stats() { return game.stats; },
    get progress() { return game.progress; },
    setTime: (hour) => { game.hour = hour; game.sky.setTime(hour); },
    setWeather: (name) => game.setWeather(name),
    teleport: (place) => {
        const poi = POIS[place];
        if (!poi || !game.player) return false;
        const spot = game.findOpenSpot(poi.x, poi.z, poi.radius || 6);
        game.player.teleport(spot.x, spot.z, Math.atan2(poi.x - spot.x, poi.z - spot.z));
        return true;
    },
    startTournament: () => {
        game.prepareFinal();
        game.skipCinematic();
        game.startMatch("tournament");
    },
    startDrill: () => game.startDrill(),
    shoot: (power = 0.55) => {
        game.beginShotCharge();
        if (game.shotCharge) game.shotCharge.power = power;
        game.releaseShot();
    },
    skipCinematic: () => game.skipCinematic(),
    /** Detached camera, so the realism pass can frame the city deliberately. */
    freeCam: (position, lookAt) => {
        game.freeCam = position
            ? {
                position: new THREE.Vector3(position[0], position[1], position[2]),
                lookAt: new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2])
            }
            : null;
        if (!game.freeCam) game.chase.snap = true;
    },
    pause: (on) => game.togglePause(on),
    map: () => game.toggleMap(),
    ride: (kind = "bike") => {
        const vehicle = game.vehicles.find((entry) => entry.kind === kind);
        if (!vehicle || !game.player) return false;
        vehicle.position.set(
            game.player.position.x,
            groundHeight(game.player.position.x, game.player.position.z),
            game.player.position.z
        );
        game.player.enterVehicle(vehicle);
        if (vehicle.spec.engine) game.audio.startEngine();
        return true;
    },
    clearSave: () => clearSave(),
    xpInfo: () => xpIntoLevel(game.progress.xp),
    game
};
