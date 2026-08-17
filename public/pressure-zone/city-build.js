/**
 * Procedural city geometry.
 *
 * Static surfaces are merged into a handful of draw calls per material, and
 * repeated detail (windows, trees, kerbs, railings) uses instancing. The
 * builder also returns the collider list and the street lamp positions the
 * rest of the game needs.
 */
import * as THREE from "./vendor/three.module.js";
import { materials } from "./materials.js";
import {
    BUILDINGS, CITY, COURT, COURT_RECT, PARK_BLOCK, POIS, POND, ROADS, SPORTS_BLOCK, createRandom
} from "./world-data.js";

const HALF_ROAD = CITY.roadWidth / 2;
const WALK = CITY.sidewalkWidth;
const CURB = CITY.curbHeight;

/** Minimal geometry merge so we do not need the examples/jsm utilities. */
function mergeGeometries(geometries) {
    let vertexCount = 0;
    let indexCount = 0;
    for (const geometry of geometries) {
        vertexCount += geometry.attributes.position.count;
        indexCount += geometry.index ? geometry.index.count : geometry.attributes.position.count;
    }
    const position = new Float32Array(vertexCount * 3);
    const normal = new Float32Array(vertexCount * 3);
    const uv = new Float32Array(vertexCount * 2);
    const index = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);

    let vertexOffset = 0;
    let indexOffset = 0;
    for (const geometry of geometries) {
        const count = geometry.attributes.position.count;
        position.set(geometry.attributes.position.array, vertexOffset * 3);
        if (geometry.attributes.normal) normal.set(geometry.attributes.normal.array, vertexOffset * 3);
        if (geometry.attributes.uv) uv.set(geometry.attributes.uv.array, vertexOffset * 2);
        if (geometry.index) {
            const source = geometry.index.array;
            for (let i = 0; i < source.length; i += 1) index[indexOffset + i] = source[i] + vertexOffset;
            indexOffset += source.length;
        } else {
            for (let i = 0; i < count; i += 1) index[indexOffset + i] = i + vertexOffset;
            indexOffset += count;
        }
        vertexOffset += count;
        geometry.dispose();
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.BufferAttribute(position, 3));
    merged.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
    merged.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    merged.setIndex(new THREE.BufferAttribute(index, 1));
    merged.computeBoundingSphere();
    return merged;
}

/** Box helper that bakes a transform straight into the geometry. */
function box(width, height, depth, x, y, z, rotationY = 0) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    if (rotationY) geometry.rotateY(rotationY);
    geometry.translate(x, y, z);
    return geometry;
}

function plane(width, depth, x, y, z) {
    const geometry = new THREE.PlaneGeometry(width, depth);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(x, y, z);
    return geometry;
}

/** Scales UVs so a merged surface tiles by world size rather than per face. */
function scaleUv(geometry, scaleX, scaleY) {
    const uv = geometry.attributes.uv;
    for (let index = 0; index < uv.count; index += 1) {
        uv.setXY(index, uv.getX(index) * scaleX, uv.getY(index) * scaleY);
    }
    return geometry;
}

export class CityBuilder {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.lamps = [];
        this.interiorLights = [];
        this.random = createRandom(90210);
        this.root = new THREE.Group();
        this.root.name = "city";
        scene.add(this.root);
    }

    /** Registers an axis-aligned collision box in world space. */
    addCollider(x, z, width, depth, height = 12, tag = "solid") {
        this.colliders.push({
            minX: x - width / 2,
            maxX: x + width / 2,
            minZ: z - depth / 2,
            maxZ: z + depth / 2,
            height,
            tag
        });
    }

    add(geometries, material, { castShadow = true, receiveShadow = true, name = "" } = {}) {
        if (!geometries.length) return null;
        const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
        mesh.name = name;
        this.root.add(mesh);
        return mesh;
    }

    build() {
        for (const [, action] of this.phases()) action();
        return this.result();
    }

    /** Named chunks so the loader can yield between them and keep the bar moving. */
    phases() {
        return [
            ["Laying the ground", () => this.buildTerrain()],
            ["Paving the streets", () => { this.buildRoads(); this.buildSidewalks(); }],
            ["Raising the skyline", (onProgress) => this.buildBuildings(onProgress)],
            ["Planting the park", () => this.buildPark()],
            ["Building Fulton Court", () => this.buildCourt()],
            ["Furnishing the streets", () => this.buildStreetFurniture()],
            ["Opening your house", () => { this.buildPlayerHome(); this.buildIndustrialDetail(); }]
        ];
    }

    result() {
        return {
            colliders: this.colliders,
            lamps: this.lamps,
            floodlights: this.floodlights,
            interiorLights: this.interiorLights,
            root: this.root
        };
    }

    buildTerrain() {
        // Ground beyond the district, so the horizon is never empty.
        const ground = new THREE.Mesh(
            plane(1600, 1600, 0, -0.05, 0),
            materials.dirt()
        );
        ground.receiveShadow = true;
        this.root.add(ground);

        // Distant skyline silhouettes give the city depth without cost.
        const skyline = [];
        const random = createRandom(4242);
        for (let index = 0; index < 36; index += 1) {
            const angle = (index / 36) * Math.PI * 2;
            const distance = 330 + random() * 260;
            const width = 22 + random() * 40;
            const height = 24 + random() * 96;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            if (Math.abs(x) < 190 && Math.abs(z) < 170) continue;
            skyline.push(box(width, height, width * 0.8, x, height / 2, z, random() * Math.PI));
        }
        this.add(skyline, materials.concreteWall(0x7f858d), { castShadow: false, name: "skyline" });
    }

    buildRoads() {
        const surfaces = [];
        const markings = [];
        for (const road of ROADS) {
            if (road.axis === "x") {
                const length = road.to - road.from;
                surfaces.push(scaleUv(
                    plane(length, CITY.roadWidth, (road.from + road.to) / 2, 0, road.at),
                    length / 8,
                    CITY.roadWidth / 8
                ));
                // Dashed centre line.
                for (let x = road.from + 2; x < road.to; x += 14) {
                    markings.push(plane(4, 0.16, x + 2, 0.012, road.at));
                }
                // Solid edge lines.
                markings.push(plane(length, 0.12, (road.from + road.to) / 2, 0.012, road.at - HALF_ROAD + 0.9));
                markings.push(plane(length, 0.12, (road.from + road.to) / 2, 0.012, road.at + HALF_ROAD - 0.9));
            } else {
                const length = road.to - road.from;
                surfaces.push(scaleUv(
                    plane(CITY.roadWidth, length, road.at, 0, (road.from + road.to) / 2),
                    CITY.roadWidth / 8,
                    length / 8
                ));
                for (let z = road.from + 2; z < road.to; z += 14) {
                    markings.push(plane(0.16, 4, road.at, 0.012, z + 2));
                }
                markings.push(plane(0.12, length, road.at - HALF_ROAD + 0.9, 0.012, (road.from + road.to) / 2));
                markings.push(plane(0.12, length, road.at + HALF_ROAD - 0.9, 0.012, (road.from + road.to) / 2));
            }
        }
        this.add(surfaces, materials.asphalt(), { castShadow: false, name: "roads" });
        this.add(markings, materials.courtLine(), { castShadow: false, name: "road-markings" });

        // Crossings at every intersection.
        const crossings = [];
        for (const horizontal of ROADS.filter((road) => road.axis === "x")) {
            for (const vertical of ROADS.filter((road) => road.axis === "z")) {
                for (const offset of [-1, 1]) {
                    for (let stripe = 0; stripe < 7; stripe += 1) {
                        const step = -HALF_ROAD + 1.4 + stripe * 1.9;
                        crossings.push(plane(
                            1,
                            2.6,
                            vertical.at + step,
                            0.014,
                            horizontal.at + offset * (HALF_ROAD - 1.8)
                        ));
                        crossings.push(plane(
                            2.6,
                            1,
                            vertical.at + offset * (HALF_ROAD - 1.8),
                            0.014,
                            horizontal.at + step
                        ));
                    }
                }
            }
        }
        this.add(crossings, materials.courtLine(), { castShadow: false, name: "crossings" });
    }

    buildSidewalks() {
        const slabs = [];
        const kerbs = [];
        const outer = HALF_ROAD + WALK;
        for (const road of ROADS) {
            if (road.axis === "x") {
                const length = road.to - road.from;
                const centreX = (road.from + road.to) / 2;
                for (const side of [-1, 1]) {
                    const z = road.at + side * (HALF_ROAD + WALK / 2);
                    slabs.push(scaleUv(box(length, CURB, WALK, centreX, CURB / 2, z), length / 6, WALK / 6));
                    kerbs.push(box(length, CURB + 0.03, 0.22, centreX, (CURB + 0.03) / 2, road.at + side * HALF_ROAD));
                }
            } else {
                const length = road.to - road.from;
                const centreZ = (road.from + road.to) / 2;
                for (const side of [-1, 1]) {
                    const x = road.at + side * (HALF_ROAD + WALK / 2);
                    slabs.push(scaleUv(box(WALK, CURB, length, x, CURB / 2, centreZ), WALK / 6, length / 6));
                    kerbs.push(box(0.22, CURB + 0.03, length, road.at + side * HALF_ROAD, (CURB + 0.03) / 2, centreZ));
                }
                // Corner infill so junctions are not notched.
                for (const horizontal of ROADS.filter((r) => r.axis === "x")) {
                    for (const cornerX of [-1, 1]) {
                        for (const cornerZ of [-1, 1]) {
                            slabs.push(box(
                                WALK, CURB, WALK,
                                road.at + cornerX * (HALF_ROAD + WALK / 2),
                                CURB / 2,
                                horizontal.at + cornerZ * (HALF_ROAD + WALK / 2)
                            ));
                        }
                    }
                }
            }
        }
        this.add(slabs, materials.sidewalk(), { castShadow: false, name: "sidewalks" });
        this.add(kerbs, materials.curb(), { name: "kerbs" });
        void outer;
    }

    async buildBuildings(onProgress) {
        const walls = new Map();
        const trims = [];
        const roofs = [];
        const storefronts = [];
        const awnings = [];
        const glassPanels = [];
        const litPanels = [];
        const houseRoofs = [];

        for (let index = 0; index < BUILDINGS.length; index += 1) {
            const building = BUILDINGS[index];
            this.buildOneBuilding(building, walls, houseRoofs, trims, glassPanels, litPanels, roofs, storefronts, awnings);
            if (onProgress && index % 3 === 2) {
                onProgress((index + 1) / BUILDINGS.length);
                await new Promise((resolve) => requestAnimationFrame(resolve));
            }
        }

        for (const [color, geometries] of walls) {
            const material = color === 0xa8735a || color === 0x9c8f7e
                ? materials.brick(color)
                : materials.concreteWall(color);
            this.add(geometries, material, { name: `walls-${color}` });
        }
        this.add(trims, materials.concreteWall(0x6d7076), { name: "trims" });
        this.add(roofs, materials.roofGravel(), { name: "roofs" });
        this.add(houseRoofs, materials.shingle(0x6a6f76), { name: "house-roofs" });
        this.add(storefronts, materials.concreteWall(0x3b3f45), { name: "storefronts" });
        this.add(awnings, materials.fabric(0x8a4238), { name: "awnings" });
        this.add(glassPanels, materials.glass(), { castShadow: false, name: "glass" });
        this.add(litPanels, materials.litWindow(), { castShadow: false, receiveShadow: false, name: "lit-windows" });
    }

    buildOneBuilding(building, walls, houseRoofs, trims, glassPanels, litPanels, roofs, storefronts, awnings) {
        const { x, z, w, d, height, kind } = building;
        if (!building.playerHome) this.addCollider(x, z, w, d, height, "building");

        const paletteKey = building.palette.wall;
        if (!walls.has(paletteKey)) walls.set(paletteKey, []);
        const wallList = walls.get(paletteKey);

        if (kind === "house") {
            this.buildHouse(building, wallList, houseRoofs, trims, glassPanels, litPanels, building.playerHome);
            return;
        }

        const groundFloor = building.storefront ? 4.2 : building.floorHeight;
        const bodyHeight = height;
        wallList.push(scaleUv(box(w, bodyHeight, d, x, bodyHeight / 2, z), w / 4, bodyHeight / 4));

        for (let floor = 1; floor < building.floors; floor += 1) {
            const y = groundFloor + (floor - 1) * building.floorHeight;
            if (y > bodyHeight - 0.6) break;
            trims.push(box(w + 0.34, 0.3, d + 0.34, x, y, z));
        }

        trims.push(box(w + 0.5, 0.9, d + 0.5, x, bodyHeight + 0.45, z));
        roofs.push(plane(w, d, x, bodyHeight + 0.05, z));
        this.buildRoofDetail(building, trims, roofs);

        const columns = Math.max(2, Math.floor(w / 4.2));
        const rows = building.floors - (building.storefront ? 1 : 0);
        for (let row = 0; row < rows; row += 1) {
            const y = groundFloor + row * building.floorHeight + building.floorHeight * 0.45;
            if (y > bodyHeight - 1) break;
            for (let column = 0; column < columns; column += 1) {
                const t = (column + 0.5) / columns - 0.5;
                const lit = this.random() > 0.7;
                // Street faces only. Side walls sit against the next lot, so
                // skipping them cuts window work in half without a visible hole.
                for (const [dx, dz, rotation] of [
                    [t * w, -d / 2 - 0.06, 0],
                    [t * w, d / 2 + 0.06, Math.PI]
                ]) {
                    const paneWidth = w / columns * 0.62;
                    const pane = new THREE.PlaneGeometry(paneWidth, building.floorHeight * 0.56);
                    pane.rotateY(rotation);
                    pane.translate(x + dx, y, z + dz);
                    glassPanels.push(pane);
                    if (lit) {
                        const glow = new THREE.PlaneGeometry(paneWidth * 0.94, building.floorHeight * 0.52);
                        glow.rotateY(rotation);
                        glow.translate(
                            x + dx + Math.sin(rotation) * 0.03,
                            y,
                            z + dz + Math.cos(rotation) * (rotation === 0 ? -0.03 : 0.03)
                        );
                        litPanels.push(glow);
                    }
                }
            }
        }

        if (building.storefront) {
            this.buildStorefront(building, storefronts, awnings, glassPanels);
        }
    }

    buildHouse(building, walls, roofs, trims, glass, lit, hollow = false) {
        const { x, z, w, d, height, facing } = building;
        if (!hollow) {
            walls.push(scaleUv(box(w, height, d, x, height / 2, z), w / 3, height / 3));
        }

        // Gable roof from two slabs plus end caps.
        const overhang = 0.55;
        const pitch = 2.3;
        const slope = Math.atan2(pitch, d / 2);
        for (const side of [-1, 1]) {
            const slab = new THREE.BoxGeometry(w + overhang * 2, 0.24, Math.hypot(d / 2 + overhang, pitch));
            slab.rotateX(side * slope);
            slab.translate(x, height + pitch / 2, z + side * (d / 4 + overhang / 2));
            roofs.push(slab);
        }
        for (const side of [-1, 1]) {
            const gable = new THREE.BufferGeometry();
            const halfWidth = w / 2;
            const vertices = new Float32Array([
                x - halfWidth, height, z + side * d / 2,
                x + halfWidth, height, z + side * d / 2,
                x, height + pitch, z + side * d / 2
            ]);
            gable.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
            gable.setAttribute("normal", new THREE.BufferAttribute(new Float32Array([
                0, 0, side, 0, 0, side, 0, 0, side
            ]), 3));
            gable.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0.5, 1]), 2));
            walls.push(gable);
        }

        // Porch, door and windows on the street-facing side.
        const front = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing)).multiplyScalar(-1);
        const doorX = x + front.x * (w / 2 + 0.08);
        const doorZ = z + front.z * (d / 2 + 0.08);
        if (!hollow) trims.push(box(1.1, 2.2, 0.12, doorX, 1.1, doorZ, facing));
        trims.push(box(w * 0.8, 0.18, 1.6, x + front.x * (w / 2 + 0.7), 2.5, z + front.z * (d / 2 + 0.7), facing));

        const windowCount = hollow ? 0 : building.floors === 2 ? 4 : 2;
        for (let index = 0; index < windowCount; index += 1) {
            const floor = Math.floor(index / 2);
            const side = index % 2 === 0 ? -1 : 1;
            const y = 1.5 + floor * 3.1;
            const offsetX = front.z * side * (w * 0.26);
            const offsetZ = front.x * side * (d * 0.26);
            const pane = new THREE.PlaneGeometry(1.25, 1.35);
            pane.rotateY(facing + Math.PI);
            pane.translate(doorX + offsetX, y, doorZ + offsetZ);
            glass.push(pane);
            if (this.random() > 0.45) {
                const glow = new THREE.PlaneGeometry(1.15, 1.25);
                glow.rotateY(facing + Math.PI);
                glow.translate(doorX + offsetX + front.x * 0.03, y, doorZ + offsetZ + front.z * 0.03);
                lit.push(glow);
            }
        }

        if (building.garage) {
            const driveX = x + front.x * (w / 2 + 3.4);
            const driveZ = z + front.z * (d / 2 + 3.4);
            trims.push(box(5.4, 0.06, 6.4, driveX, 0.17, driveZ, facing));
        }
    }

    buildRoofDetail(building, trims, roofs) {
        const { x, z, w, d, height } = building;
        if (building.roofStyle === "mechanical") {
            for (let unit = 0; unit < 2; unit += 1) {
                const ux = x + (this.random() - 0.5) * (w - 4);
                const uz = z + (this.random() - 0.5) * (d - 4);
                trims.push(box(2.6, 1.3, 2, ux, height + 0.65, uz));
                trims.push(box(2.2, 0.14, 1.7, ux, height + 1.35, uz));
            }
        } else if (building.roofStyle === "tank") {
            const radius = 1.5;
            const tank = new THREE.CylinderGeometry(radius, radius, 3, 12);
            tank.translate(x + w * 0.2, height + 2.6, z - d * 0.2);
            roofs.push(tank);
            for (const leg of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
                trims.push(box(0.16, 1.4, 0.16, x + w * 0.2 + leg[0] * 1, height + 0.7, z - d * 0.2 + leg[1] * 1));
            }
        } else if (building.roofStyle === "saw") {
            for (let tooth = 0; tooth < 3; tooth += 1) {
                const geometry = new THREE.BoxGeometry(w * 0.9, 1.6, 1.2);
                geometry.rotateX(-0.5);
                geometry.translate(x, height + 0.9, z - d / 2 + 4 + tooth * 6);
                roofs.push(geometry);
            }
        }
        // Rooftop railing.
        for (const [ox, oz, rw, rd] of [
            [0, -d / 2, w, 0.1], [0, d / 2, w, 0.1], [-w / 2, 0, 0.1, d], [w / 2, 0, 0.1, d]
        ]) {
            trims.push(box(rw, 0.06, rd, x + ox, height + 1.15, z + oz));
        }
    }

    buildStorefront(building, storefronts, awnings, glass) {
        const { x, z, w, d, facing } = building;
        const outward = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing)).multiplyScalar(-1);
        const frontX = x + outward.x * (d / 2 + 0.05);
        const frontZ = z + outward.z * (d / 2 + 0.05);
        const span = Math.abs(outward.x) > 0.5 ? d : w;

        const glassPane = new THREE.PlaneGeometry(span * 0.82, 3);
        glassPane.rotateY(facing + Math.PI);
        glassPane.translate(
            x + outward.x * (Math.abs(outward.x) > 0.5 ? w / 2 + 0.06 : 0),
            1.9,
            z + outward.z * (Math.abs(outward.z) > 0.5 ? d / 2 + 0.06 : 0)
        );
        glass.push(glassPane);

        const awningX = x + outward.x * ((Math.abs(outward.x) > 0.5 ? w / 2 : d / 2) + 0.9);
        const awningZ = z + outward.z * ((Math.abs(outward.z) > 0.5 ? d / 2 : w / 2) + 0.9);
        const awning = new THREE.BoxGeometry(Math.abs(outward.x) > 0.5 ? 2.1 : span * 0.86, 0.12, Math.abs(outward.x) > 0.5 ? span * 0.86 : 2.1);
        awning.rotateZ(outward.x * 0.12);
        awning.rotateX(-outward.z * 0.12);
        awning.translate(awningX, 4.05, awningZ);
        awnings.push(awning);

        storefronts.push(box(
            Math.abs(outward.x) > 0.5 ? 0.3 : span * 0.9,
            0.75,
            Math.abs(outward.x) > 0.5 ? span * 0.9 : 0.3,
            frontX,
            4.75,
            frontZ
        ));
        void storefronts;
    }

    buildPark() {
        const block = PARK_BLOCK;
        const lawn = new THREE.Mesh(
            scaleUv(plane(block.w, block.d, block.x + block.w / 2, 0.1, block.z + block.d / 2), 12, 12),
            materials.grass()
        );
        lawn.receiveShadow = true;
        this.root.add(lawn);

        // Winding paths.
        const paths = [];
        paths.push(scaleUv(box(block.w, 0.04, 3.2, block.x + block.w / 2, 0.13, block.z + 14), 8, 1));
        paths.push(scaleUv(box(3.2, 0.04, block.d, block.x + 20, 0.13, block.z + block.d / 2), 1, 8));
        paths.push(scaleUv(box(26, 0.04, 3.2, block.x + 38, 0.13, block.z + 40), 5, 1));
        this.add(paths, materials.sidewalk(), { castShadow: false, name: "park-paths" });

        // Pond with a stone rim.
        const pond = new THREE.Mesh(
            new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2),
            materials.water()
        );
        pond.scale.set(POND.rx, 1, POND.rz);
        pond.position.set(POND.x, 0.09, POND.z);
        pond.receiveShadow = false;
        this.root.add(pond);
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(1, 0.055, 8, 44).rotateX(Math.PI / 2),
            materials.curb()
        );
        rim.scale.set(POND.rx + 0.4, 1, POND.rz + 0.4);
        rim.position.set(POND.x, 0.16, POND.z);
        this.root.add(rim);

        this.buildTrees();
        this.buildBenches();
    }

    buildTrees() {
        const trunkGeometry = new THREE.CylinderGeometry(0.18, 0.3, 4.4, 7);
        trunkGeometry.translate(0, 2.2, 0);
        const canopyGeometry = new THREE.IcosahedronGeometry(1, 1);

        const spots = [];
        const random = createRandom(777);
        const block = PARK_BLOCK;
        for (let index = 0; index < 46; index += 1) {
            const x = block.x + 4 + random() * (block.w - 8);
            const z = block.z + 4 + random() * (block.d - 8);
            const toPond = Math.hypot((x - POND.x) / (POND.rx + 6), (z - POND.z) / (POND.rz + 6));
            if (toPond < 1) continue;
            if (Math.abs(z - (block.z + 14)) < 3.4) continue;
            if (Math.abs(x - (block.x + 20)) < 3.4) continue;
            spots.push({ x, z, scale: 0.85 + random() * 0.6, rotation: random() * Math.PI * 2 });
        }
        // Street trees along the avenues.
        for (let x = -140; x <= 140; x += 17) {
            for (const z of [-72, 0, 72]) {
                if (Math.abs(x) < 12) continue;
                spots.push({ x: x + 3, z: z + HALF_ROAD + WALK - 1.4, scale: 0.7 + random() * 0.3, rotation: random() * 6 });
            }
        }

        const trunks = new THREE.InstancedMesh(trunkGeometry, materials.bark(), spots.length);
        const canopies = new THREE.InstancedMesh(canopyGeometry, materials.foliage(), spots.length * 3);
        trunks.castShadow = true;
        trunks.receiveShadow = true;
        canopies.castShadow = true;
        canopies.receiveShadow = true;

        const matrix = new THREE.Matrix4();
        const colour = new THREE.Color();
        let canopyIndex = 0;
        spots.forEach((spot, index) => {
            matrix.compose(
                new THREE.Vector3(spot.x, groundY(spot.x, spot.z), spot.z),
                new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spot.rotation),
                new THREE.Vector3(spot.scale, spot.scale, spot.scale)
            );
            trunks.setMatrixAt(index, matrix);
            this.addCollider(spot.x, spot.z, 0.7, 0.7, 4, "tree");

            // Three overlapping canopy lobes read as a real crown.
            const lobes = [
                { dx: 0, dy: 5.1, dz: 0, r: 2.5 },
                { dx: -1.5, dy: 4.2, dz: 0.7, r: 1.8 },
                { dx: 1.4, dy: 4.4, dz: -0.8, r: 1.9 }
            ];
            for (const lobe of lobes) {
                matrix.compose(
                    new THREE.Vector3(
                        spot.x + lobe.dx * spot.scale,
                        groundY(spot.x, spot.z) + lobe.dy * spot.scale,
                        spot.z + lobe.dz * spot.scale
                    ),
                    new THREE.Quaternion().setFromEuler(new THREE.Euler(spot.rotation, spot.rotation * 1.7, 0)),
                    new THREE.Vector3(lobe.r * spot.scale, lobe.r * spot.scale * 0.86, lobe.r * spot.scale)
                );
                canopies.setMatrixAt(canopyIndex, matrix);
                colour.setHSL(0.26 + (index % 5) * 0.012, 0.34, 0.3 + (index % 3) * 0.045);
                canopies.setColorAt(canopyIndex, colour);
                canopyIndex += 1;
            }
        });
        canopies.count = canopyIndex;
        trunks.instanceMatrix.needsUpdate = true;
        canopies.instanceMatrix.needsUpdate = true;
        if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
        this.root.add(trunks, canopies);
    }

    buildBenches() {
        const geometries = [];
        const legs = [];
        const block = PARK_BLOCK;
        const spots = [
            { x: block.x + 12, z: block.z + 18, r: 0 },
            { x: block.x + 30, z: block.z + 18, r: 0 },
            { x: POND.x - 4, z: POND.z - 13, r: 0.2 },
            { x: POND.x + 9, z: POND.z + 12, r: Math.PI },
            { x: block.x + 46, z: block.z + 32, r: -Math.PI / 2 }
        ];
        for (const spot of spots) {
            const y = 0.1;
            for (let slat = 0; slat < 3; slat += 1) {
                geometries.push(box(1.9, 0.07, 0.16, spot.x, y + 0.45, spot.z - 0.18 + slat * 0.18, spot.r));
            }
            for (let slat = 0; slat < 3; slat += 1) {
                const back = box(1.9, 0.16, 0.07, spot.x, y + 0.62 + slat * 0.17, spot.z + 0.24, spot.r);
                geometries.push(back);
            }
            for (const side of [-1, 1]) {
                legs.push(box(0.09, 0.45, 0.5, spot.x + side * 0.85, y + 0.22, spot.z, spot.r));
            }
            this.addCollider(spot.x, spot.z, 2, 0.7, 0.9, "prop");
        }
        this.add(geometries, materials.fabric(0x6b4a30), { name: "benches" });
        this.add(legs, materials.metal(0x3a3d42), { name: "bench-legs" });
    }

    buildCourt() {
        const block = SPORTS_BLOCK;
        // Lot surface.
        const lot = new THREE.Mesh(
            scaleUv(plane(block.w, block.d, block.x + block.w / 2, 0.04, block.z + block.d / 2), 10, 10),
            materials.asphalt()
        );
        lot.receiveShadow = true;
        this.root.add(lot);

        const surface = new THREE.Mesh(
            scaleUv(plane(COURT.width + 3, COURT.depth + 3, COURT.x, 0.06, COURT.z), 6, 4),
            materials.court()
        );
        surface.receiveShadow = true;
        this.root.add(surface);

        // Court markings.
        const lines = [];
        const halfW = COURT.width / 2;
        const halfD = COURT.depth / 2;
        lines.push(plane(COURT.width, 0.1, COURT.x, 0.075, COURT.z - halfD));
        lines.push(plane(COURT.width, 0.1, COURT.x, 0.075, COURT.z + halfD));
        lines.push(plane(0.1, COURT.depth, COURT.x - halfW, 0.075, COURT.z));
        lines.push(plane(0.1, COURT.depth, COURT.x + halfW, 0.075, COURT.z));
        lines.push(plane(0.12, COURT.depth, COURT.x, 0.075, COURT.z));
        // Centre circle. Segments overlap, otherwise the arc reads as a dotted line.
        const centreSegments = 64;
        const centreSpan = (2 * Math.PI * 1.8) / centreSegments * 1.6;
        for (let step = 0; step < centreSegments; step += 1) {
            const angle = (step / centreSegments) * Math.PI * 2;
            const segment = plane(centreSpan, 0.1, 0, 0.075, 0);
            segment.rotateY(-angle);
            segment.translate(COURT.x + Math.cos(angle) * 1.8, 0, COURT.z + Math.sin(angle) * 1.8);
            lines.push(segment);
        }
        // Keys and arcs.
        for (const hoop of COURT.hoops) {
            const keyX = hoop.x + hoop.facing * 2.9;
            lines.push(plane(5.8, 0.1, keyX, 0.075, COURT.z - 2.45));
            lines.push(plane(5.8, 0.1, keyX, 0.075, COURT.z + 2.45));
            lines.push(plane(0.1, 4.9, hoop.x + hoop.facing * 5.8, 0.075, COURT.z));
            const arcSegments = 56;
            const arcSpan = (Math.PI * 6.7) / arcSegments * 1.7;
            for (let step = 0; step <= arcSegments; step += 1) {
                const angle = -Math.PI / 2 + (step / arcSegments) * Math.PI;
                const segment = plane(arcSpan, 0.1, 0, 0.075, 0);
                segment.rotateY(-angle * hoop.facing);
                segment.translate(
                    hoop.x + hoop.facing * (Math.cos(angle) * 6.7 + 1.2),
                    0,
                    COURT.z + Math.sin(angle) * 6.7
                );
                lines.push(segment);
            }
        }
        this.add(lines, materials.courtLine(), { castShadow: false, name: "court-lines" });

        this.hoops = [];
        for (const hoop of COURT.hoops) this.buildHoop(hoop);

        this.buildFence(block);
        this.buildBleachers(block);
        this.buildFloodlights();
    }

    /** Four towers so the evening final reads as a lit venue rather than a void. */
    buildFloodlights() {
        const masts = [];
        const heads = [];
        const offsetX = COURT.width / 2 + 4.5;
        const offsetZ = COURT.depth / 2 + 3.5;
        this.floodlights = [];

        for (const signX of [-1, 1]) {
            for (const signZ of [-1, 1]) {
                const x = COURT.x + signX * offsetX;
                const z = COURT.z + signZ * offsetZ;
                masts.push(box(0.34, 11, 0.34, x, 5.5, z));
                masts.push(box(2.6, 0.22, 0.3, x - signX * 1.1, 10.6, z));
                for (let bank = 0; bank < 3; bank += 1) {
                    heads.push(box(0.72, 0.5, 0.24, x - signX * (0.2 + bank * 0.85), 10.95, z));
                }
                this.addCollider(x, z, 0.9, 0.9, 11, "prop");
                this.floodlights.push(new THREE.Vector3(x - signX * 0.9, 10.9, z));
            }
        }

        this.add(masts, materials.metal(0x3d4249), { name: "flood-masts" });
        this.add(heads, materials.emissive(0xf4f8ff, 0.5), { castShadow: false, name: "flood-heads" });
    }

    buildHoop(hoop) {
        const group = new THREE.Group();
        const poleX = hoop.x + hoop.facing * -1.6;
        const structure = [];
        structure.push(box(0.22, 4.4, 0.22, poleX, 2.2, hoop.z ?? COURT.z));
        structure.push(box(1.5, 0.16, 0.16, poleX + hoop.facing * 0.75, 3.65, COURT.z));
        const pole = new THREE.Mesh(mergeGeometries(structure), materials.metal(0x4c5157));
        pole.castShadow = true;
        group.add(pole);

        const backboard = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 1.05, 1.8),
            new THREE.MeshStandardMaterial({
                color: 0xd7dde2,
                roughness: 0.12,
                metalness: 0.1,
                transparent: true,
                opacity: 0.72,
                envMapIntensity: 1.4
            })
        );
        backboard.position.set(hoop.x - hoop.facing * 0.15, 3.55, COURT.z);
        backboard.castShadow = true;
        group.add(backboard);

        const square = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.45, 0.59),
            materials.paintedMetal(0xe8462f)
        );
        square.position.set(hoop.x - hoop.facing * 0.09, 3.3, COURT.z);
        group.add(square);

        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.23, 0.022, 8, 22).rotateX(Math.PI / 2),
            materials.paintedMetal(0xe2622a)
        );
        rim.position.set(hoop.x + hoop.facing * 0.25, COURT.rimHeight, COURT.z);
        rim.castShadow = true;
        group.add(rim);

        // Net as a ring of tapering strands.
        const netStrands = [];
        for (let strand = 0; strand < 12; strand += 1) {
            const angle = (strand / 12) * Math.PI * 2;
            const geometry = new THREE.CylinderGeometry(0.006, 0.004, 0.42, 4);
            geometry.translate(
                rim.position.x + Math.cos(angle) * 0.18,
                COURT.rimHeight - 0.21,
                COURT.z + Math.sin(angle) * 0.18
            );
            netStrands.push(geometry);
        }
        const net = new THREE.Mesh(mergeGeometries(netStrands), new THREE.MeshStandardMaterial({
            color: 0xe8e6df,
            roughness: 0.85
        }));
        group.add(net);

        this.root.add(group);
        this.hoops.push({
            position: new THREE.Vector3(rim.position.x, COURT.rimHeight, COURT.z),
            facing: hoop.facing,
            group
        });
        this.addCollider(poleX, COURT.z, 0.6, 0.6, 4, "prop");
    }

    buildFence(block) {
        const posts = [];
        const rails = [];
        const inset = 1.5;
        const minX = block.x + inset;
        const maxX = block.x + block.w - inset;
        const minZ = block.z + inset;
        const maxZ = block.z + block.d - inset;
        const gateCentre = block.x + block.w * 0.5;

        for (let x = minX; x <= maxX; x += 3) {
            for (const z of [minZ, maxZ]) {
                if (z === minZ && Math.abs(x - gateCentre) < 3.2) continue;
                posts.push(box(0.09, 3, 0.09, x, 1.5, z));
            }
        }
        for (let z = minZ; z <= maxZ; z += 3) {
            for (const x of [minX, maxX]) posts.push(box(0.09, 3, 0.09, x, 1.5, z));
        }
        for (const y of [0.6, 1.6, 2.85]) {
            rails.push(box(maxX - minX, 0.05, 0.05, (minX + maxX) / 2, y, maxZ));
            rails.push(box(0.05, 0.05, maxZ - minZ, minX, y, (minZ + maxZ) / 2));
            rails.push(box(0.05, 0.05, maxZ - minZ, maxX, y, (minZ + maxZ) / 2));
            rails.push(box((gateCentre - 3.2) - minX, 0.05, 0.05, (minX + gateCentre - 3.2) / 2, y, minZ));
            rails.push(box(maxX - (gateCentre + 3.2), 0.05, 0.05, (maxX + gateCentre + 3.2) / 2, y, minZ));
        }
        const fence = this.add([...posts, ...rails], materials.metal(0x5a6068), { name: "court-fence" });
        if (fence) fence.castShadow = false;

        // Colliders along the fence line, leaving the gate open.
        this.addCollider((minX + maxX) / 2, maxZ, maxX - minX, 0.4, 3, "fence");
        this.addCollider(minX, (minZ + maxZ) / 2, 0.4, maxZ - minZ, 3, "fence");
        this.addCollider(maxX, (minZ + maxZ) / 2, 0.4, maxZ - minZ, 3, "fence");
        this.addCollider((minX + gateCentre - 3.2) / 2, minZ, gateCentre - 3.2 - minX, 0.4, 3, "fence");
        this.addCollider((maxX + gateCentre + 3.2) / 2, minZ, maxX - gateCentre - 3.2, 0.4, 3, "fence");
    }

    buildBleachers(block) {
        const steps = [];
        const frame = [];
        const baseZ = COURT.z + COURT.depth / 2 + 3.5;
        for (let tier = 0; tier < 4; tier += 1) {
            steps.push(box(16, 0.16, 0.9, COURT.x, 0.5 + tier * 0.45, baseZ + tier * 0.9));
            frame.push(box(16, 0.45, 0.1, COURT.x, 0.28 + tier * 0.45, baseZ + tier * 0.9 + 0.45));
        }
        for (const side of [-1, 1]) {
            frame.push(box(0.12, 2.2, 4, COURT.x + side * 8, 1.1, baseZ + 1.6));
        }
        this.add(steps, materials.metal(0x8d9298), { name: "bleacher-steps" });
        this.add(frame, materials.metal(0x50555b), { name: "bleacher-frame" });
        this.addCollider(COURT.x, baseZ + 1.6, 16, 4, 2.2, "prop");
        void block;
    }

    buildStreetFurniture() {
        const poles = [];
        const heads = [];
        const hydrants = [];
        const bins = [];
        const signals = [];

        for (const road of ROADS) {
            const along = road.axis === "x" ? "x" : "z";
            for (let position = road.from + 12; position < road.to - 12; position += 26) {
                for (const side of [-1, 1]) {
                    const x = along === "x" ? position : road.at + side * (HALF_ROAD + WALK - 1.1);
                    const z = along === "x" ? road.at + side * (HALF_ROAD + WALK - 1.1) : position;
                    if (Math.abs(x) > 148 || Math.abs(z) > 118) continue;
                    poles.push(box(0.14, 7, 0.14, x, 3.5 + CURB, z));
                    const armDirection = along === "x" ? 0 : Math.PI / 2;
                    poles.push(box(2.2, 0.12, 0.12, x - side * 1.1 * Math.cos(armDirection), 6.9 + CURB, z - side * 1.1 * Math.sin(armDirection), armDirection));
                    const headX = x - side * 2 * (along === "x" ? 0 : 1) - (along === "x" ? 0 : 0);
                    const lampX = along === "x" ? x : x - side * 2;
                    const lampZ = along === "x" ? z - side * 2 : z;
                    heads.push(box(0.7, 0.16, 0.34, lampX, 6.82 + CURB, lampZ));
                    this.lamps.push(new THREE.Vector3(lampX, 6.7 + CURB, lampZ));
                    this.addCollider(x, z, 0.4, 0.4, 7, "prop");
                    void headX;
                }
            }
        }

        // Hydrants and bins on the pavement.
        const random = createRandom(5150);
        for (let index = 0; index < 26; index += 1) {
            const road = ROADS[Math.floor(random() * ROADS.length)];
            const along = road.from + 14 + random() * (road.to - road.from - 28);
            const side = random() > 0.5 ? 1 : -1;
            const x = road.axis === "x" ? along : road.at + side * (HALF_ROAD + WALK - 2.2);
            const z = road.axis === "x" ? road.at + side * (HALF_ROAD + WALK - 2.2) : along;
            if (random() > 0.5) {
                hydrants.push(box(0.26, 0.72, 0.26, x, CURB + 0.36, z));
                hydrants.push(box(0.5, 0.14, 0.16, x, CURB + 0.5, z));
            } else {
                bins.push(box(0.62, 0.95, 0.62, x, CURB + 0.48, z));
                bins.push(box(0.7, 0.08, 0.7, x, CURB + 0.98, z));
            }
        }

        // Traffic signals at the main intersections.
        for (const horizontal of ROADS.filter((road) => road.axis === "x")) {
            for (const vertical of ROADS.filter((road) => road.axis === "z")) {
                for (const [sx, sz] of [[-1, -1], [1, 1]]) {
                    const x = vertical.at + sx * (HALF_ROAD + 1.4);
                    const z = horizontal.at + sz * (HALF_ROAD + 1.4);
                    signals.push(box(0.16, 5.2, 0.16, x, 2.6, z));
                    signals.push(box(0.34, 0.95, 0.3, x, 4.9, z));
                    this.addCollider(x, z, 0.4, 0.4, 5, "prop");
                }
            }
        }

        this.add(poles, materials.metal(0x44484e), { name: "lamp-poles" });
        this.add(heads, materials.emissive(0xffd9a0, 0.4), { castShadow: false, name: "lamp-heads" });
        this.add(hydrants, materials.paintedMetal(0xa8342a), { name: "hydrants" });
        this.add(bins, materials.metal(0x3f4a44), { name: "bins" });
        this.add(signals, materials.metal(0x35383d), { name: "signals" });
    }

    buildPlayerHome() {
        // The room the player wakes up in, built inside the hollow house on
        // Maple Rise. The doorway faces the street so stepping outside is one
        // continuous walk with no loading screen.
        const home = POIS.home;
        const width = home.w ?? 13;
        const depth = home.d ?? 12;
        const height = 3.1;
        const walls = [];
        const floorY = CURB;
        const doorWidth = 1.6;
        const halfW = width / 2;
        const halfD = depth / 2;

        walls.push(scaleUv(plane(width, depth, home.x, floorY + 0.01, home.z), 4, 4));
        walls.push(box(width, 0.2, depth, home.x, floorY + height, home.z));
        walls.push(box(width, height, 0.2, home.x, floorY + height / 2, home.z - halfD));
        walls.push(box(width, height, 0.2, home.x, floorY + height / 2, home.z + halfD));
        walls.push(box(0.2, height, depth, home.x - halfW, floorY + height / 2, home.z));

        // Street-facing wall, split around the doorway.
        const sideDepth = (depth - doorWidth) / 2;
        for (const side of [-1, 1]) {
            walls.push(box(
                0.2, height, sideDepth,
                home.x + halfW,
                floorY + height / 2,
                home.z + side * (doorWidth + sideDepth) / 2
            ));
        }
        walls.push(box(0.2, height - 2.2, doorWidth, home.x + halfW, floorY + height - (height - 2.2) / 2, home.z));

        this.add(walls, materials.plaster(0xd8cfc0), { name: "home-walls" });

        this.addCollider(home.x, home.z - halfD, width, 0.4, height, "wall");
        this.addCollider(home.x, home.z + halfD, width, 0.4, height, "wall");
        this.addCollider(home.x - halfW, home.z, 0.4, depth, height, "wall");
        for (const side of [-1, 1]) {
            this.addCollider(
                home.x + halfW,
                home.z + side * (doorWidth + sideDepth) / 2,
                0.4, sideDepth, height, "wall"
            );
        }

        // Furniture: bed, desk, gaming setup, shelf, posters, rug.
        const wood = [];
        const soft = [];
        const dark = [];
        const screens = [];

        // Bed
        wood.push(box(2, 0.35, 1.5, home.x - 2.6, floorY + 0.28, home.z - 2.2));
        soft.push(box(2.05, 0.22, 1.55, home.x - 2.6, floorY + 0.55, home.z - 2.2));
        soft.push(box(0.7, 0.16, 1.3, home.x - 3.4, floorY + 0.7, home.z - 2.2));
        wood.push(box(2.1, 0.9, 0.12, home.x - 2.6, floorY + 0.7, home.z - 2.95));

        // Desk and gaming setup
        wood.push(box(2.4, 0.08, 0.8, home.x + 2.4, floorY + 0.76, home.z - 3.2));
        dark.push(box(0.08, 0.76, 0.7, home.x + 1.3, floorY + 0.38, home.z - 3.2));
        dark.push(box(0.08, 0.76, 0.7, home.x + 3.5, floorY + 0.38, home.z - 3.2));
        dark.push(box(0.5, 0.06, 0.4, home.x + 2.4, floorY + 0.8, home.z - 3.1));
        dark.push(box(0.06, 0.3, 0.2, home.x + 2.4, floorY + 0.95, home.z - 3.45));
        screens.push(box(1.05, 0.6, 0.04, home.x + 2.4, floorY + 1.35, home.z - 3.5));
        dark.push(box(0.55, 0.16, 0.5, home.x + 3.3, floorY + 0.86, home.z - 3.2));

        // Chair
        dark.push(box(0.55, 0.1, 0.55, home.x + 2.4, floorY + 0.48, home.z - 2.4));
        dark.push(box(0.55, 0.7, 0.1, home.x + 2.4, floorY + 0.85, home.z - 2.15));
        dark.push(box(0.1, 0.45, 0.1, home.x + 2.4, floorY + 0.24, home.z - 2.4));

        // Shelf with sports gear
        wood.push(box(1.8, 0.07, 0.35, home.x + 2.2, floorY + 1.9, home.z + 3.6));
        wood.push(box(1.8, 0.07, 0.35, home.x + 2.2, floorY + 2.4, home.z + 3.6));
        soft.push(box(0.3, 0.3, 0.3, home.x + 1.7, floorY + 2.1, home.z + 3.6));

        // Rug and posters
        soft.push(box(3, 0.02, 2.2, home.x, floorY + 0.02, home.z));
        screens.push(box(0.02, 1.1, 0.8, home.x - width / 2 + 0.12, floorY + 1.9, home.z + 1.4));
        screens.push(box(0.02, 0.9, 1.2, home.x - width / 2 + 0.12, floorY + 1.8, home.z - 0.8));

        this.add(wood, materials.fabric(0x7a5637), { name: "home-wood" });
        this.add(soft, materials.fabric(0x3f5d72), { name: "home-soft" });
        this.add(dark, materials.paintedMetal(0x2c3036), { name: "home-dark" });
        this.add(screens, materials.emissive(0x6fa8d8, 0.5), { castShadow: false, name: "home-screens" });

        this.addCollider(home.x - 2.6, home.z - 2.2, 2.1, 1.6, 0.9, "prop");
        this.addCollider(home.x + 2.4, home.z - 3.2, 2.4, 0.9, 1.1, "prop");

        this.interiorLights.push({
            position: new THREE.Vector3(home.x, floorY + 2.7, home.z),
            color: 0xffd9a8,
            intensity: 8,
            distance: 12
        });
    }

    buildIndustrialDetail() {
        const containers = [];
        const random = createRandom(31337);
        const colours = [0x8a4a3c, 0x3c5a6a, 0x5f6a45, 0x7a6a3c];
        const grouped = new Map();
        for (let index = 0; index < 14; index += 1) {
            const x = 98 + random() * 44;
            const z = 14 + random() * 44;
            const rotation = random() > 0.6 ? Math.PI / 2 : 0;
            const stack = random() > 0.7 ? 2 : 1;
            const colour = colours[Math.floor(random() * colours.length)];
            if (!grouped.has(colour)) grouped.set(colour, []);
            for (let level = 0; level < stack; level += 1) {
                grouped.get(colour).push(box(6.1, 2.6, 2.44, x, 1.3 + level * 2.62 + CURB, z, rotation));
            }
            this.addCollider(x, z, rotation ? 2.6 : 6.2, rotation ? 6.2 : 2.6, stack * 2.6, "prop");
        }
        for (const [colour, geometries] of grouped) {
            this.add(geometries, materials.metal(colour), { name: `containers-${colour}` });
        }
        void containers;
    }
}

/** Ground height helper used while placing instanced props. */
function groundY(x, z) {
    if (PARK_BLOCK && x >= PARK_BLOCK.x && x <= PARK_BLOCK.x + PARK_BLOCK.w
        && z >= PARK_BLOCK.z && z <= PARK_BLOCK.z + PARK_BLOCK.d) {
        return 0.1;
    }
    return CURB;
}

export { mergeGeometries };
void COURT_RECT;
