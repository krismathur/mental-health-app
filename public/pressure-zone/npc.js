/**
 * Pedestrian life and the recurring friend characters.
 *
 * Background pedestrians follow sidewalk circuits on daily schedules: more
 * people at midday, fewer late at night, and they head for cover when it
 * rains. Only the nearest few run the full animated rig; the rest fall back
 * to a cheaper pose update.
 */
import * as THREE from "./vendor/three.module.js";
import { createCharacter, lookAt, setDribble } from "./character.js";
import { PED_ROUTES, POIS, groundHeight } from "./world-data.js";

const PEDESTRIAN_LOOKS = [
    { skin: "light", hair: "short", hairColor: "brown", outfit: "classic", jacket: "none", backpack: "none" },
    { skin: "deep", hair: "curls", hairColor: "black", outfit: "street", jacket: "windbreaker", backpack: "day" },
    { skin: "tan", hair: "ponytail", hairColor: "darkbrown", outfit: "trail", jacket: "none", backpack: "roll" },
    { skin: "olive", hair: "buzz", hairColor: "black", outfit: "night", jacket: "hoodie", backpack: "none" },
    { skin: "brown", hair: "braids", hairColor: "black", outfit: "court", jacket: "none", backpack: "sport" },
    { skin: "porcelain", hair: "wavy", hairColor: "blonde", outfit: "classic", jacket: "varsity", backpack: "none" },
    { skin: "light", hair: "curls", hairColor: "auburn", outfit: "street", jacket: "none", backpack: "day" },
    { skin: "tan", hair: "short", hairColor: "ash", outfit: "trail", jacket: "hoodie", backpack: "none" }
];

/** The three friends the story revolves around. */
export const FRIENDS = Object.freeze([
    {
        id: "mara",
        name: "Mara",
        trait: "Competitive",
        summary: "Point guard. Pushes the pace, hates losing, first to call for the ball.",
        look: {
            name: "Mara", skin: "brown", hair: "braids", hairColor: "black",
            outfit: "court", jacket: "none", backpack: "sport", height: 1.02
        },
        home: { x: -95.5, z: -17 }
    },
    {
        id: "dev",
        name: "Dev",
        trait: "Quiet",
        summary: "Best shooter on the team when his head is right. Overthinks the big moments.",
        look: {
            name: "Dev", skin: "olive", hair: "short", hairColor: "darkbrown",
            outfit: "street", jacket: "hoodie", backpack: "day", height: 1.0
        },
        home: { x: 40, z: 30 }
    },
    {
        id: "nia",
        name: "Nia",
        trait: "Creative",
        summary: "Skates, films everything, always knows a shortcut you have never taken.",
        look: {
            name: "Nia", skin: "light", hair: "wavy", hairColor: "auburn",
            outfit: "night", jacket: "windbreaker", backpack: "roll", height: 0.98
        },
        home: { x: -40, z: 20 }
    }
]);

class Pedestrian {
    constructor(scene, route, offset, look, detail) {
        this.route = route;
        this.progress = offset;
        this.speed = 1.05 + Math.random() * 0.55;
        this.baseSpeed = this.speed;
        this.rig = createCharacter(look, detail);
        this.object = this.rig.root;
        this.detail = detail;
        this.lane = (Math.random() - 0.5) * 2.1;
        this.pauseTimer = 0;
        this.state = "walk";
        scene.add(this.object);
        this.place();
    }

    routeLength() {
        let total = 0;
        for (let index = 0; index < this.route.length; index += 1) {
            const from = this.route[index];
            const to = this.route[(index + 1) % this.route.length];
            total += Math.hypot(to.x - from.x, to.z - from.z);
        }
        return total;
    }

    sample(distance) {
        let remaining = distance;
        for (let index = 0; index < this.route.length; index += 1) {
            const from = this.route[index];
            const to = this.route[(index + 1) % this.route.length];
            const length = Math.hypot(to.x - from.x, to.z - from.z);
            if (remaining <= length) {
                const t = remaining / length;
                const heading = Math.atan2(to.x - from.x, to.z - from.z);
                const normalX = Math.cos(heading);
                const normalZ = -Math.sin(heading);
                return {
                    x: from.x + (to.x - from.x) * t + normalX * this.lane,
                    z: from.z + (to.z - from.z) * t + normalZ * this.lane,
                    heading
                };
            }
            remaining -= length;
        }
        return { x: this.route[0].x, z: this.route[0].z, heading: 0 };
    }

    place() {
        const point = this.sample(this.progress % this.routeLength());
        this.object.position.set(point.x, groundHeight(point.x, point.z), point.z);
        this.object.rotation.y = point.heading;
    }

    update(dt, context) {
        const total = this.routeLength();

        if (this.pauseTimer > 0) {
            this.pauseTimer -= dt;
            this.rig.update(dt, { speed: 0, mode: "idle" });
            return;
        }

        // Rain makes people hurry; night thins the crowd and slows it down.
        const hurry = context.wetness > 0.4 ? 1.55 : 1;
        const target = this.baseSpeed * hurry * (context.nightFactor > 0.6 ? 0.88 : 1);
        this.speed += (target - this.speed) * Math.min(1, dt * 2);

        this.progress = (this.progress + this.speed * dt) % total;
        const point = this.sample(this.progress);
        const previous = this.object.position.clone();
        this.object.position.set(point.x, groundHeight(point.x, point.z), point.z);

        const delta = Math.atan2(
            Math.sin(point.heading - this.object.rotation.y),
            Math.cos(point.heading - this.object.rotation.y)
        );
        this.object.rotation.y += delta * Math.min(1, dt * 5);

        const travelled = this.object.position.distanceTo(previous) / Math.max(dt, 0.0001);

        // Occasionally stop to look at something, which breaks up the parade.
        if (Math.random() < dt * 0.035) this.pauseTimer = 1.5 + Math.random() * 3;

        // Glance at the player when they pass close by.
        if (context.playerPosition) {
            const distance = this.object.position.distanceTo(context.playerPosition);
            if (distance < 7) {
                lookAt(this.rig, context.playerPosition, this.object.position, this.object.rotation.y);
            } else {
                this.rig.state.headYaw *= 0.9;
            }
        }

        this.rig.update(dt, { speed: Math.min(travelled, 6), mode: "walk" });
    }
}

export class CrowdSystem {
    constructor(scene) {
        this.scene = scene;
        this.pedestrians = [];
        this.maxAnimated = 14;
        this.build();
    }

    build() {
        let index = 0;
        for (const route of PED_ROUTES) {
            const density = route.length > 2 ? 3 : 2;
            for (let person = 0; person < density; person += 1) {
                const look = PEDESTRIAN_LOOKS[index % PEDESTRIAN_LOOKS.length];
                const detail = index < 8 ? "full" : "simple";
                const offset = (person / density) * 120 + Math.random() * 18;
                this.pedestrians.push(new Pedestrian(this.scene, route, offset, {
                    ...look,
                    height: 1.0 + Math.random() * 0.12
                }, detail));
                index += 1;
            }
        }
    }

    update(dt, context) {
        // Fewer people out very late, and fewer in a storm.
        const hour = context.hour ?? 12;
        let activity = 1;
        if (hour < 6.5) activity = 0.18;
        else if (hour < 8) activity = 0.5;
        else if (hour > 22) activity = 0.25;
        else if (hour > 20) activity = 0.6;
        if (context.wetness > 0.6) activity *= 0.55;

        const visibleCount = Math.round(this.pedestrians.length * activity);
        this.pedestrians.forEach((pedestrian, index) => {
            const active = index < visibleCount;
            pedestrian.object.visible = active;
            if (!active) return;
            const distance = context.playerPosition
                ? pedestrian.object.position.distanceTo(context.playerPosition)
                : 0;
            if (distance > 95) {
                pedestrian.object.visible = false;
                return;
            }
            // Animate at full rate nearby, at a reduced rate further out.
            if (distance < 45 || index % 2 === 0) pedestrian.update(dt, context);
            else pedestrian.update(dt * 0.5, context);
        });
    }
}

/** A friend the player can walk up to and talk with. */
export class FriendCharacter {
    constructor(scene, definition) {
        this.definition = definition;
        this.id = definition.id;
        this.name = definition.name;
        this.rig = createCharacter(definition.look, "full");
        this.object = this.rig.root;
        this.object.position.set(definition.home.x, groundHeight(definition.home.x, definition.home.z), definition.home.z);
        this.target = null;
        this.speed = 0;
        this.state = "idle";
        this.dribbling = false;
        scene.add(this.object);
        this.scene = scene;
    }

    get position() {
        return this.object.position;
    }

    moveTo(x, z, { speed = 2.6, onArrive = null } = {}) {
        this.target = { x, z, speed, onArrive };
        this.state = "walk";
    }

    setDribbling(active) {
        this.dribbling = active;
        setDribble(this.rig, active);
    }

    faceToward(point) {
        const angle = Math.atan2(point.x - this.object.position.x, point.z - this.object.position.z);
        this.desiredFacing = angle;
    }

    update(dt, playerPosition) {
        let speed = 0;
        if (this.target) {
            const dx = this.target.x - this.object.position.x;
            const dz = this.target.z - this.object.position.z;
            const distance = Math.hypot(dx, dz);
            if (distance < 0.6) {
                const arrive = this.target.onArrive;
                this.target = null;
                this.state = "idle";
                if (arrive) arrive();
            } else {
                speed = Math.min(this.target.speed, distance * 2.4);
                const step = speed * dt;
                this.object.position.x += (dx / distance) * step;
                this.object.position.z += (dz / distance) * step;
                this.object.position.y = groundHeight(this.object.position.x, this.object.position.z);
                this.desiredFacing = Math.atan2(dx, dz);
            }
        }

        if (this.desiredFacing !== undefined) {
            const delta = Math.atan2(
                Math.sin(this.desiredFacing - this.object.rotation.y),
                Math.cos(this.desiredFacing - this.object.rotation.y)
            );
            this.object.rotation.y += delta * Math.min(1, dt * 6);
        }

        if (playerPosition) {
            const distance = this.object.position.distanceTo(playerPosition);
            if (distance < 9) {
                lookAt(this.rig, playerPosition, this.object.position, this.object.rotation.y);
                if (!this.target) this.faceToward(playerPosition);
            } else {
                this.rig.state.headYaw *= 0.92;
            }
        }

        this.rig.update(dt, { speed, mode: speed > 0.1 ? "walk" : "idle" });
    }

    distanceTo(point) {
        return Math.hypot(this.object.position.x - point.x, this.object.position.z - point.z);
    }
}

/** Spectators around the court during the tournament. */
export class CourtCrowd {
    constructor(scene) {
        this.scene = scene;
        this.members = [];
        this.group = new THREE.Group();
        this.group.visible = false;
        scene.add(this.group);
        this.excitement = 0;
        this.built = false;
    }

    build() {
        const court = POIS.court;
        let index = 0;
        for (let tier = 0; tier < 4; tier += 1) {
            for (let seat = 0; seat < 9; seat += 1) {
                if (Math.random() > 0.82) continue;
                const look = PEDESTRIAN_LOOKS[index % PEDESTRIAN_LOOKS.length];
                const rig = createCharacter({ ...look, height: 0.96 + Math.random() * 0.12 }, "simple");
                const x = court.x - 7.6 + seat * 1.75 + (Math.random() - 0.5) * 0.4;
                const z = court.z + 11.2 + tier * 0.9;
                rig.root.position.set(x, 0.5 + tier * 0.45, z);
                rig.root.rotation.y = Math.PI;
                rig.state.mode = "sit";
                this.group.add(rig.root);
                this.members.push({ rig, phase: Math.random() * 6.28, base: rig.root.position.y });
                index += 1;
            }
        }
        // Standing spectators along the fence. Clustered in loose knots and turned
        // towards the play, because an evenly spaced row facing forward reads as
        // a row of cones rather than a crowd.
        let placed = 0;
        for (let cluster = 0; cluster < 4 && placed < 11; cluster += 1) {
            const centre = court.x - 13 + cluster * 8.5 + (Math.random() - 0.5) * 3;
            const size = 2 + Math.floor(Math.random() * 2);
            for (let member = 0; member < size && placed < 11; member += 1) {
                const look = PEDESTRIAN_LOOKS[(placed + 3) % PEDESTRIAN_LOOKS.length];
                const rig = createCharacter({ ...look, height: 1 + Math.random() * 0.12 }, "simple");
                const x = centre + (member - (size - 1) / 2) * (0.8 + Math.random() * 0.5);
                const z = court.z - 10.6 + (Math.random() - 0.5) * 1.3;
                rig.root.position.set(x, groundHeight(x, z), z);
                rig.root.rotation.y = Math.atan2(court.x - x, court.z - z) + (Math.random() - 0.5) * 0.5;
                this.group.add(rig.root);
                this.members.push({
                    rig, phase: Math.random() * 6.28, base: rig.root.position.y, standing: true
                });
                placed += 1;
            }
        }
    }

    setVisible(visible) {
        if (visible && !this.built) {
            this.build();
            this.built = true;
        }
        this.group.visible = visible;
    }

    react(amount) {
        this.excitement = Math.min(1.4, this.excitement + amount);
    }

    update(dt) {
        if (!this.group.visible) return;
        this.excitement = Math.max(0, this.excitement - dt * 0.55);
        for (const member of this.members) {
            member.phase += dt * (2.2 + this.excitement * 5);
            const bounce = Math.abs(Math.sin(member.phase)) * (0.02 + this.excitement * 0.14);
            member.rig.root.position.y = member.base + bounce;
            if (this.excitement > 0.5 && member.standing) {
                member.rig.state.armOverride = (arm) => {
                    arm.upper.rotation.x = -2.4 + Math.sin(member.phase * 2) * 0.3;
                    arm.elbow.rotation.x = -0.4;
                };
            } else {
                member.rig.state.armOverride = null;
            }
            member.rig.update(dt, { speed: 0, mode: member.standing ? "idle" : "sit" });
        }
    }
}
