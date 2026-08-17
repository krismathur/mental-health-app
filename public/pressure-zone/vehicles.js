/**
 * Rideable vehicles: bicycle, skateboard and car.
 *
 * All three use a kinematic bicycle model, which gives a believable turning
 * circle that tightens at low speed and widens at high speed. Grip, drag and
 * acceleration differ per vehicle and per road surface, so a bike on grass
 * feels nothing like a car on wet asphalt.
 */
import * as THREE from "./vendor/three.module.js";
import { materials } from "./materials.js";
import { SURFACE, groundHeight, surfaceAt } from "./world-data.js";
import { mergeGeometries } from "./city-build.js";

const SURFACE_GRIP = {
    [SURFACE.ROAD]: 1,
    [SURFACE.SIDEWALK]: 0.94,
    [SURFACE.COURT]: 0.96,
    [SURFACE.GRASS]: 0.62,
    [SURFACE.DIRT]: 0.7,
    [SURFACE.INTERIOR]: 0.9
};

export const VEHICLE_SPECS = {
    bike: {
        kind: "bike",
        label: "BMX",
        topSpeed: 8.4,
        acceleration: 7.2,
        brake: 9,
        drag: 0.9,
        wheelBase: 1.02,
        maxSteer: 0.62,
        seatHeight: 0.92,
        grip: 1.15,
        engine: false
    },
    skateboard: {
        kind: "skateboard",
        label: "Skateboard",
        topSpeed: 6.6,
        acceleration: 5.4,
        brake: 6,
        drag: 0.55,
        wheelBase: 0.6,
        maxSteer: 0.5,
        seatHeight: 0.14,
        grip: 0.92,
        engine: false
    },
    car: {
        kind: "car",
        label: "Hatchback",
        topSpeed: 21,
        acceleration: 8.8,
        brake: 16,
        drag: 1.15,
        wheelBase: 2.5,
        maxSteer: 0.5,
        seatHeight: 0.62,
        grip: 1,
        engine: true
    }
};

/** Shared car body builder, also used for traffic. */
export function buildCarMesh(color = 0x8a2f28, { simple = false } = {}) {
    const group = new THREE.Group();
    const bodyParts = [];

    // Lower body and cabin, shaped so it is not a plain box.
    const lower = new THREE.BoxGeometry(1.78, 0.62, 4.2);
    lower.translate(0, 0.62, 0);
    bodyParts.push(lower);

    const bonnet = new THREE.BoxGeometry(1.7, 0.28, 1.35);
    bonnet.translate(0, 0.98, 1.45);
    bodyParts.push(bonnet);

    const cabin = new THREE.BoxGeometry(1.62, 0.62, 2.1);
    cabin.translate(0, 1.2, -0.28);
    bodyParts.push(cabin);

    const roof = new THREE.BoxGeometry(1.5, 0.1, 1.85);
    roof.translate(0, 1.52, -0.35);
    bodyParts.push(roof);

    const boot = new THREE.BoxGeometry(1.7, 0.3, 1);
    boot.translate(0, 1, -1.75);
    bodyParts.push(boot);

    const body = new THREE.Mesh(mergeGeometries(bodyParts), materials.carPaint(color));
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    if (!simple) {
        const glassParts = [];
        const windscreen = new THREE.BoxGeometry(1.5, 0.5, 0.08);
        windscreen.rotateX(-0.42);
        windscreen.translate(0, 1.28, 0.74);
        glassParts.push(windscreen);
        const rear = new THREE.BoxGeometry(1.46, 0.46, 0.08);
        rear.rotateX(0.5);
        rear.translate(0, 1.28, -1.32);
        glassParts.push(rear);
        for (const side of [-1, 1]) {
            const window = new THREE.BoxGeometry(0.06, 0.42, 1.7);
            window.translate(side * 0.82, 1.24, -0.3);
            glassParts.push(window);
        }
        const glass = new THREE.Mesh(mergeGeometries(glassParts), materials.carGlass());
        group.add(glass);

        const trim = [];
        trim.push(new THREE.BoxGeometry(1.84, 0.12, 0.4).translate(0, 0.72, 2.06));
        trim.push(new THREE.BoxGeometry(1.84, 0.12, 0.4).translate(0, 0.72, -2.06));
        for (const side of [-1, 1]) {
            trim.push(new THREE.BoxGeometry(0.06, 0.16, 1.4).translate(side * 0.9, 1.05, -0.3));
        }
        const chrome = new THREE.Mesh(mergeGeometries(trim), materials.chrome());
        chrome.castShadow = true;
        group.add(chrome);
    }

    // Lights
    const headlightMaterial = materials.emissive(0xfff3d6, 0.6);
    const tailMaterial = materials.emissive(0xd8321f, 0.5);
    const headlights = [];
    const tails = [];
    for (const side of [-1, 1]) {
        headlights.push(new THREE.BoxGeometry(0.42, 0.18, 0.06).translate(side * 0.6, 0.94, 2.12));
        tails.push(new THREE.BoxGeometry(0.36, 0.16, 0.06).translate(side * 0.62, 1.0, -2.12));
    }
    const headlightMesh = new THREE.Mesh(mergeGeometries(headlights), headlightMaterial);
    const tailMesh = new THREE.Mesh(mergeGeometries(tails), tailMaterial);
    group.add(headlightMesh, tailMesh);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14);
    wheelGeometry.rotateZ(Math.PI / 2);
    const wheels = [];
    for (const [x, z] of [[-0.84, 1.42], [0.84, 1.42], [-0.84, -1.42], [0.84, -1.42]]) {
        const wheel = new THREE.Mesh(wheelGeometry, materials.tyre());
        wheel.position.set(x, 0.34, z);
        wheel.castShadow = true;
        group.add(wheel);
        wheels.push(wheel);
        if (!simple) {
            const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.26, 10).rotateZ(Math.PI / 2), materials.chrome());
            hub.position.set(x, 0.34, z);
            group.add(hub);
        }
    }

    return { group, wheels, headlightMesh, tailMesh, headlightMaterial, tailMaterial };
}

function buildBikeMesh(color = 0x2f6b73) {
    const group = new THREE.Group();
    const frame = [];
    const tube = (x1, y1, z1, x2, y2, z2, radius = 0.028) => {
        const start = new THREE.Vector3(x1, y1, z1);
        const end = new THREE.Vector3(x2, y2, z2);
        const direction = new THREE.Vector3().subVectors(end, start);
        const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 7);
        geometry.translate(0, direction.length() / 2, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.clone().normalize()
        );
        geometry.applyQuaternion(quaternion);
        geometry.translate(start.x, start.y, start.z);
        return geometry;
    };

    frame.push(tube(0, 0.42, 0.52, 0, 0.72, -0.06));
    frame.push(tube(0, 0.72, -0.06, 0, 0.46, -0.44));
    frame.push(tube(0, 0.46, -0.44, 0, 0.3, -0.5));
    frame.push(tube(0, 0.3, -0.5, 0, 0.34, 0.5));
    frame.push(tube(0, 0.42, 0.52, 0, 0.34, 0.5));
    frame.push(tube(0, 0.72, -0.06, 0, 0.86, -0.06, 0.022));
    frame.push(tube(-0.22, 0.9, -0.06, 0.22, 0.9, -0.06, 0.02));
    const frameMesh = new THREE.Mesh(mergeGeometries(frame), materials.paintedMetal(color));
    frameMesh.castShadow = true;
    group.add(frameMesh);

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.24), materials.rubber(0x1c1e21));
    saddle.position.set(0, 0.88, -0.06);
    group.add(saddle);

    const wheels = [];
    for (const z of [0.52, -0.5]) {
        const wheel = new THREE.Group();
        const tyre = new THREE.Mesh(
            new THREE.TorusGeometry(0.33, 0.035, 8, 20).rotateY(Math.PI / 2),
            materials.tyre()
        );
        wheel.add(tyre);
        for (let spoke = 0; spoke < 6; spoke += 1) {
            const angle = (spoke / 6) * Math.PI;
            const bar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.006, 0.006, 0.64, 4).rotateZ(Math.PI / 2).rotateX(angle),
                materials.chrome()
            );
            bar.rotation.x = angle;
            bar.rotation.z = Math.PI / 2;
            wheel.add(bar);
        }
        wheel.position.set(0, 0.34, z);
        wheel.castShadow = true;
        group.add(wheel);
        wheels.push(wheel);
    }
    return { group, wheels };
}

function buildSkateboardMesh(color = 0xc44a35) {
    const group = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.82), materials.paintedMetal(color));
    deck.position.y = 0.14;
    deck.castShadow = true;
    group.add(deck);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.005, 0.8), materials.rubber(0x1a1c1f));
    grip.position.y = 0.158;
    group.add(grip);
    const wheels = [];
    for (const [x, z] of [[-0.1, 0.28], [0.1, 0.28], [-0.1, -0.28], [0.1, -0.28]]) {
        const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.055, 0.05, 10).rotateZ(Math.PI / 2),
            materials.rubber(0xd8d2c4)
        );
        wheel.position.set(x, 0.055, z);
        group.add(wheel);
        wheels.push(wheel);
    }
    for (const z of [0.28, -0.28]) {
        const truck = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.04, 0.06), materials.chrome());
        truck.position.set(0, 0.1, z);
        group.add(truck);
    }
    return { group, wheels };
}

export class Vehicle {
    constructor(scene, kind, position, { color, damaged = false } = {}) {
        this.spec = VEHICLE_SPECS[kind];
        this.kind = kind;
        this.scene = scene;
        this.position = new THREE.Vector3(position.x, groundHeight(position.x, position.z), position.z);
        this.heading = position.heading || 0;
        this.speed = 0;
        this.steer = 0;
        this.occupied = false;
        this.damaged = damaged;
        this.fuel = 1;
        this.wheelSpin = 0;
        this.suspension = 0;
        this.suspensionVelocity = 0;
        this.onSurfaceChange = null;
        this.surface = SURFACE.ROAD;

        let built;
        if (kind === "car") built = buildCarMesh(color ?? 0x2f4f6b);
        else if (kind === "bike") built = buildBikeMesh(color ?? 0x2f6b73);
        else built = buildSkateboardMesh(color ?? 0xc44a35);

        this.mesh = built.group;
        this.wheels = built.wheels || [];
        this.headlightMesh = built.headlightMesh || null;
        this.headlightMaterial = built.headlightMaterial || null;
        this.tailMaterial = built.tailMaterial || null;
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.heading;
        scene.add(this.mesh);

        if (kind === "car") {
            this.headlightBeams = [];
            for (const side of [-1, 1]) {
                const beam = new THREE.SpotLight(0xfff0d4, 0, 34, 0.52, 0.55, 1.4);
                beam.position.set(side * 0.6, 0.94, 2.1);
                beam.target.position.set(side * 0.6, 0.2, 14);
                this.mesh.add(beam, beam.target);
                this.headlightBeams.push(beam);
            }
        }
    }

    get isRideable() {
        return !this.damaged;
    }

    repair() {
        this.damaged = false;
    }

    getSeatPosition() {
        const forwardOffset = this.kind === "car" ? -0.3 : 0;
        const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
        return {
            position: new THREE.Vector3(
                this.position.x + forward.x * forwardOffset,
                this.position.y + (this.kind === "car" ? 0 : this.spec.seatHeight - 0.88),
                this.position.z + forward.z * forwardOffset
            ),
            rotation: this.heading
        };
    }

    setHeadlights(on) {
        const intensity = on ? 1 : 0;
        if (this.headlightMaterial) this.headlightMaterial.emissiveIntensity = on ? 2.4 : 0.35;
        if (this.headlightBeams) {
            for (const beam of this.headlightBeams) beam.intensity = intensity * 26;
        }
    }

    setBrakeLights(on) {
        if (this.tailMaterial) this.tailMaterial.emissiveIntensity = on ? 2.6 : 0.45;
    }

    update(dt, input, colliders) {
        const spec = this.spec;
        const surface = surfaceAt(this.position.x, this.position.z);
        if (surface !== this.surface) {
            this.surface = surface;
            if (this.onSurfaceChange) this.onSurfaceChange(surface);
        }
        const grip = (SURFACE_GRIP[surface] ?? 0.8) * spec.grip;

        if (this.occupied && input) {
            const throttle = input.forward;
            if (throttle > 0) {
                this.speed += spec.acceleration * throttle * dt * (0.55 + grip * 0.45);
            } else if (throttle < 0) {
                this.speed += (this.speed > 0 ? -spec.brake : spec.acceleration * 0.5) * dt * Math.abs(throttle);
            }
            if (input.brake) this.speed -= Math.sign(this.speed) * spec.brake * dt;

            const steerTarget = -input.right * spec.maxSteer;
            this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
            this.setBrakeLights(input.brake || throttle < -0.1);
        } else {
            this.steer *= Math.max(0, 1 - dt * 4);
            this.setBrakeLights(false);
        }

        // Drag and rolling resistance.
        this.speed -= this.speed * spec.drag * dt * (surface === SURFACE.GRASS ? 2.4 : 1);
        this.speed = THREE.MathUtils.clamp(this.speed, -spec.topSpeed * 0.32, spec.topSpeed * (surface === SURFACE.GRASS ? 0.55 : 1));
        if (Math.abs(this.speed) < 0.04) this.speed = 0;

        // Kinematic bicycle steering: angular velocity scales with speed.
        if (Math.abs(this.speed) > 0.05) {
            const angular = (this.speed / spec.wheelBase) * Math.tan(this.steer * grip);
            this.heading += angular * dt;
        }

        const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
        const nextX = this.position.x + forward.x * this.speed * dt;
        const nextZ = this.position.z + forward.z * this.speed * dt;

        if (!this.blocked(nextX, this.position.z, colliders)) this.position.x = nextX;
        else this.speed *= -0.25;
        if (!this.blocked(this.position.x, nextZ, colliders)) this.position.z = nextZ;
        else this.speed *= -0.25;

        // Suspension: a damped spring reacting to acceleration and kerbs.
        const targetY = groundHeight(this.position.x, this.position.z);
        const accelerationLoad = (this.speed - (this.previousSpeed || 0)) / Math.max(dt, 0.001);
        this.previousSpeed = this.speed;
        this.suspensionVelocity += (-this.suspension * 62 - this.suspensionVelocity * 9
            - THREE.MathUtils.clamp(accelerationLoad, -30, 30) * 0.012) * dt;
        this.suspension += this.suspensionVelocity * dt;
        this.suspension = THREE.MathUtils.clamp(this.suspension, -0.09, 0.09);

        this.position.y += (targetY - this.position.y) * Math.min(1, dt * 12);
        this.mesh.position.set(this.position.x, this.position.y + this.suspension, this.position.z);
        this.mesh.rotation.y = this.heading;
        // Body roll into corners and pitch under braking.
        this.mesh.rotation.z = -this.steer * Math.min(1, Math.abs(this.speed) / spec.topSpeed) * (this.kind === "car" ? 0.09 : 0.4);
        this.mesh.rotation.x = THREE.MathUtils.clamp(-accelerationLoad * 0.0016, -0.05, 0.05);

        this.wheelSpin += (this.speed / 0.34) * dt;
        for (const wheel of this.wheels) wheel.rotation.x = this.wheelSpin;

        if (this.kind === "car" && this.occupied) {
            this.fuel = Math.max(0, this.fuel - Math.abs(this.speed) * dt * 0.00035);
        }
    }

    blocked(x, z, colliders = []) {
        const radius = this.kind === "car" ? 1.1 : 0.5;
        for (const collider of colliders) {
            if (collider.tag === "tree" && this.kind !== "car") continue;
            if (x + radius > collider.minX && x - radius < collider.maxX
                && z + radius > collider.minZ && z - radius < collider.maxZ) {
                return true;
            }
        }
        return false;
    }

    distanceTo(point) {
        return Math.hypot(this.position.x - point.x, this.position.z - point.z);
    }

    dispose() {
        this.scene.remove(this.mesh);
    }
}
