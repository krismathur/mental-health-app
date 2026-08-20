/**
 * The 3D world for Lantern Walk, built on the vendored Three.js.
 *
 * Everything is real-time lit: the night is dim moonlight and haze, and the
 * lantern the walker carries is an actual point light casting real shadows, so
 * as its oil burns down the pool of light literally shrinks around them. The
 * walker is a small articulated rig animated in code (no external model files),
 * so the whole game ships self-contained.
 *
 * main.js owns the game rules (light meter, oil, setbacks). This module only
 * turns the current world state into pixels: update(dt, world) then render.
 */

import * as THREE from "three";

const NIGHT = 0x0a1626;
const LANTERN_COLOR = 0xffb24d;

/** A soft round glow texture, drawn once and reused for every halo. */
function makeGlowTexture() {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.5)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/** A tiny deterministic RNG so scenery is the same every run. */
function makeRng(seed) {
    let s = seed >>> 0;
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

export class LanternScene {
    constructor(canvas) {
        this.canvas = canvas;

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(NIGHT);
        this.scene.fog = new THREE.FogExp2(NIGHT, 0.05);

        this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 260);
        this.camera.position.set(3, 4.2, 15);

        this.glowTexture = makeGlowTexture();

        this.levelGroup = new THREE.Group();
        this.scene.add(this.levelGroup);

        this.oils = [];
        this.walkPhase = 0;

        this.buildLights();
        this.buildCharacter();

        this.resize();
    }

    // --------------------------------------------------------------- lighting

    buildLights() {
        // Dim skydome so nothing is pure black, cool on top and darker below.
        const hemi = new THREE.HemisphereLight(0x2a3d5c, 0x05080f, 0.5);
        this.scene.add(hemi);

        // Low, cool moonlight from behind, casting long soft shadows.
        const moon = new THREE.DirectionalLight(0x8fb0e0, 0.35);
        moon.position.set(-8, 14, -6);
        moon.castShadow = true;
        moon.shadow.mapSize.set(1024, 1024);
        moon.shadow.camera.near = 1;
        moon.shadow.camera.far = 60;
        moon.shadow.camera.left = -30;
        moon.shadow.camera.right = 30;
        moon.shadow.camera.top = 30;
        moon.shadow.camera.bottom = -30;
        this.scene.add(moon);
        this.moon = moon;

        // The lantern: the star of the show. A warm point light with real
        // shadows, parented to the walker's hand so it swings as they walk.
        const lantern = new THREE.PointLight(LANTERN_COLOR, 4.0, 22, 1.6);
        lantern.castShadow = true;
        lantern.shadow.mapSize.set(1024, 1024);
        lantern.shadow.camera.near = 0.1;
        lantern.shadow.camera.far = 24;
        lantern.shadow.bias = -0.005;
        this.lantern = lantern;
    }

    // -------------------------------------------------------------- character

    buildCharacter() {
        const root = new THREE.Group();

        const coatMat = new THREE.MeshStandardMaterial({ color: 0xc0562f, roughness: 0.8, metalness: 0.05 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.9 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8b98f, roughness: 0.7 });
        this.coatMat = coatMat;
        this.skinMat = skinMat;

        // Torso.
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.7, 6, 12), coatMat);
        torso.position.y = 1.55;
        torso.castShadow = true;
        root.add(torso);

        // Head.
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), skinMat);
        head.position.y = 2.4;
        head.castShadow = true;
        root.add(head);

        // A little hood/cap so the silhouette reads at night.
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.33, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), darkMat);
        cap.position.y = 2.5;
        cap.castShadow = true;
        root.add(cap);

        // Legs pivot from the hips so a swing looks like a stride.
        const legGeo = new THREE.CapsuleGeometry(0.16, 0.7, 5, 8);
        const leftLeg = new THREE.Group();
        leftLeg.position.set(-0.18, 1.1, 0);
        const leftLegMesh = new THREE.Mesh(legGeo, darkMat);
        leftLegMesh.position.y = -0.45;
        leftLegMesh.castShadow = true;
        leftLeg.add(leftLegMesh);
        root.add(leftLeg);

        const rightLeg = new THREE.Group();
        rightLeg.position.set(0.18, 1.1, 0);
        const rightLegMesh = new THREE.Mesh(legGeo, darkMat);
        rightLegMesh.position.y = -0.45;
        rightLegMesh.castShadow = true;
        rightLeg.add(rightLegMesh);
        root.add(rightLeg);

        // Arms pivot from the shoulders.
        const armGeo = new THREE.CapsuleGeometry(0.13, 0.6, 5, 8);
        const leftArm = new THREE.Group();
        leftArm.position.set(-0.5, 1.95, 0);
        const leftArmMesh = new THREE.Mesh(armGeo, coatMat);
        leftArmMesh.position.y = -0.38;
        leftArmMesh.castShadow = true;
        leftArm.add(leftArmMesh);
        root.add(leftArm);

        const rightArm = new THREE.Group();
        rightArm.position.set(0.5, 1.95, 0);
        const rightArmMesh = new THREE.Mesh(armGeo, coatMat);
        rightArmMesh.position.y = -0.38;
        rightArmMesh.castShadow = true;
        rightArm.add(rightArmMesh);
        root.add(rightArm);

        // The lantern hangs from the right hand.
        const hand = new THREE.Group();
        hand.position.y = -0.72;
        rightArm.add(hand);

        const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a3026, roughness: 0.5, metalness: 0.6 });
        const bail = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 16), metalMat);
        bail.position.y = -0.14;
        hand.add(bail);

        const flameGlass = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.14, 0.28, 12),
            new THREE.MeshStandardMaterial({
                color: LANTERN_COLOR,
                emissive: LANTERN_COLOR,
                emissiveIntensity: 2.2,
                roughness: 0.3,
                transparent: true,
                opacity: 0.9
            })
        );
        flameGlass.position.y = -0.34;
        hand.add(flameGlass);
        this.flameGlass = flameGlass;

        const cap2 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 12), metalMat);
        cap2.position.y = -0.16;
        hand.add(cap2);

        // The moving pool of light lives at the lantern.
        this.lantern.position.y = -0.34;
        hand.add(this.lantern);

        // A soft additive halo around the flame.
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({
            map: this.glowTexture,
            color: LANTERN_COLOR,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        halo.scale.set(2.4, 2.4, 1);
        halo.position.y = -0.34;
        hand.add(halo);
        this.lanternHalo = halo;

        this.character = {
            root: root,
            torso: torso,
            leftLeg: leftLeg,
            rightLeg: rightLeg,
            leftArm: leftArm,
            rightArm: rightArm
        };

        this.scene.add(root);
    }

    setCharacter(character) {
        this.coatMat.color.set(character.coat);
        this.skinMat.color.set(character.skin);
    }

    // ------------------------------------------------------------------ level

    buildLevel(level) {
        this.clearLevel();
        this.level = level;

        const start = -12;
        const end = level.homeX + 18;
        const length = end - start;
        const midX = (start + end) / 2;

        // The path itself: a worn dirt strip the lantern lights up.
        const pathMat = new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 1 });
        const path = new THREE.Mesh(new THREE.BoxGeometry(length, 0.4, 4.2), pathMat);
        path.position.set(midX, -0.2, 0);
        path.receiveShadow = true;
        this.levelGroup.add(path);

        // Grass verges either side, darker so the path reads as the way home.
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x14261a, roughness: 1 });
        for (const side of [-1, 1]) {
            const verge = new THREE.Mesh(new THREE.BoxGeometry(length, 0.3, 22), grassMat);
            verge.position.set(midX, -0.28, side * 13.1);
            verge.receiveShadow = true;
            this.levelGroup.add(verge);
        }

        this.scatterScenery(level, start);
        this.buildOils(level);
        this.buildHome(level);
    }

    scatterScenery(level, start) {
        const rng = makeRng(1337);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x16321f, roughness: 1 });
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 1 });

        const end = level.homeX + 12;
        for (let x = start + 4; x < end; x += 4) {
            for (const side of [-1, 1]) {
                const roll = rng();
                const z = side * (3.4 + rng() * 8);
                const jitterX = x + (rng() - 0.5) * 3;

                if (roll < 0.45) {
                    // A pine: trunk plus a stack of cones.
                    const tree = new THREE.Group();
                    const h = 2.6 + rng() * 2.2;
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, h * 0.4, 7), trunkMat);
                    trunk.position.y = h * 0.2;
                    trunk.castShadow = true;
                    tree.add(trunk);
                    for (let c = 0; c < 3; c += 1) {
                        const cone = new THREE.Mesh(
                            new THREE.ConeGeometry(0.9 - c * 0.18, 1.1, 8),
                            leafMat
                        );
                        cone.position.y = h * 0.4 + c * 0.7;
                        cone.castShadow = true;
                        tree.add(cone);
                    }
                    tree.position.set(jitterX, 0, z);
                    tree.rotation.y = rng() * Math.PI;
                    this.levelGroup.add(tree);
                } else if (roll < 0.62) {
                    const rock = new THREE.Mesh(
                        new THREE.DodecahedronGeometry(0.4 + rng() * 0.5, 0),
                        rockMat
                    );
                    rock.position.set(jitterX, 0.1, side * (2.6 + rng() * 3));
                    rock.rotation.set(rng(), rng(), rng());
                    rock.castShadow = true;
                    rock.receiveShadow = true;
                    this.levelGroup.add(rock);
                }
            }
        }
    }

    buildOils(level) {
        this.oils = [];
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xffcf70,
            emissive: 0xffb347,
            emissiveIntensity: 1.6,
            roughness: 0.35,
            transparent: true,
            opacity: 0.92
        });
        const corkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 });

        for (const oil of level.oils) {
            const group = new THREE.Group();

            const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), glassMat);
            body.scale.y = 1.15;
            group.add(body);
            const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.2, 10), glassMat);
            neck.position.y = 0.34;
            group.add(neck);
            const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 8), corkMat);
            cork.position.y = 0.46;
            group.add(cork);

            const halo = new THREE.Sprite(new THREE.SpriteMaterial({
                map: this.glowTexture,
                color: 0xffc766,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            halo.scale.set(2, 2, 1);
            group.add(halo);

            group.position.set(oil.x, 1.1, 0.2);
            this.levelGroup.add(group);
            this.oils.push({ x: oil.x, group: group, body: body, halo: halo });
        }
    }

    buildHome(level) {
        const home = new THREE.Group();

        const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x2b1d16, roughness: 0.9 });
        const windowMat = new THREE.MeshStandardMaterial({
            color: 0xffd98a,
            emissive: 0xffcf7a,
            emissiveIntensity: 2.4,
            roughness: 0.4
        });

        const walls = new THREE.Mesh(new THREE.BoxGeometry(4, 3.2, 3.4), wallMat);
        walls.position.y = 1.6;
        walls.castShadow = true;
        walls.receiveShadow = true;
        home.add(walls);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.8, 4), roofMat);
        roof.position.y = 4.1;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        home.add(roof);

        const window1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.1), windowMat);
        window1.position.set(-0.9, 1.8, 1.72);
        home.add(window1);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.12), windowMat);
        door.position.set(0.9, 0.95, 1.72);
        home.add(door);

        // Warm light spilling from the doorway, pulling the walker in.
        const glow = new THREE.PointLight(0xffcf88, 2.4, 16, 1.8);
        glow.position.set(0.9, 1.4, 2.6);
        home.add(glow);

        const halo = new THREE.Sprite(new THREE.SpriteMaterial({
            map: this.glowTexture,
            color: 0xffd98a,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        halo.scale.set(6, 6, 1);
        halo.position.set(0.9, 1.6, 2);
        home.add(halo);

        home.position.set(level.homeX + 4, 0, -1.5);
        this.levelGroup.add(home);
        this.home = home;
    }

    clearLevel() {
        while (this.levelGroup.children.length > 0) {
            const child = this.levelGroup.children.pop();
            disposeObject(child);
        }
        this.oils = [];
        this.home = null;
    }

    // ----------------------------------------------------------------- update

    update(dt, world) {
        // The play canvas is display:none until the game starts, so it can boot
        // at 0x0. Re-check the size each frame and resize when it changes, the
        // same way the 2D games do, so the scene always fills the stage.
        this.resizeIfNeeded();

        const character = this.character;
        const root = character.root;

        root.position.x = world.x;
        root.rotation.y = world.facing >= 0 ? 0 : Math.PI;

        // Walk cycle: swing limbs while moving, gentle sway while resting.
        if (world.walking) {
            this.walkPhase += dt * 8.5;
            const swing = Math.sin(this.walkPhase) * 0.7;
            character.leftLeg.rotation.x = swing;
            character.rightLeg.rotation.x = -swing;
            character.leftArm.rotation.x = -swing * 0.7;
            // Right arm holds the lantern, so it swings gently, not fully.
            character.rightArm.rotation.x = swing * 0.28;
            root.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.08;
        } else {
            const idle = Math.sin(world.time * 1.4) * 0.05;
            character.leftLeg.rotation.x *= 0.85;
            character.rightLeg.rotation.x *= 0.85;
            character.leftArm.rotation.x *= 0.85;
            character.rightArm.rotation.x = idle;
            root.position.y = 0;
        }

        // The lantern's brightness and reach follow the oil meter, so a low
        // light really does close the darkness in around the walker.
        const light = Math.max(0, Math.min(1, world.light));
        const flicker = 0.9 + Math.sin(world.time * 18) * 0.05 + Math.sin(world.time * 7) * 0.04;
        this.lantern.intensity = (0.6 + light * 4.6) * flicker;
        this.lantern.distance = 6 + light * 20;
        this.lanternHalo.material.opacity = 0.25 + light * 0.6;
        this.lanternHalo.scale.setScalar(1.4 + light * 1.8);
        this.flameGlass.material.emissiveIntensity = 0.6 + light * 2.4;

        // Oil flasks bob, spin, and (with Bright Eyes) glow from far off.
        const bright = world.abilities && world.abilities.brightEyes > 0;
        for (let i = 0; i < this.oils.length; i += 1) {
            const oil = this.oils[i];
            const taken = world.oils[i] && world.oils[i].taken;
            oil.group.visible = !taken;
            if (taken) {
                continue;
            }
            oil.group.position.y = 1.1 + Math.sin(world.time * 2 + i) * 0.12;
            oil.group.rotation.y += dt * 1.2;
            const pulse = 0.6 + Math.sin(world.time * 3 + i) * 0.2;
            oil.halo.material.opacity = (bright ? 0.9 : 0.5) * pulse;
            oil.halo.scale.setScalar(bright ? 3.2 : 2);
            oil.body.material.emissiveIntensity = bright ? 2.6 : 1.6;
        }

        // Camera trails the walker down the path.
        const targetCamX = world.x + 2.5;
        this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, dt * 4);
        this.camera.position.y = 4.2;
        this.camera.position.z = 15;
        this.camera.lookAt(world.x + 2.5, 2.1, 0);

        this.renderer.render(this.scene, this.camera);
    }

    // ------------------------------------------------------------------ sizing

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.lastWidth = width;
        this.lastHeight = height;
    }

    /** Resize only when the stage has actually changed size (cheap per frame). */
    resizeIfNeeded() {
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        if (width !== this.lastWidth || height !== this.lastHeight) {
            this.resize();
        }
    }
}

function disposeObject(object) {
    object.traverse(function (node) {
        if (node.geometry) {
            node.geometry.dispose();
        }
        if (node.material) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            for (const material of materials) {
                if (material.map) {
                    material.map.dispose();
                }
                material.dispose();
            }
        }
    });
}
