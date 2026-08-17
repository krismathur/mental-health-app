/**
 * Humanoid characters with natural proportions and procedural animation.
 *
 * Bodies are built at roughly 7.5 head-heights, which is the real ratio for a
 * young teenager. Nothing here uses oversized heads or stubby limbs. All
 * motion is generated from a gait phase rather than baked clips, so walking,
 * running, idling, dribbling and sitting blend smoothly into each other.
 */
import * as THREE from "./vendor/three.module.js";
import { materials } from "./materials.js";

const DEG = Math.PI / 180;

export const SKIN_TONES = [
    { id: "porcelain", label: "Porcelain", color: 0xe8c5aa },
    { id: "light", label: "Light", color: 0xd8a984 },
    { id: "olive", label: "Olive", color: 0xb98357 },
    { id: "tan", label: "Tan", color: 0x9a6540 },
    { id: "brown", label: "Brown", color: 0x74472c },
    { id: "deep", label: "Deep", color: 0x4d2e1d }
];

export const HAIR_STYLES = [
    { id: "short", label: "Short crop" },
    { id: "curls", label: "Curls" },
    { id: "braids", label: "Braids" },
    { id: "ponytail", label: "Ponytail" },
    { id: "buzz", label: "Buzz" },
    { id: "wavy", label: "Wavy" }
];

export const HAIR_COLORS = [
    { id: "black", label: "Black", color: 0x1c1a19 },
    { id: "darkbrown", label: "Dark brown", color: 0x3a2519 },
    { id: "brown", label: "Brown", color: 0x5c3a21 },
    { id: "auburn", label: "Auburn", color: 0x7a3b22 },
    { id: "blonde", label: "Blonde", color: 0xb08b4f },
    { id: "ash", label: "Ash", color: 0x6d6a66 }
];

export const OUTFITS = [
    { id: "street", label: "Street", shirt: 0x2f4a63, pants: 0x2a2f38, shoes: 0xe4e2dc },
    { id: "court", label: "Court", shirt: 0xc8502f, pants: 0x30343b, shoes: 0x1f2226 },
    { id: "trail", label: "Trail", shirt: 0x4a6b4a, pants: 0x54503f, shoes: 0x6b5540 },
    { id: "classic", label: "Classic", shirt: 0xd8d4c8, pants: 0x3d4a63, shoes: 0xb7b2a6 },
    { id: "night", label: "Night", shirt: 0x353a45, pants: 0x24272d, shoes: 0xc44a35 }
];

export const JACKETS = [
    { id: "none", label: "None" },
    { id: "hoodie", label: "Hoodie", color: 0x59606b },
    { id: "windbreaker", label: "Windbreaker", color: 0x2f6b73 },
    { id: "varsity", label: "Varsity", color: 0x7a2f36 }
];

export const BACKPACKS = [
    { id: "none", label: "None" },
    { id: "day", label: "Day pack", color: 0x3f4a55 },
    { id: "sport", label: "Sport bag", color: 0x6b4230 },
    { id: "roll", label: "Roll top", color: 0x4a5240 }
];

export const DEFAULT_APPEARANCE = Object.freeze({
    name: "Rowan",
    skin: "olive",
    hair: "short",
    hairColor: "darkbrown",
    outfit: "street",
    jacket: "hoodie",
    backpack: "day",
    height: 1.0
});

function findOption(list, id) {
    return list.find((entry) => entry.id === id) || list[0];
}

/** A limb segment whose pivot sits at its upper joint. */
function limb(radius, length, material, { taper = 1 } = {}) {
    const group = new THREE.Group();
    const bodyLength = Math.max(0.02, length - radius * 2);
    const geometry = new THREE.CapsuleGeometry(radius, bodyLength, 3, 10);
    if (taper !== 1) {
        const position = geometry.attributes.position;
        for (let index = 0; index < position.count; index += 1) {
            const y = position.getY(index);
            const t = (y + length / 2) / length;
            const scale = 1 + (taper - 1) * (1 - t);
            position.setX(index, position.getX(index) * scale);
            position.setZ(index, position.getZ(index) * scale);
        }
        geometry.computeVertexNormals();
    }
    geometry.translate(0, -length / 2, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    group.userData.length = length;
    return group;
}

/**
 * Builds a character. `detail` of "full" is used for the player and speaking
 * characters; "simple" halves the mesh count for background pedestrians.
 */
export function createCharacter(appearance = {}, detail = "full") {
    const look = { ...DEFAULT_APPEARANCE, ...appearance };
    const skin = materials.skin(findOption(SKIN_TONES, look.skin).color);
    const hairColor = findOption(HAIR_COLORS, look.hairColor).color;
    const hairMaterial = materials.hair(hairColor);
    const outfit = findOption(OUTFITS, look.outfit);
    const jacket = findOption(JACKETS, look.jacket);
    const backpack = findOption(BACKPACKS, look.backpack);

    const shirtColor = jacket.id === "none" ? outfit.shirt : jacket.color;
    const shirtMaterial = materials.fabric(shirtColor);
    const pantsMaterial = materials.denim(outfit.pants);
    const shoeMaterial = materials.rubber(outfit.shoes);

    const root = new THREE.Group();
    const scale = look.height;
    root.scale.setScalar(scale);

    // Skeleton measurements in metres for a 1.62 m frame.
    const hipHeight = 0.88;
    const torsoLength = 0.5;
    const headRadius = 0.105;
    const thighLength = 0.44;
    const shinLength = 0.42;
    const upperArm = 0.28;
    const foreArm = 0.25;

    const hips = new THREE.Group();
    hips.position.y = hipHeight;
    root.add(hips);

    const pelvis = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.135, 0.1, 3, 10),
        pantsMaterial
    );
    pelvis.castShadow = true;
    pelvis.position.y = -0.03;
    pelvis.scale.set(1.12, 1, 0.82);
    hips.add(pelvis);

    const spine = new THREE.Group();
    hips.add(spine);

    const chest = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.155, torsoLength - 0.18, 3, 12),
        shirtMaterial
    );
    chest.castShadow = true;
    chest.receiveShadow = true;
    chest.position.y = torsoLength / 2;
    chest.scale.set(1.1, 1, 0.72);
    spine.add(chest);

    // Shoulder yoke widens the silhouette so it does not read as a tube.
    const shoulders = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.088, 0.24, 3, 10).rotateZ(Math.PI / 2),
        shirtMaterial
    );
    shoulders.castShadow = true;
    shoulders.position.y = torsoLength - 0.04;
    shoulders.scale.set(1, 1, 0.78);
    spine.add(shoulders);

    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.06, 3, 8), skin);
    neck.position.y = torsoLength + 0.05;
    neck.castShadow = true;
    spine.add(neck);

    const headPivot = new THREE.Group();
    headPivot.position.y = torsoLength + 0.1;
    spine.add(headPivot);

    const head = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 20, 16), skin);
    head.castShadow = true;
    head.receiveShadow = true;
    head.position.y = headRadius * 0.88;
    head.scale.set(0.9, 1.08, 0.96);
    headPivot.add(head);

    const jaw = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 0.72, 14, 12), skin);
    jaw.position.set(0, headRadius * 0.62, 0.016);
    jaw.scale.set(0.92, 0.82, 1.02);
    headPivot.add(jaw);

    if (detail === "full") {
        const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.32 });
        const iris = new THREE.MeshStandardMaterial({ color: 0x33261c, roughness: 0.24 });
        for (const side of [-1, 1]) {
            const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), eyeWhite);
            sclera.position.set(side * 0.035, headRadius * 0.92, headRadius * 0.78);
            headPivot.add(sclera);
            const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0092, 8, 8), iris);
            pupil.position.set(side * 0.036, headRadius * 0.92, headRadius * 0.86);
            headPivot.add(pupil);
            const brow = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.007, 0.012), hairMaterial);
            brow.position.set(side * 0.036, headRadius * 1.12, headRadius * 0.82);
            brow.rotation.z = side * 0.12;
            headPivot.add(brow);
        }
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.042, 8), skin);
        nose.rotation.x = Math.PI / 2.1;
        nose.position.set(0, headRadius * 0.78, headRadius * 0.92);
        headPivot.add(nose);
        for (const side of [-1, 1]) {
            const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), skin);
            ear.position.set(side * headRadius * 0.92, headRadius * 0.88, 0);
            ear.scale.set(0.4, 1, 0.7);
            headPivot.add(ear);
        }
    }

    addHair(headPivot, look.hair, hairMaterial, headRadius);

    // Arms
    const arms = {};
    for (const side of [-1, 1]) {
        const key = side < 0 ? "left" : "right";
        const shoulder = new THREE.Group();
        shoulder.position.set(side * 0.175, torsoLength - 0.03, 0);
        spine.add(shoulder);

        const upper = limb(0.048, upperArm, jacket.id === "none" ? skin : shirtMaterial, { taper: 1.14 });
        shoulder.add(upper);

        const elbow = new THREE.Group();
        elbow.position.y = -upperArm;
        upper.add(elbow);

        const fore = limb(0.04, foreArm, skin, { taper: 1.18 });
        elbow.add(fore);

        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), skin);
        hand.scale.set(0.72, 1.1, 0.5);
        hand.position.y = -foreArm - 0.03;
        hand.castShadow = true;
        fore.add(hand);

        arms[key] = { shoulder, upper, elbow, fore, hand };
    }

    // Legs
    const legs = {};
    for (const side of [-1, 1]) {
        const key = side < 0 ? "left" : "right";
        const hip = new THREE.Group();
        hip.position.set(side * 0.088, -0.05, 0);
        hips.add(hip);

        const thigh = limb(0.072, thighLength, pantsMaterial, { taper: 1.12 });
        hip.add(thigh);

        const knee = new THREE.Group();
        knee.position.y = -thighLength;
        thigh.add(knee);

        const shin = limb(0.055, shinLength, pantsMaterial, { taper: 1.1 });
        knee.add(shin);

        const ankle = new THREE.Group();
        ankle.position.y = -shinLength;
        shin.add(ankle);

        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.062, 0.235), shoeMaterial);
        foot.position.set(0, -0.028, 0.052);
        foot.castShadow = true;
        foot.receiveShadow = true;
        ankle.add(foot);
        const toe = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 8), shoeMaterial);
        toe.scale.set(1, 0.7, 1.3);
        toe.position.set(0, -0.03, 0.14);
        ankle.add(toe);

        legs[key] = { hip, thigh, knee, shin, ankle, foot };
    }

    if (jacket.id !== "none") {
        const skirtOfJacket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.168, 0.185, 0.16, 14, 1, true),
            shirtMaterial
        );
        skirtOfJacket.position.y = 0.06;
        skirtOfJacket.scale.set(1, 1, 0.75);
        skirtOfJacket.castShadow = true;
        spine.add(skirtOfJacket);
        if (jacket.id === "hoodie") {
            const hood = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10, 0, Math.PI * 2, 0, Math.PI / 1.7), shirtMaterial);
            hood.position.set(0, torsoLength - 0.02, -0.055);
            hood.rotation.x = 0.5;
            hood.scale.set(1, 0.8, 0.9);
            hood.castShadow = true;
            spine.add(hood);
        }
    }

    if (backpack.id !== "none") {
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.14), materials.fabric(backpack.color));
        pack.position.set(0, torsoLength * 0.6, -0.15);
        pack.castShadow = true;
        spine.add(pack);
        for (const side of [-1, 1]) {
            const strap = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.03), materials.fabric(backpack.color));
            strap.position.set(side * 0.09, torsoLength * 0.72, 0.09);
            strap.rotation.x = -0.12;
            spine.add(strap);
        }
    }

    const state = {
        phase: 0,
        speed: 0,
        lean: 0,
        headYaw: 0,
        headPitch: 0,
        mode: "idle",
        blink: 0,
        armOverride: null
    };

    const rig = { root, hips, spine, headPivot, arms, legs, state, appearance: look };

    rig.update = (dt, input = {}) => updateRig(rig, dt, input, { thighLength, shinLength, upperArm, foreArm, hipHeight });
    return rig;
}

function addHair(headPivot, styleId, material, headRadius) {
    const group = new THREE.Group();
    group.position.y = headRadius * 0.9;
    headPivot.add(group);

    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(headRadius * 1.045, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.85),
        material
    );
    cap.castShadow = true;

    if (styleId === "buzz") {
        cap.scale.set(0.92, 0.82, 0.98);
        group.add(cap);
        return;
    }

    cap.scale.set(0.95, 1, 1);
    group.add(cap);

    if (styleId === "short") {
        const fringe = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 0.6, 10, 8), material);
        fringe.position.set(0, headRadius * 0.06, headRadius * 0.66);
        fringe.scale.set(1.3, 0.5, 0.6);
        group.add(fringe);
    } else if (styleId === "curls") {
        for (let index = 0; index < 22; index += 1) {
            const angle = (index / 22) * Math.PI * 2;
            const ring = index % 2 === 0 ? 0.86 : 0.62;
            const curl = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 0.34, 8, 6), material);
            curl.position.set(
                Math.cos(angle) * headRadius * ring,
                headRadius * (0.06 + (index % 3) * 0.14),
                Math.sin(angle) * headRadius * ring
            );
            curl.castShadow = true;
            group.add(curl);
        }
    } else if (styleId === "braids") {
        for (const side of [-1, 1]) {
            for (let segment = 0; segment < 5; segment += 1) {
                const bead = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 0.24, 8, 6), material);
                bead.position.set(
                    side * headRadius * 0.78,
                    -segment * headRadius * 0.42,
                    -headRadius * 0.2 + Math.sin(segment) * 0.01
                );
                bead.scale.set(1, 0.9, 1);
                group.add(bead);
            }
        }
    } else if (styleId === "ponytail") {
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(headRadius * 0.3, headRadius * 1.1, 4, 8), material);
        tail.position.set(0, -headRadius * 0.5, -headRadius * 1.02);
        tail.rotation.x = -0.5;
        tail.castShadow = true;
        group.add(tail);
        const tie = new THREE.Mesh(new THREE.TorusGeometry(headRadius * 0.3, 0.008, 6, 12), material);
        tie.position.set(0, headRadius * 0.06, -headRadius * 0.92);
        tie.rotation.x = Math.PI / 2.4;
        group.add(tie);
    } else if (styleId === "wavy") {
        for (let index = 0; index < 9; index += 1) {
            const angle = (index / 9) * Math.PI * 2;
            const wave = new THREE.Mesh(new THREE.CapsuleGeometry(headRadius * 0.2, headRadius * 0.5, 4, 6), material);
            wave.position.set(
                Math.cos(angle) * headRadius * 0.82,
                -headRadius * 0.22,
                Math.sin(angle) * headRadius * 0.82
            );
            wave.rotation.set(Math.sin(angle) * 0.4, 0, Math.cos(angle) * 0.4);
            group.add(wave);
        }
    }
}

/**
 * Drives the whole body from a gait phase. Arms counter-rotate against legs,
 * the pelvis tips and twists, and the chest rises slightly on each step,
 * which is what makes the walk read as weighted rather than floaty.
 */
function updateRig(rig, dt, input, measures) {
    const state = rig.state;
    const speed = input.speed ?? 0;
    const mode = input.mode ?? (speed > 0.1 ? "walk" : "idle");
    state.mode = mode;
    state.speed += (speed - state.speed) * Math.min(1, dt * 9);

    const running = state.speed > 2.6;
    const cadence = state.speed > 0.08
        ? (running ? 3.05 : 2.5) * Math.max(0.55, state.speed / (running ? 5.2 : 1.9))
        : 0;
    state.phase += dt * cadence;
    if (state.phase > Math.PI * 2) state.phase -= Math.PI * 2;

    const stride = Math.min(1, state.speed / (running ? 5.4 : 2.0));
    const swing = state.phase;
    const walkAmount = Math.min(1, state.speed / 1.6);
    const { hips, spine, headPivot, arms, legs } = rig;

    // Idle breathing and weight shift when standing still.
    const idle = 1 - walkAmount;
    const breath = Math.sin(performance.now() * 0.0013) * 0.5 + 0.5;

    hips.position.y = measures.hipHeight
        + Math.sin(swing * 2) * 0.028 * stride
        - stride * 0.035
        + idle * breath * 0.004;
    hips.rotation.y = Math.sin(swing) * 0.13 * stride;
    hips.rotation.z = Math.sin(swing) * 0.05 * stride;
    hips.rotation.x = state.lean;

    spine.rotation.x = (running ? 0.2 : 0.07) * stride + idle * 0.01;
    spine.rotation.y = -Math.sin(swing) * 0.09 * stride;
    spine.rotation.z = -Math.sin(swing) * 0.025 * stride;

    headPivot.rotation.y += (state.headYaw - headPivot.rotation.y) * Math.min(1, dt * 5);
    headPivot.rotation.x += ((state.headPitch - spine.rotation.x * 0.7) - headPivot.rotation.x) * Math.min(1, dt * 5);
    headPivot.rotation.z = -Math.sin(swing) * 0.03 * stride;

    for (const side of ["left", "right"]) {
        const direction = side === "left" ? 1 : -1;
        const leg = legs[side];
        const phase = swing + (direction > 0 ? 0 : Math.PI);

        const thighSwing = Math.sin(phase) * (running ? 52 : 32) * DEG * stride;
        // Knee flexes hard on the back swing, straightens on the plant.
        const kneeBend = Math.max(0, -Math.cos(phase) * 0.5 + 0.35) * (running ? 96 : 58) * DEG * stride;
        const ankleRoll = Math.sin(phase + 0.7) * 16 * DEG * stride;

        leg.thigh.rotation.x = thighSwing - (running ? 0.12 : 0.03) * stride;
        leg.knee.rotation.x = -kneeBend;
        leg.ankle.rotation.x = ankleRoll + kneeBend * 0.32;
        leg.hip.rotation.z = idle * direction * 0.012;
    }

    for (const side of ["left", "right"]) {
        const direction = side === "left" ? 1 : -1;
        const arm = arms[side];
        const phase = swing + (direction > 0 ? Math.PI : 0);

        if (state.armOverride) {
            state.armOverride(arm, side, dt);
            continue;
        }

        const swingAmount = Math.sin(phase) * (running ? 46 : 26) * DEG * stride;
        arm.upper.rotation.x = swingAmount - 0.06 - (running ? 0.35 : 0.08) * stride;
        arm.upper.rotation.z = direction * (running ? 8 : 5) * DEG + direction * idle * 0.05;
        arm.elbow.rotation.x = -(running ? 62 : 22) * DEG * stride - 0.12
            - Math.max(0, Math.sin(phase)) * 0.3 * stride;
        arm.fore.rotation.y = direction * 0.1;
    }

    if (mode === "sit") {
        hips.position.y = measures.hipHeight * 0.62;
        hips.rotation.set(0, 0, 0);
        spine.rotation.x = 0.12;
        for (const side of ["left", "right"]) {
            legs[side].thigh.rotation.x = -80 * DEG;
            legs[side].knee.rotation.x = -85 * DEG;
            legs[side].ankle.rotation.x = 12 * DEG;
            arms[side].upper.rotation.x = -0.35;
            arms[side].elbow.rotation.x = -0.6;
        }
    }
}

/** Locks one arm into a dribble motion while the rest of the body keeps moving. */
export function setDribble(rig, active, tempo = 2.6) {
    if (!active) {
        rig.state.armOverride = null;
        return;
    }
    let clock = 0;
    rig.state.armOverride = (arm, side, dt) => {
        if (side === "right") {
            clock += dt * tempo;
            const pump = Math.sin(clock * Math.PI * 2);
            arm.upper.rotation.x = -0.55 + pump * 0.34;
            arm.upper.rotation.z = -0.42;
            arm.elbow.rotation.x = -0.95 - pump * 0.4;
        } else {
            arm.upper.rotation.x = -0.18;
            arm.upper.rotation.z = 0.34;
            arm.elbow.rotation.x = -0.7;
        }
    };
}

/** A one-shot shooting motion. Returns a promise-free updater the caller ticks. */
export function playShot(rig, duration = 0.62) {
    let elapsed = 0;
    rig.state.armOverride = (arm, side, dt) => {
        if (side === "right") elapsed += dt;
        const t = Math.min(1, elapsed / duration);
        const load = Math.sin(Math.min(t, 0.4) / 0.4 * Math.PI * 0.5);
        const release = t > 0.4 ? (t - 0.4) / 0.6 : 0;
        arm.upper.rotation.x = -0.4 - load * 0.9 - release * 1.5;
        arm.upper.rotation.z = (side === "right" ? -1 : 1) * (0.3 - release * 0.18);
        arm.elbow.rotation.x = -1.6 + load * 0.2 + release * 1.35;
        if (t >= 1) rig.state.armOverride = null;
    };
}

/** Points the head at a world position so characters look at each other. */
export function lookAt(rig, targetPosition, bodyPosition, bodyRotationY) {
    const dx = targetPosition.x - bodyPosition.x;
    const dz = targetPosition.z - bodyPosition.z;
    const angle = Math.atan2(dx, dz) - bodyRotationY;
    const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle));
    rig.state.headYaw = THREE.MathUtils.clamp(wrapped, -1.1, 1.1);
    const dy = (targetPosition.y - (bodyPosition.y + 1.5));
    rig.state.headPitch = THREE.MathUtils.clamp(-dy * 0.35, -0.4, 0.4);
}
