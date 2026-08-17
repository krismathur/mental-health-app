/**
 * Ambient road traffic.
 *
 * Cars follow closed circuits with real steering rather than sliding along a
 * rail, keep a safe gap from the car ahead, slow into corners, stop for red
 * lights and switch their headlights on after dusk.
 */
import * as THREE from "./vendor/three.module.js";
import { TRAFFIC_ROUTES, ROADS, CITY } from "./world-data.js";
import { buildCarMesh } from "./vehicles.js";
import { materials } from "./materials.js";

const CAR_COLOURS = [
    0x9a9ea4, 0x2f3f52, 0x6b2f2a, 0x1f2226, 0x415c46,
    0xb4b8bc, 0x37485c, 0x74675a, 0x8c3f33, 0x2b3a3f
];

const HALF_ROAD = CITY.roadWidth / 2;

/** Alternating signal cycle shared by every junction. */
export class TrafficSignals {
    constructor() {
        this.time = 0;
        this.cycle = 24;
        this.greenAxis = "x";
    }

    update(dt) {
        this.time += dt;
        const phase = this.time % this.cycle;
        this.greenAxis = phase < this.cycle / 2 ? "x" : "z";
        this.amber = Math.abs(phase % (this.cycle / 2) - (this.cycle / 2 - 2)) < 0.9;
    }

    /** True when a car travelling along `axis` must stop at this junction. */
    mustStop(axis) {
        return this.greenAxis !== axis;
    }
}

class TrafficCar {
    constructor(scene, route, distance, colour) {
        this.route = route;
        this.distance = distance;
        this.speed = route.speed * (0.85 + Math.random() * 0.3);
        this.targetSpeed = this.speed;
        this.currentSpeed = this.speed;
        const built = buildCarMesh(colour, { simple: true });
        this.mesh = built.group;
        this.wheels = built.wheels;
        this.headlightMaterial = built.headlightMaterial;
        this.tailMaterial = built.tailMaterial;
        this.mesh.castShadow = true;
        scene.add(this.mesh);
        this.position = new THREE.Vector3();
        this.heading = 0;
        this.wheelSpin = 0;
    }
}

export class TrafficSystem {
    constructor(scene, signals) {
        this.scene = scene;
        this.signals = signals;
        this.cars = [];
        this.routeLengths = new Map();
        this.build();
    }

    build() {
        for (const route of TRAFFIC_ROUTES) {
            const segments = [];
            let total = 0;
            for (let index = 0; index < route.points.length; index += 1) {
                const from = route.points[index];
                const to = route.points[(index + 1) % route.points.length];
                const length = Math.hypot(to.x - from.x, to.z - from.z);
                segments.push({ from, to, length, start: total });
                total += length;
            }
            this.routeLengths.set(route.id, { segments, total });

            const count = Math.max(3, Math.round(total / 62));
            for (let index = 0; index < count; index += 1) {
                const colour = CAR_COLOURS[Math.floor(Math.random() * CAR_COLOURS.length)];
                this.cars.push(new TrafficCar(this.scene, route, (index / count) * total, colour));
            }
        }
    }

    /** Position and heading at a distance along a circuit, with rounded corners. */
    sample(route, distance) {
        const { segments, total } = this.routeLengths.get(route.id);
        let d = ((distance % total) + total) % total;
        for (const segment of segments) {
            if (d <= segment.start + segment.length) {
                const t = (d - segment.start) / segment.length;
                const x = segment.from.x + (segment.to.x - segment.from.x) * t;
                const z = segment.from.z + (segment.to.z - segment.from.z) * t;
                const heading = Math.atan2(segment.to.x - segment.from.x, segment.to.z - segment.from.z);
                const distanceToCorner = Math.min(d - segment.start, segment.start + segment.length - d);
                return { x, z, heading, cornerFactor: Math.min(1, distanceToCorner / 12) };
            }
        }
        const first = segments[0];
        return { x: first.from.x, z: first.from.z, heading: 0, cornerFactor: 1 };
    }

    /** Distance to the nearest junction ahead along the current heading. */
    junctionAhead(x, z, heading) {
        const axis = Math.abs(Math.sin(heading)) > 0.7 ? "x" : "z";
        const crossRoads = ROADS.filter((road) => (axis === "x" ? road.axis === "z" : road.axis === "x"));
        let best = Infinity;
        for (const road of crossRoads) {
            const delta = axis === "x"
                ? (road.at - x) * Math.sign(Math.sin(heading))
                : (road.at - z) * Math.sign(Math.cos(heading));
            if (delta > 0 && delta < best) best = delta;
        }
        return { distance: best, axis };
    }

    update(dt, nightFactor, playerPosition) {
        for (const car of this.cars) {
            const sample = this.sample(car.route, car.distance);

            // Slow for corners.
            let target = car.speed * (0.45 + sample.cornerFactor * 0.55);

            // Stop at red lights.
            const junction = this.junctionAhead(sample.x, sample.z, sample.heading);
            if (junction.distance < HALF_ROAD + 10 && junction.distance > 0) {
                if (this.signals.mustStop(junction.axis === "x" ? "x" : "z")) {
                    const stopDistance = Math.max(0, junction.distance - HALF_ROAD - 2.2);
                    target = Math.min(target, stopDistance * 0.75);
                }
            }

            // Keep a gap from the car in front on the same circuit.
            for (const other of this.cars) {
                if (other === car || other.route.id !== car.route.id) continue;
                const { total } = this.routeLengths.get(car.route.id);
                let gap = other.distance - car.distance;
                if (gap < 0) gap += total;
                if (gap > 0 && gap < 12) {
                    target = Math.min(target, Math.max(0, (gap - 6) * 1.6));
                }
            }

            const rate = target < car.currentSpeed ? 7 : 2.6;
            car.currentSpeed += (target - car.currentSpeed) * Math.min(1, dt * rate);
            car.distance += car.currentSpeed * dt;

            const next = this.sample(car.route, car.distance);
            car.position.set(next.x, 0, next.z);

            // Smooth the heading so corners look driven, not snapped.
            const delta = Math.atan2(
                Math.sin(next.heading - car.heading),
                Math.cos(next.heading - car.heading)
            );
            car.heading += delta * Math.min(1, dt * 6);

            car.mesh.position.set(next.x, 0, next.z);
            car.mesh.rotation.y = car.heading;
            car.mesh.rotation.z = -delta * 1.6;

            car.wheelSpin += (car.currentSpeed / 0.34) * dt;
            for (const wheel of car.wheels) wheel.rotation.x = car.wheelSpin;

            const braking = car.currentSpeed < car.speed * 0.55;
            if (car.tailMaterial) car.tailMaterial.emissiveIntensity = braking ? 2.4 : 0.4;
            if (car.headlightMaterial) car.headlightMaterial.emissiveIntensity = nightFactor > 0.35 ? 2.6 : 0.3;

            // Cull distant cars to keep the frame budget healthy.
            const distance = playerPosition
                ? Math.hypot(next.x - playerPosition.x, next.z - playerPosition.z)
                : 0;
            car.mesh.visible = distance < 165;
            car.mesh.castShadow = distance < 70;
        }
    }

    /** Nearest traffic car, used for near-miss reactions and audio. */
    nearest(position) {
        let best = null;
        let bestDistance = Infinity;
        for (const car of this.cars) {
            const distance = Math.hypot(car.position.x - position.x, car.position.z - position.z);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = car;
            }
        }
        return { car: best, distance: bestDistance };
    }
}

/** Parked cars add density without any simulation cost. */
export function buildParkedCars(scene, colliders) {
    const random = (() => {
        let state = 24680;
        return () => {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state / 4294967296;
        };
    })();

    for (const road of ROADS) {
        for (let along = road.from + 20; along < road.to - 20; along += 13 + random() * 16) {
            if (random() > 0.55) continue;
            const side = random() > 0.5 ? 1 : -1;
            const x = road.axis === "x" ? along : road.at + side * (HALF_ROAD - 2.1);
            const z = road.axis === "x" ? road.at + side * (HALF_ROAD - 2.1) : along;
            if (Math.abs(x) > 145 || Math.abs(z) > 115) continue;
            // Keep junctions clear.
            const nearJunction = ROADS.some((other) => {
                if (other === road) return false;
                return other.axis === "x"
                    ? Math.abs(z - other.at) < HALF_ROAD + 7
                    : Math.abs(x - other.at) < HALF_ROAD + 7;
            });
            if (nearJunction) continue;

            const colour = CAR_COLOURS[Math.floor(random() * CAR_COLOURS.length)];
            const { group } = buildCarMesh(colour, { simple: true });
            group.position.set(x, 0, z);
            group.rotation.y = road.axis === "x" ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? Math.PI : 0);
            group.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            scene.add(group);
            colliders.push({
                minX: x - 1.1,
                maxX: x + 1.1,
                minZ: z - 2.2,
                maxZ: z + 2.2,
                height: 1.5,
                tag: "prop"
            });
        }
    }
    void materials;
}
