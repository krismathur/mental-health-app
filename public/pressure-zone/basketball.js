/**
 * Basketball simulation.
 *
 * The ball is a real projectile with gravity, drag, spin and restitution. It
 * collides with the floor, the rim torus and the backboard plane, so shots
 * rattle in, roll out and bank off the glass rather than being decided by a
 * dice roll. Aim and power come from the player holding and releasing shoot.
 */
import * as THREE from "./vendor/three.module.js";
import { materials } from "./materials.js";
import { COURT, groundHeight } from "./world-data.js";
import { playShot } from "./character.js";

const GRAVITY = -9.81;
const BALL_RADIUS = 0.121;
const RIM_RADIUS = 0.229;
const RESTITUTION_FLOOR = 0.78;
const RESTITUTION_RIM = 0.42;
const DRAG = 0.16;

function buildBall() {
    const group = new THREE.Group();
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(BALL_RADIUS, 24, 18),
        materials.rubber(0xc4602c)
    );
    ball.castShadow = true;
    ball.receiveShadow = true;
    group.add(ball);

    // Seams, which make the spin readable in flight.
    const seamMaterial = materials.rubber(0x1d1a17);
    const ring = new THREE.TorusGeometry(BALL_RADIUS * 0.999, 0.0055, 6, 32);
    for (const rotation of [
        new THREE.Euler(0, 0, 0),
        new THREE.Euler(Math.PI / 2, 0, 0),
        new THREE.Euler(0, Math.PI / 2, 0)
    ]) {
        const seam = new THREE.Mesh(ring, seamMaterial);
        seam.rotation.copy(rotation);
        group.add(seam);
    }
    return group;
}

export class Basketball {
    constructor(scene) {
        this.scene = scene;
        this.mesh = buildBall();
        this.mesh.visible = false;
        scene.add(this.mesh);
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.spin = new THREE.Vector3();
        this.state = "idle";
        this.holder = null;
        this.onBounce = null;
        this.onRim = null;
        this.onScore = null;
        this.onLoose = null;
        this.hoop = null;
        this.scoredThisFlight = false;
        this.passTarget = null;
    }

    setHoop(hoop) {
        this.hoop = hoop;
    }

    attachTo(character) {
        this.holder = character;
        this.state = "held";
        this.mesh.visible = true;
    }

    release() {
        this.holder = null;
    }

    /** Launch toward a target with a chosen arc quality. */
    shoot(from, target, power, accuracy) {
        this.position.copy(from);
        const toTarget = new THREE.Vector3().subVectors(target, from);
        const horizontal = Math.hypot(toTarget.x, toTarget.z);
        const rise = toTarget.y;

        // Solve the launch speed for a 52 degree arc, then let power and
        // accuracy perturb it the way a real release would.
        const angle = THREE.MathUtils.degToRad(50 + (1 - power) * 8);
        const speedSquared = (GRAVITY * horizontal * horizontal)
            / (2 * Math.cos(angle) * Math.cos(angle) * (rise - horizontal * Math.tan(angle)));
        let speed = Math.sqrt(Math.abs(speedSquared)) || 7;
        speed *= 0.94 + power * 0.12;

        const error = (1 - accuracy);
        const yaw = Math.atan2(toTarget.x, toTarget.z) + (Math.random() - 0.5) * error * 0.24;
        const pitchError = (Math.random() - 0.5) * error * 0.18;

        this.velocity.set(
            Math.sin(yaw) * Math.cos(angle + pitchError) * speed,
            Math.sin(angle + pitchError) * speed,
            Math.cos(yaw) * Math.cos(angle + pitchError) * speed
        );
        this.spin.set(-2.4 - power * 3, 0, 0);
        this.state = "flight";
        this.holder = null;
        this.scoredThisFlight = false;
        this.passedRimPlane = false;
        this.mesh.visible = true;
    }

    passTo(from, target) {
        this.position.copy(from);
        const toTarget = new THREE.Vector3().subVectors(target, from);
        const distance = Math.hypot(toTarget.x, toTarget.z);
        const time = Math.max(0.32, distance / 11);
        this.velocity.set(
            toTarget.x / time,
            (toTarget.y - 0.5 * GRAVITY * time * time) / time,
            toTarget.z / time
        );
        this.state = "flight";
        this.holder = null;
        this.scoredThisFlight = false;
        this.mesh.visible = true;
    }

    dribbleAt(position, facing, phase) {
        // Ball tracks the hand and bounces in place.
        const side = new THREE.Vector3(Math.cos(facing), 0, -Math.sin(facing));
        const forward = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
        const height = Math.abs(Math.sin(phase * Math.PI)) * 0.72 + BALL_RADIUS;
        this.position.set(
            position.x + side.x * 0.42 + forward.x * 0.24,
            groundHeight(position.x, position.z) + height,
            position.z + side.z * 0.42 + forward.z * 0.24
        );
        this.mesh.position.copy(this.position);
        this.mesh.rotation.x += 0.14;
        this.mesh.visible = true;
    }

    update(dt) {
        if (this.state !== "flight") return;

        // Quadratic drag plus Magnus-free spin decay is enough at this scale.
        const speed = this.velocity.length();
        this.velocity.addScaledVector(this.velocity, -DRAG * speed * dt * 0.06);
        this.velocity.y += GRAVITY * dt;

        const previous = this.position.clone();
        this.position.addScaledVector(this.velocity, dt);

        this.collideRim(previous);
        this.collideBackboard(previous);
        this.checkScore(previous);

        const floor = groundHeight(this.position.x, this.position.z) + BALL_RADIUS;
        if (this.position.y <= floor) {
            this.position.y = floor;
            const impact = Math.abs(this.velocity.y);
            this.velocity.y = impact * RESTITUTION_FLOOR;
            this.velocity.x *= 0.86;
            this.velocity.z *= 0.86;
            if (this.onBounce) this.onBounce(Math.min(1, impact / 7));
            if (impact < 0.9) {
                this.velocity.set(this.velocity.x * 0.5, 0, this.velocity.z * 0.5);
                if (this.velocity.lengthSq() < 0.08) {
                    this.state = "loose";
                    if (this.onLoose) this.onLoose(this.position.clone());
                }
            }
        }

        this.mesh.position.copy(this.position);
        this.mesh.rotation.x += this.spin.x * dt;
        this.mesh.rotation.z += this.velocity.x * dt * 0.6;
    }

    collideRim(previous) {
        if (!this.hoop) return;
        const rim = this.hoop.position;
        const dy = this.position.y - rim.y;
        if (Math.abs(dy) > BALL_RADIUS + 0.04) return;

        const dx = this.position.x - rim.x;
        const dz = this.position.z - rim.z;
        const radial = Math.hypot(dx, dz);
        const gap = Math.abs(radial - RIM_RADIUS);
        if (gap > BALL_RADIUS) return;

        // Push the ball out of the ring and reflect its velocity.
        const normal = new THREE.Vector3(
            (dx / (radial || 1)) * (radial > RIM_RADIUS ? 1 : -1),
            dy > 0 ? 0.55 : -0.35,
            (dz / (radial || 1)) * (radial > RIM_RADIUS ? 1 : -1)
        ).normalize();
        const along = this.velocity.dot(normal);
        if (along < 0) {
            this.velocity.addScaledVector(normal, -along * (1 + RESTITUTION_RIM));
            this.velocity.multiplyScalar(0.82);
            this.position.addScaledVector(normal, BALL_RADIUS - gap + 0.005);
            if (this.onRim) this.onRim("rim");
        }
        void previous;
    }

    collideBackboard(previous) {
        if (!this.hoop) return;
        const boardX = this.hoop.position.x - this.hoop.facing * 0.4;
        const crossed = (previous.x - boardX) * (this.position.x - boardX) < 0;
        const withinBoard = Math.abs(this.position.z - this.hoop.position.z) < 0.95
            && this.position.y > this.hoop.position.y - 0.05
            && this.position.y < this.hoop.position.y + 1.05;
        if (crossed && withinBoard) {
            this.position.x = boardX + this.hoop.facing * (BALL_RADIUS + 0.01);
            this.velocity.x *= -0.55;
            this.velocity.y *= 0.86;
            this.velocity.z *= 0.9;
            if (this.onRim) this.onRim("backboard");
        }
    }

    checkScore(previous) {
        if (!this.hoop || this.scoredThisFlight) return;
        const rim = this.hoop.position;
        const wasAbove = previous.y > rim.y;
        const isBelow = this.position.y <= rim.y;
        if (!(wasAbove && isBelow)) return;

        // Interpolate the crossing point for an accurate through-the-hoop test.
        const t = (previous.y - rim.y) / Math.max(previous.y - this.position.y, 0.0001);
        const crossX = previous.x + (this.position.x - previous.x) * t;
        const crossZ = previous.z + (this.position.z - previous.z) * t;
        const radial = Math.hypot(crossX - rim.x, crossZ - rim.z);

        if (radial < RIM_RADIUS - BALL_RADIUS * 0.35 && this.velocity.y < 0) {
            this.scoredThisFlight = true;
            if (this.onRim) this.onRim("swish");
            if (this.onScore) this.onScore();
        }
    }
}

/** A defender that closes out, contests and occasionally beats you to it. */
export class Defender {
    constructor(friendCharacter, skill = 0.6) {
        this.character = friendCharacter;
        this.skill = skill;
        this.state = "guard";
        this.reactionTimer = 0;
        this.pressure = 0;
    }

    update(dt, ball, playerPosition, hoop) {
        const self = this.character.object.position;
        const toHoop = new THREE.Vector3().subVectors(hoop.position, playerPosition).setY(0).normalize();

        // Stand between the player and the basket, closing the gap over time.
        const standoff = 1.35 + (1 - this.skill) * 1.2;
        const guardX = playerPosition.x + toHoop.x * standoff;
        const guardZ = playerPosition.z + toHoop.z * standoff;

        this.reactionTimer -= dt;
        if (this.reactionTimer <= 0) {
            this.reactionTimer = 0.28 + (1 - this.skill) * 0.5;
            this.character.moveTo(guardX, guardZ, { speed: 2.2 + this.skill * 2.4 });
        }

        const distance = Math.hypot(self.x - playerPosition.x, self.z - playerPosition.z);
        this.pressure = THREE.MathUtils.clamp(1 - (distance - 0.9) / 2.6, 0, 1);
        this.character.faceToward(playerPosition);

        // Hands up when the shot is going up.
        if (ball.state === "flight" && distance < 3) {
            this.character.rig.state.armOverride = (arm) => {
                arm.upper.rotation.x = -2.5;
                arm.elbow.rotation.x = -0.25;
            };
        } else if (this.pressure > 0.5) {
            this.character.rig.state.armOverride = (arm, side) => {
                arm.upper.rotation.x = -0.5;
                arm.upper.rotation.z = (side === "left" ? 1 : -1) * 0.85;
                arm.elbow.rotation.x = -0.5;
            };
        } else {
            this.character.rig.state.armOverride = null;
        }
    }
}

const ANNOUNCER_LINES = {
    make: [
        "Knocks it down!",
        "Nothing but net.",
        "Cash. That is ice water.",
        "Buries it from range.",
        "Off the glass and in!"
    ],
    miss: [
        "Front rim, no good.",
        "Rattles out.",
        "Short on that one.",
        "Contested and off the iron."
    ],
    pressure: [
        "Crowd is on their feet.",
        "Shot clock winding down.",
        "This is the moment.",
        "Timeout is gone. It is on them now."
    ],
    comeback: [
        "They are chipping away!",
        "What a run.",
        "Momentum has flipped."
    ]
};

export class Announcer {
    constructor(onLine) {
        this.onLine = onLine;
        this.cooldown = 0;
        this.lastIndex = -1;
    }

    say(category, force = false) {
        if (this.cooldown > 0 && !force) return;
        const lines = ANNOUNCER_LINES[category];
        if (!lines) return;
        let index = Math.floor(Math.random() * lines.length);
        if (index === this.lastIndex) index = (index + 1) % lines.length;
        this.lastIndex = index;
        this.cooldown = 2.6;
        if (this.onLine) this.onLine(lines[index]);
    }

    update(dt) {
        this.cooldown = Math.max(0, this.cooldown - dt);
    }
}

export const GAME_MODES = {
    practice: { label: "Shooting drill", target: 5, clock: 0, opponent: false },
    oneOnOne: { label: "First to 7", target: 7, clock: 0, opponent: true },
    tournament: { label: "Fulton Cup Final", target: 21, clock: 240, opponent: true }
};

/**
 * Match state: score, clocks, streaks and the pressure curve. Kept free of
 * rendering so the headless test can play a whole game.
 */
export class MatchState {
    constructor(mode = "tournament", options = {}) {
        this.mode = mode;
        this.config = { ...GAME_MODES[mode], ...options };
        this.playerScore = 0;
        this.opponentScore = 0;
        this.clock = this.config.clock;
        this.shotClock = 24;
        this.attempts = 0;
        this.makes = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.missStreak = 0;
        this.finished = false;
        this.result = null;
        this.events = [];
        this.quarter = 1;
    }

    get accuracy() {
        return this.attempts ? this.makes / this.attempts : 0;
    }

    /** How much pressure the situation carries, 0 to 1. */
    get pressure() {
        if (this.mode === "practice") return 0.1;
        const margin = this.opponentScore - this.playerScore;
        const clockPressure = this.config.clock ? 1 - this.clock / this.config.clock : 0.4;
        const marginPressure = THREE.MathUtils.clamp((margin + 4) / 12, 0, 1);
        const shotClockPressure = 1 - this.shotClock / 24;
        return THREE.MathUtils.clamp(
            clockPressure * 0.45 + marginPressure * 0.4 + shotClockPressure * 0.15,
            0,
            1
        );
    }

    recordShot(made, points = 2) {
        this.attempts += 1;
        if (made) {
            this.makes += 1;
            this.streak += 1;
            this.missStreak = 0;
            this.bestStreak = Math.max(this.bestStreak, this.streak);
            this.playerScore += points;
            this.events.push({ type: "make", points, at: this.clock });
        } else {
            this.streak = 0;
            this.missStreak += 1;
            this.events.push({ type: "miss", at: this.clock });
        }
        this.shotClock = 24;
        this.checkEnd();
        return made;
    }

    opponentScores(points = 2) {
        this.opponentScore += points;
        this.events.push({ type: "opponent", points, at: this.clock });
        this.shotClock = 24;
        this.checkEnd();
    }

    tick(dt) {
        if (this.finished) return;
        if (this.config.clock) {
            this.clock = Math.max(0, this.clock - dt);
            if (this.clock <= 0) this.finish();
        }
        this.shotClock = Math.max(0, this.shotClock - dt);
    }

    resetShotClock() {
        this.shotClock = 24;
    }

    checkEnd() {
        if (this.config.target && this.mode !== "tournament") {
            if (this.playerScore >= this.config.target || this.opponentScore >= this.config.target) {
                this.finish();
            }
        }
    }

    finish() {
        if (this.finished) return;
        this.finished = true;
        this.result = this.playerScore > this.opponentScore
            ? "win"
            : this.playerScore === this.opponentScore ? "draw" : "loss";
    }

    get scoreline() {
        return `${this.playerScore} - ${this.opponentScore}`;
    }
}

/**
 * Decides whether a shot goes in. Distance, contest, movement and pressure
 * all matter; composure earned through the mental system offsets pressure.
 */
export function computeShotQuality({
    distance,
    contest = 0,
    power = 0.5,
    timing = 1,
    moving = 0,
    pressure = 0,
    composure = 0.5
}) {
    const range = THREE.MathUtils.clamp(1 - Math.max(0, distance - 1.6) / 8.5, 0.08, 1);
    const powerWindow = 1 - Math.abs(power - idealPower(distance)) * 1.9;
    const contestPenalty = contest * 0.42;
    const movementPenalty = moving * 0.22;
    const pressurePenalty = Math.max(0, pressure - composure) * 0.35;

    const quality = range * 0.44
        + THREE.MathUtils.clamp(powerWindow, 0, 1) * 0.3
        + timing * 0.26
        - contestPenalty
        - movementPenalty
        - pressurePenalty;

    return THREE.MathUtils.clamp(quality, 0.03, 0.97);
}

/** The power the meter should be released at for a given distance. */
export function idealPower(distance) {
    return THREE.MathUtils.clamp(0.3 + distance / 14, 0.28, 0.95);
}

export function shotPoints(distance) {
    return distance > 6.75 ? 3 : 2;
}

/** Drives the player's shooting arm during a release. */
export function animateShot(rig) {
    playShot(rig, 0.58);
}

export { BALL_RADIUS, COURT };
