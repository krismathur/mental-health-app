/**
 * Player controller and third-person camera.
 *
 * Movement is momentum based: input sets a target velocity and the body
 * accelerates toward it, so starting and stopping have weight. The camera is
 * a spring arm that shortens when a wall gets between it and the player.
 */
import * as THREE from "./vendor/three.module.js";
import { createCharacter, lookAt, setDribble } from "./character.js";
import { CITY, groundHeight, surfaceAt } from "./world-data.js";

const UP = new THREE.Vector3(0, 1, 0);

export const MOVEMENT = Object.freeze({
    walkSpeed: 1.9,
    runSpeed: 4.4,
    sprintSpeed: 6.3,
    acceleration: 14,
    braking: 18,
    turnRate: 11,
    jumpVelocity: 4.6,
    gravity: -18.5
});

export class Player {
    constructor(scene, appearance, colliders) {
        this.scene = scene;
        this.colliders = colliders;
        this.rig = createCharacter(appearance, "full");
        this.object = this.rig.root;
        this.object.position.set(0, 0, 0);
        scene.add(this.object);

        this.position = this.object.position;
        this.velocity = new THREE.Vector3();
        this.desired = new THREE.Vector3();
        this.facing = 0;
        this.radius = 0.34;
        this.height = 1.62;
        this.grounded = true;
        this.verticalVelocity = 0;
        this.surface = "sidewalk";
        this.speed = 0;
        this.mode = "onFoot";
        this.vehicle = null;
        this.stepDistance = 0;
        this.onFootstep = null;
        this.enabled = true;
        this.frozen = false;
    }

    setAppearance(appearance) {
        const position = this.object.position.clone();
        const rotation = this.object.rotation.y;
        this.scene.remove(this.object);
        this.rig = createCharacter(appearance, "full");
        this.object = this.rig.root;
        this.object.position.copy(position);
        this.object.rotation.y = rotation;
        this.position = this.object.position;
        this.scene.add(this.object);
    }

    teleport(x, z, facing = this.facing) {
        this.position.set(x, groundHeight(x, z), z);
        this.facing = facing;
        this.object.rotation.y = facing;
        this.velocity.set(0, 0, 0);
        this.verticalVelocity = 0;
        this.teleported = true;
    }

    setDribbling(active) {
        setDribble(this.rig, active);
    }

    /**
     * @param input {{forward:number,right:number,sprint:boolean,jump:boolean,cameraYaw:number}}
     */
    update(dt, input) {
        if (this.mode === "vehicle" && this.vehicle) {
            this.updateInVehicle(dt);
            return;
        }
        if (this.frozen) {
            this.speed += (0 - this.speed) * Math.min(1, dt * 8);
            this.rig.update(dt, { speed: this.speed, mode: "idle" });
            return;
        }

        // Movement is relative to where the camera is looking.
        const forward = new THREE.Vector3(Math.sin(input.cameraYaw), 0, Math.cos(input.cameraYaw));
        const right = new THREE.Vector3().crossVectors(UP, forward).normalize();
        this.desired.set(0, 0, 0)
            .addScaledVector(forward, input.forward)
            .addScaledVector(right, -input.right);

        const magnitude = this.desired.length();
        if (magnitude > 1) this.desired.divideScalar(magnitude);

        const wantsSprint = input.sprint && input.forward > 0.1;
        const topSpeed = magnitude < 0.55
            ? MOVEMENT.walkSpeed
            : wantsSprint ? MOVEMENT.sprintSpeed : MOVEMENT.runSpeed;
        const target = this.desired.clone().multiplyScalar(topSpeed * Math.min(1, magnitude * 1.4));

        const rate = target.lengthSq() > this.velocity.lengthSq() ? MOVEMENT.acceleration : MOVEMENT.braking;
        this.velocity.x += (target.x - this.velocity.x) * Math.min(1, dt * rate);
        this.velocity.z += (target.z - this.velocity.z) * Math.min(1, dt * rate);
        if (this.velocity.lengthSq() < 0.0004) this.velocity.set(0, 0, 0);

        // Turn the body toward travel direction rather than snapping.
        if (this.velocity.lengthSq() > 0.02) {
            const targetFacing = Math.atan2(this.velocity.x, this.velocity.z);
            const delta = Math.atan2(
                Math.sin(targetFacing - this.facing),
                Math.cos(targetFacing - this.facing)
            );
            this.facing += delta * Math.min(1, dt * MOVEMENT.turnRate);
        }
        this.object.rotation.y = this.facing;

        // Jump and gravity.
        if (input.jump && this.grounded) {
            this.verticalVelocity = MOVEMENT.jumpVelocity;
            this.grounded = false;
        }
        this.verticalVelocity += MOVEMENT.gravity * dt;

        this.moveWithCollision(this.velocity.x * dt, this.velocity.z * dt);

        const ground = groundHeight(this.position.x, this.position.z);
        let y = this.position.y + this.verticalVelocity * dt;
        if (y <= ground) {
            y = ground;
            this.verticalVelocity = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }
        this.position.y = y;

        this.speed = Math.hypot(this.velocity.x, this.velocity.z);
        this.surface = surfaceAt(this.position.x, this.position.z);

        // Footsteps fire on distance travelled, so they stay in step at any speed.
        if (this.grounded && this.speed > 0.4) {
            this.stepDistance += this.speed * dt;
            const strideLength = this.speed > 4.6 ? 1.55 : 0.92;
            if (this.stepDistance >= strideLength) {
                this.stepDistance = 0;
                if (this.onFootstep) this.onFootstep(this.surface, Math.min(1, this.speed / 6));
            }
        } else if (this.speed < 0.2) {
            this.stepDistance = 0.6;
        }

        this.rig.state.lean = -Math.min(0.09, this.speed * 0.014);
        this.rig.update(dt, { speed: this.speed, mode: this.grounded ? "walk" : "air" });
    }

    updateInVehicle(dt) {
        const seat = this.vehicle.getSeatPosition();
        this.position.copy(seat.position);
        this.object.rotation.y = seat.rotation;
        this.facing = seat.rotation;
        this.speed = 0;
        this.rig.update(dt, { speed: 0, mode: this.vehicle.kind === "car" ? "sit" : "idle" });
    }

    /** Slides along walls instead of sticking to them. */
    moveWithCollision(dx, dz) {
        const tryAxis = (axis, amount) => {
            if (!amount) return;
            const previous = this.position[axis];
            this.position[axis] += amount;
            if (this.collides(this.position.x, this.position.z)) this.position[axis] = previous;
        };
        tryAxis("x", dx);
        tryAxis("z", dz);
        this.position.x = THREE.MathUtils.clamp(this.position.x, CITY.minX + 2, CITY.maxX - 2);
        this.position.z = THREE.MathUtils.clamp(this.position.z, CITY.minZ + 2, CITY.maxZ - 2);
    }

    collides(x, z) {
        const feetY = this.position.y;
        for (const collider of this.colliders) {
            if (collider.height <= feetY + 0.35) continue;
            if (x + this.radius > collider.minX && x - this.radius < collider.maxX
                && z + this.radius > collider.minZ && z - this.radius < collider.maxZ) {
                return true;
            }
        }
        return false;
    }

    enterVehicle(vehicle) {
        this.mode = "vehicle";
        this.vehicle = vehicle;
        vehicle.occupied = true;
        this.object.visible = vehicle.kind !== "car";
    }

    exitVehicle() {
        const vehicle = this.vehicle;
        this.mode = "onFoot";
        this.object.visible = true;
        if (vehicle) {
            vehicle.occupied = false;
            const side = new THREE.Vector3(Math.cos(vehicle.heading), 0, -Math.sin(vehicle.heading));
            const exit = vehicle.position.clone().addScaledVector(side, 1.6);
            this.teleport(exit.x, exit.z, vehicle.heading);
            this.vehicle = null;
        }
    }

    lookAtPoint(point) {
        lookAt(this.rig, point, this.position, this.facing);
    }

    clearLook() {
        this.rig.state.headYaw *= 0.8;
        this.rig.state.headPitch *= 0.8;
    }
}

/**
 * Spring-arm third person camera with wall avoidance, run bob and a small
 * field-of-view push when moving fast.
 */
export class ChaseCamera {
    constructor(camera, colliders) {
        this.camera = camera;
        this.colliders = colliders;
        this.yaw = Math.PI;
        this.pitch = 0.16;
        this.distance = 4.6;
        this.currentDistance = 4.6;
        this.height = 1.42;
        this.target = new THREE.Vector3();
        this.smoothTarget = new THREE.Vector3();
        this.baseFov = camera.fov;
        this.bob = 0;
        this.shake = 0;
        this.mode = "follow";
        this.cinematic = null;
        this.initialised = false;
    }

    rotate(deltaYaw, deltaPitch) {
        this.yaw -= deltaYaw;
        this.pitch = THREE.MathUtils.clamp(this.pitch + deltaPitch, -0.5, 1.05);
    }

    setDistance(distance) {
        this.distance = THREE.MathUtils.clamp(distance, 2.2, 9);
    }

    addShake(amount) {
        this.shake = Math.min(1, this.shake + amount);
    }

    /** Starts a framed shot that eases back to gameplay control. */
    playCinematic({ position, lookAt: lookTarget, duration = 3.2, orbit = 0.12 }) {
        this.cinematic = {
            position: position.clone(),
            lookAt: lookTarget.clone(),
            duration,
            elapsed: 0,
            orbit
        };
    }

    skipCinematic() {
        this.cinematic = null;
    }

    get cinematicActive() {
        return Boolean(this.cinematic);
    }

    update(dt, player) {
        const focusHeight = player.mode === "vehicle" ? 1.1 : this.height;
        this.target.set(player.position.x, player.position.y + focusHeight, player.position.z);

        if (!this.initialised || player.teleported) {
            this.smoothTarget.copy(this.target);
            this.currentDistance = this.distance;
            this.initialised = true;
            player.teleported = false;
            this.snap = true;
        }
        // Trailing focus point: the camera lags slightly, which reads cinematic.
        this.smoothTarget.lerp(this.target, Math.min(1, dt * 9));

        if (this.cinematic) {
            this.cinematic.elapsed += dt;
            const t = Math.min(1, this.cinematic.elapsed / this.cinematic.duration);
            const eased = t * t * (3 - 2 * t);
            const angle = this.cinematic.orbit * eased;
            const offset = this.cinematic.position.clone().sub(this.cinematic.lookAt);
            offset.applyAxisAngle(UP, angle);
            this.camera.position.copy(this.cinematic.lookAt).add(offset);
            this.camera.lookAt(this.cinematic.lookAt);
            this.camera.fov += (this.baseFov - 6 - this.camera.fov) * Math.min(1, dt * 3);
            this.camera.updateProjectionMatrix();
            if (t >= 1) {
                this.cinematic = null;
                // Hand control back facing the same way the shot ended.
                const back = new THREE.Vector3().subVectors(this.camera.position, this.smoothTarget);
                this.yaw = Math.atan2(back.x, back.z);
            }
            return;
        }

        const desiredDistance = player.mode === "vehicle" ? this.distance + 1.9 : this.distance;
        const offset = new THREE.Vector3(
            Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch) + 0.28,
            Math.cos(this.yaw) * Math.cos(this.pitch)
        ).multiplyScalar(desiredDistance);

        // Pull in when geometry blocks the shot.
        const blocked = this.castDistance(this.smoothTarget, offset, desiredDistance);
        this.currentDistance += (blocked - this.currentDistance) * Math.min(1, dt * (blocked < this.currentDistance ? 22 : 6));

        const finalOffset = offset.clone().setLength(Math.max(1.1, this.currentDistance));
        const position = this.smoothTarget.clone().add(finalOffset);
        position.y = Math.max(position.y, groundHeight(position.x, position.z) + 0.45);

        if (this.snap) {
            this.camera.position.copy(position);
            this.snap = false;
        } else {
            this.camera.position.lerp(position, Math.min(1, dt * 14));
        }
        // The lerp can sweep the camera through a wall even when the arm length is
        // legal, so evict it from anything it ended up inside.
        this.evictFromGeometry();

        // Run bob and shake, kept subtle.
        const speed = player.speed || 0;
        this.bob += dt * (6 + speed * 1.9);
        this.shake = Math.max(0, this.shake - dt * 2.2);
        const bobAmount = Math.min(0.05, speed * 0.008);
        const shakeAmount = this.shake * 0.06;
        this.camera.position.y += Math.sin(this.bob * 2) * bobAmount + (Math.random() - 0.5) * shakeAmount;
        this.camera.position.x += (Math.random() - 0.5) * shakeAmount;

        const lookTarget = this.smoothTarget.clone();
        lookTarget.y += Math.sin(this.bob) * bobAmount * 0.4;
        this.camera.lookAt(lookTarget);
        this.camera.rotation.z += Math.sin(this.bob * 0.5) * bobAmount * 0.12;

        const targetFov = this.baseFov + Math.max(0, speed - 3.4) * 2.1 + (player.mode === "vehicle" ? 6 : 0);
        this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4);
        this.camera.updateProjectionMatrix();
    }

    /** Pushes the camera out through the nearest face of any box it is inside. */
    evictFromGeometry() {
        const position = this.camera.position;
        for (const collider of this.colliders) {
            if (collider.tag === "tree" || collider.tag === "prop") continue;
            if (position.y > collider.height) continue;
            if (position.x <= collider.minX || position.x >= collider.maxX) continue;
            if (position.z <= collider.minZ || position.z >= collider.maxZ) continue;

            const exits = [
                { axis: "x", value: collider.minX - 0.3, depth: position.x - collider.minX },
                { axis: "x", value: collider.maxX + 0.3, depth: collider.maxX - position.x },
                { axis: "z", value: collider.minZ - 0.3, depth: position.z - collider.minZ },
                { axis: "z", value: collider.maxZ + 0.3, depth: collider.maxZ - position.z },
                { axis: "y", value: collider.height + 0.3, depth: collider.height - position.y }
            ];
            const nearest = exits.reduce((best, exit) => (exit.depth < best.depth ? exit : best));
            position[nearest.axis] = nearest.value;
        }
        position.y = Math.max(position.y, groundHeight(position.x, position.z) + 0.4);
    }

    /** Cheap swept test against the collider boxes. */
    castDistance(origin, offset, maxDistance) {
        const steps = 8;
        const direction = offset.clone().normalize();
        for (let step = 1; step <= steps; step += 1) {
            const distance = (step / steps) * maxDistance;
            const point = origin.clone().addScaledVector(direction, distance);
            if (point.y < groundHeight(point.x, point.z) + 0.4) return Math.max(1.1, distance - 0.4);
            for (const collider of this.colliders) {
                if (collider.tag === "tree" || collider.tag === "prop") continue;
                if (point.y > collider.height) continue;
                if (point.x > collider.minX - 0.25 && point.x < collider.maxX + 0.25
                    && point.z > collider.minZ - 0.25 && point.z < collider.maxZ + 0.25) {
                    return Math.max(1.1, distance - 0.45);
                }
            }
        }
        return maxDistance;
    }
}

/** Keyboard, mouse and touch input collected into one snapshot per frame. */
export class InputController {
    constructor(domElement) {
        this.dom = domElement;
        this.keys = new Set();
        this.mouseDelta = { x: 0, y: 0 };
        this.pointerLocked = false;
        this.touch = { active: false, x: 0, y: 0, id: null };
        this.lookTouch = { active: false, x: 0, y: 0, id: null };
        this.actionQueue = [];
        this.enabled = true;
        this.bind();
    }

    bind() {
        window.addEventListener("keydown", (event) => {
            if (!this.enabled) return;
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
                event.preventDefault();
            }
            if (event.repeat) return;
            this.keys.add(event.code);
            this.actionQueue.push(event.code);
        });
        window.addEventListener("keyup", (event) => this.keys.delete(event.code));
        window.addEventListener("blur", () => this.keys.clear());

        this.dom.addEventListener("click", () => {
            if (this.enabled && !this.pointerLocked && this.dom.requestPointerLock) {
                this.dom.requestPointerLock();
            }
        });
        document.addEventListener("pointerlockchange", () => {
            this.pointerLocked = document.pointerLockElement === this.dom;
        });
        window.addEventListener("mousemove", (event) => {
            if (this.pointerLocked) {
                this.mouseDelta.x += event.movementX;
                this.mouseDelta.y += event.movementY;
            }
        });
        window.addEventListener("wheel", (event) => {
            this.wheel = (this.wheel || 0) + Math.sign(event.deltaY);
        }, { passive: true });

        // Touch: left half drives movement, right half turns the camera.
        this.dom.addEventListener("touchstart", (event) => {
            for (const touch of event.changedTouches) {
                const left = touch.clientX < window.innerWidth * 0.5;
                if (left && !this.touch.active) {
                    this.touch = { active: true, id: touch.identifier, x: touch.clientX, y: touch.clientY, originX: touch.clientX, originY: touch.clientY };
                } else if (!left && !this.lookTouch.active) {
                    this.lookTouch = { active: true, id: touch.identifier, x: touch.clientX, y: touch.clientY };
                }
            }
        }, { passive: true });
        this.dom.addEventListener("touchmove", (event) => {
            for (const touch of event.changedTouches) {
                if (this.touch.active && touch.identifier === this.touch.id) {
                    this.touch.x = touch.clientX;
                    this.touch.y = touch.clientY;
                }
                if (this.lookTouch.active && touch.identifier === this.lookTouch.id) {
                    this.mouseDelta.x += (touch.clientX - this.lookTouch.x) * 1.6;
                    this.mouseDelta.y += (touch.clientY - this.lookTouch.y) * 1.6;
                    this.lookTouch.x = touch.clientX;
                    this.lookTouch.y = touch.clientY;
                }
            }
        }, { passive: true });
        const endTouch = (event) => {
            for (const touch of event.changedTouches) {
                if (touch.identifier === this.touch.id) this.touch = { active: false, id: null, x: 0, y: 0 };
                if (touch.identifier === this.lookTouch.id) this.lookTouch = { active: false, id: null, x: 0, y: 0 };
            }
        };
        this.dom.addEventListener("touchend", endTouch, { passive: true });
        this.dom.addEventListener("touchcancel", endTouch, { passive: true });
    }

    /** Returns queued key presses once, so actions never repeat-fire. */
    consumeActions() {
        const actions = this.actionQueue.slice();
        this.actionQueue.length = 0;
        return actions;
    }

    read() {
        let forward = 0;
        let right = 0;
        if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) forward += 1;
        if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) forward -= 1;
        if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) right += 1;
        if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) right -= 1;

        if (this.touch.active) {
            const dx = (this.touch.x - this.touch.originX) / 70;
            const dy = (this.touch.y - this.touch.originY) / 70;
            right += THREE.MathUtils.clamp(dx, -1, 1);
            forward -= THREE.MathUtils.clamp(dy, -1, 1);
        }

        const mouse = { x: this.mouseDelta.x, y: this.mouseDelta.y };
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        const wheel = this.wheel || 0;
        this.wheel = 0;

        return {
            forward: THREE.MathUtils.clamp(forward, -1, 1),
            right: THREE.MathUtils.clamp(right, -1, 1),
            sprint: this.keys.has("ShiftLeft") || this.keys.has("ShiftRight"),
            jump: this.keys.has("Space"),
            brake: this.keys.has("Space"),
            mouse,
            wheel,
            // Keyboard camera fallback keeps the game playable without pointer lock.
            cameraLeft: this.keys.has("KeyQ"),
            cameraRight: this.keys.has("KeyE")
        };
    }
}
