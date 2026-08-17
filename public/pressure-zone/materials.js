/**
 * Procedural material library.
 *
 * Every surface in the city gets a generated colour map plus a matching
 * normal map derived from the same height field, so the directional sun
 * produces real relief instead of flat shading. Textures are generated once
 * into canvases at load time and cached by key.
 */
import * as THREE from "./vendor/three.module.js";

const SEED = 1337;
const permutation = new Uint8Array(512);
(() => {
    let state = SEED;
    const source = new Uint8Array(256);
    for (let index = 0; index < 256; index += 1) source[index] = index;
    for (let index = 255; index > 0; index -= 1) {
        state = (state * 1664525 + 1013904223) >>> 0;
        const swap = state % (index + 1);
        const value = source[index];
        source[index] = source[swap];
        source[swap] = value;
    }
    for (let index = 0; index < 512; index += 1) permutation[index] = source[index & 255];
})();

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

/** Tiling value noise. Period keeps textures seamless when repeated. */
function noise(x, y, period) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const wrap = (value) => ((value % period) + period) % period;
    const x0 = wrap(xi);
    const y0 = wrap(yi);
    const x1 = wrap(xi + 1);
    const y1 = wrap(yi + 1);
    const corner = (cx, cy) => permutation[(permutation[cx & 255] + cy) & 255] / 255;
    const u = fade(xf);
    const v = fade(yf);
    return lerp(
        lerp(corner(x0, y0), corner(x1, y0), u),
        lerp(corner(x0, y1), corner(x1, y1), u),
        v
    );
}

function fbm(x, y, octaves, basePeriod) {
    let total = 0;
    let amplitude = 1;
    let sum = 0;
    let frequency = 1;
    for (let octave = 0; octave < octaves; octave += 1) {
        total += noise(x * frequency, y * frequency, basePeriod * frequency) * amplitude;
        sum += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
    }
    return total / sum;
}

function createCanvas(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    return canvas;
}

/**
 * Builds a colour texture and a normal map from one generator.
 * The generator writes RGB into `pixels` and a 0..1 height into `height`.
 */
function generate(size, generator, { normalStrength = 2, repeat = 1, normals = true } = {}) {
    const canvas = createCanvas(size);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const image = context.createImageData(size, size);
    const height = new Float32Array(size * size);
    generator(image.data, height, size);
    context.putImageData(image, 0, 0);

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeat, repeat);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    map.generateMipmaps = true;

    if (!normals) return { map, normalMap: null };

    // Half-res normals keep the relief without a second full-size pass.
    const normalSize = size > 128 ? size >> 1 : size;
    const scale = size / normalSize;
    const normalCanvas = createCanvas(normalSize);
    const normalContext = normalCanvas.getContext("2d");
    const normalImage = normalContext.createImageData(normalSize, normalSize);
    const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < normalSize; y += 1) {
        for (let x = 0; x < normalSize; x += 1) {
            const sx = Math.floor(x * scale);
            const sy = Math.floor(y * scale);
            const dx = (at(sx - 1, sy) - at(sx + 1, sy)) * normalStrength;
            const dy = (at(sx, sy - 1) - at(sx, sy + 1)) * normalStrength;
            const length = Math.hypot(dx, dy, 1);
            const offset = (y * normalSize + x) * 4;
            normalImage.data[offset] = ((dx / length) * 0.5 + 0.5) * 255;
            normalImage.data[offset + 1] = ((dy / length) * 0.5 + 0.5) * 255;
            normalImage.data[offset + 2] = ((1 / length) * 0.5 + 0.5) * 255;
            normalImage.data[offset + 3] = 255;
        }
    }
    normalContext.putImageData(normalImage, 0, 0);
    const normalMap = new THREE.CanvasTexture(normalCanvas);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(repeat, repeat);
    normalMap.anisotropy = 4;

    return { map, normalMap };
}

/** Writes a pixel with a small per-pixel grain so nothing reads as flat. */
function writePixel(pixels, offset, r, g, b) {
    pixels[offset] = Math.max(0, Math.min(255, r));
    pixels[offset + 1] = Math.max(0, Math.min(255, g));
    pixels[offset + 2] = Math.max(0, Math.min(255, b));
    pixels[offset + 3] = 255;
}

const generators = {
    asphalt(pixels, height, size) {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const grit = fbm(x / 3.2, y / 3.2, 3, size / 3.2);
                const patch = fbm(x / 34, y / 34, 2, size / 34);
                const crack = Math.pow(Math.abs(fbm(x / 26, y / 26, 2, size / 26) - 0.5) * 2, 6);
                let value = 34 + grit * 30 + patch * 16 - crack * 26;
                const tone = 1 + (patch - 0.5) * 0.16;
                writePixel(pixels, offset, value * tone, value * tone * 1.01, value * tone * 1.04);
                height[index] = grit * 0.7 + patch * 0.3 - crack * 0.8;
            }
        }
    },

    concrete(pixels, height, size) {
        const slab = size / 2;
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const grain = fbm(x / 2.6, y / 2.6, 2, size / 2.6);
                const stain = fbm(x / 40, y / 40, 2, size / 40);
                const jointX = Math.min(x % slab, slab - (x % slab));
                const jointY = Math.min(y % slab, slab - (y % slab));
                const joint = Math.min(jointX, jointY) < 1.6 ? 1 : 0;
                let value = 126 + grain * 26 - stain * 30 - joint * 44;
                writePixel(pixels, offset, value * 1.01, value, value * 0.96);
                height[index] = grain * 0.35 - joint * 1;
            }
        }
    },

    brick(pixels, height, size) {
        const brickHeight = size / 16;
        const brickWidth = size / 8;
        const mortar = 1.7;
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const row = Math.floor(y / brickHeight);
                const shift = (row % 2) * brickWidth * 0.5;
                const localY = y % brickHeight;
                const localX = (x + shift) % brickWidth;
                const isMortar = localY < mortar || localX < mortar;
                const grain = fbm(x / 3, y / 3, 2, size / 3);
                const variation = noise(row * 3.7, Math.floor((x + shift) / brickWidth) * 5.1, 64);
                if (isMortar) {
                    const value = 120 + grain * 22;
                    writePixel(pixels, offset, value, value * 0.98, value * 0.94);
                    height[index] = -0.75 + grain * 0.2;
                } else {
                    const base = 96 + variation * 46;
                    writePixel(pixels, offset, base + grain * 20, base * 0.52 + grain * 14, base * 0.42 + grain * 12);
                    height[index] = 0.45 + grain * 0.4;
                }
            }
        }
    },

    plaster(pixels, height, size) {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const grain = fbm(x / 2.2, y / 2.2, 2, size / 2.2);
                const blotch = fbm(x / 30, y / 30, 2, size / 30);
                const value = 150 + grain * 28 + blotch * 22;
                writePixel(pixels, offset, value, value * 0.985, value * 0.95);
                height[index] = grain * 0.5 + blotch * 0.2;
            }
        }
    },

    grass(pixels, height, size) {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const blades = fbm(x / 1.6, y / 1.6, 2, size / 1.6);
                const clump = fbm(x / 22, y / 22, 2, size / 22);
                const dry = fbm(x / 58, y / 58, 2, size / 58);
                const green = 62 + clump * 44 + blades * 26;
                writePixel(
                    pixels,
                    offset,
                    green * (0.42 + dry * 0.34),
                    green * (0.82 + clump * 0.16),
                    green * (0.3 + dry * 0.12)
                );
                height[index] = blades * 0.6 + clump * 0.4;
            }
        }
    },

    dirt(pixels, height, size) {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const grain = fbm(x / 2.4, y / 2.4, 2, size / 2.4);
                const patch = fbm(x / 26, y / 26, 2, size / 26);
                const value = 78 + grain * 34 + patch * 26;
                writePixel(pixels, offset, value * 1.06, value * 0.82, value * 0.6);
                height[index] = grain * 0.55 + patch * 0.45;
            }
        }
    },

    roofGravel(pixels, height, size) {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const stones = fbm(x / 2, y / 2, 2, size / 2);
                const stain = fbm(x / 36, y / 36, 2, size / 36);
                const value = 64 + stones * 44 - stain * 16;
                writePixel(pixels, offset, value * 1.02, value * 0.99, value * 0.93);
                height[index] = stones;
            }
        }
    },

    shingle(pixels, height, size) {
        const rowHeight = size / 12;
        const tabWidth = size / 6;
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const row = Math.floor(y / rowHeight);
                const shift = (row % 2) * tabWidth * 0.5;
                const localY = y % rowHeight;
                const localX = (x + shift) % tabWidth;
                const edge = localY < 1.5 || localX < 1.2;
                const grain = fbm(x / 2.6, y / 2.6, 2, size / 2.6);
                const variation = noise(row * 2.3, Math.floor((x + shift) / tabWidth) * 4.7, 64);
                const value = 52 + variation * 26 + grain * 22 - (edge ? 24 : 0);
                writePixel(pixels, offset, value * 0.98, value, value * 1.06);
                height[index] = (edge ? -0.6 : 0.4) + grain * 0.3;
            }
        }
    },

    bark(pixels, height, size) {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const ridge = Math.abs(fbm(x / 3.4, y / 22, 2, size / 3.4) - 0.5) * 2;
                const grain = fbm(x / 1.8, y / 6, 2, size / 1.8);
                const value = 52 + (1 - ridge) * 40 + grain * 18;
                writePixel(pixels, offset, value * 1.05, value * 0.88, value * 0.7);
                height[index] = (1 - ridge) * 0.8 + grain * 0.2;
            }
        }
    },

    foliage(pixels, height, size) {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const leaves = fbm(x / 2.8, y / 2.8, 2, size / 2.8);
                const depth = fbm(x / 12, y / 12, 2, size / 12);
                const value = 40 + leaves * 52 + depth * 34;
                writePixel(pixels, offset, value * (0.36 + leaves * 0.3), value * 0.94, value * (0.3 + depth * 0.2));
                height[index] = leaves * 0.7 + depth * 0.3;
            }
        }
    },

    fabric(pixels, height, size) {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const weave = (Math.sin(x * 1.9) * Math.sin(y * 1.9) + 1) * 0.5;
                const fuzz = fbm(x / 2, y / 2, 2, size / 2);
                const value = 176 + weave * 34 + fuzz * 28;
                writePixel(pixels, offset, value, value, value);
                height[index] = weave * 0.5 + fuzz * 0.5;
            }
        }
    },

    skin(pixels, height, size) {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const pores = fbm(x / 1.5, y / 1.5, 2, size / 1.5);
                const tone = fbm(x / 24, y / 24, 2, size / 24);
                const value = 210 + pores * 22 + tone * 18;
                writePixel(pixels, offset, value, value * 0.94, value * 0.9);
                height[index] = pores * 0.6;
            }
        }
    },

    courtPaint(pixels, height, size) {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const grit = fbm(x / 2.6, y / 2.6, 2, size / 2.6);
                const wear = fbm(x / 30, y / 30, 2, size / 30);
                const value = 62 + grit * 22 + wear * 20;
                writePixel(pixels, offset, value * 1.24, value * 0.92, value * 0.74);
                height[index] = grit * 0.6 + wear * 0.2;
            }
        }
    },

    metal(pixels, height, size) {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const brushed = fbm(x / 1.4, y / 30, 2, size / 1.4);
                const rust = Math.max(0, fbm(x / 28, y / 28, 2, size / 28) - 0.62) * 3;
                const value = 132 + brushed * 40;
                writePixel(
                    pixels,
                    offset,
                    value * (1 - rust * 0.2) + rust * 60,
                    value * (1 - rust * 0.45) + rust * 26,
                    value * (1 - rust * 0.6) + rust * 12
                );
                height[index] = brushed * 0.4 + rust * 0.3;
            }
        }
    },

    water(pixels, height, size) {
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const index = y * size + x;
                const offset = index * 4;
                const ripple = fbm(x / 8, y / 8, 2, size / 8);
                const value = 30 + ripple * 24;
                writePixel(pixels, offset, value * 0.5, value * 0.95, value * 1.25);
                height[index] = ripple;
            }
        }
    }
};

const textureCache = new Map();

export function getTexture(name, options = {}) {
    const size = options.size || 256;
    const key = `${name}:${size}:${options.normals === false ? 0 : 1}`;
    if (!textureCache.has(key)) {
        textureCache.set(key, generate(size, generators[name], { ...options, repeat: 1 }));
    }
    const source = textureCache.get(key);
    const repeat = options.repeat || 1;
    if (repeat === 1) return source;
    const map = source.map.clone();
    map.repeat.set(repeat, repeat);
    const normalMap = source.normalMap ? source.normalMap.clone() : null;
    if (normalMap) normalMap.repeat.set(repeat, repeat);
    return { map, normalMap };
}

const materialCache = new Map();

function standard(key, build) {
    if (!materialCache.has(key)) materialCache.set(key, build());
    return materialCache.get(key);
}

/**
 * The shared material library. Roughness values are deliberately never 1.0
 * or 0.0 so every surface catches some environment light.
 */
export const materials = {
    asphalt() {
        return standard("asphalt", () => {
            const { map, normalMap } = getTexture("asphalt", { size: 256, repeat: 26, normalStrength: 1.6 });
            return new THREE.MeshStandardMaterial({
                map,
                normalMap,
                normalScale: new THREE.Vector2(0.85, 0.85),
                roughness: 0.93,
                metalness: 0.02,
                envMapIntensity: 0.45
            });
        });
    },

    sidewalk() {
        return standard("sidewalk", () => {
            const { map, normalMap } = getTexture("concrete", { size: 256, repeat: 18, normalStrength: 2.4 });
            return new THREE.MeshStandardMaterial({
                map,
                normalMap,
                normalScale: new THREE.Vector2(1, 1),
                roughness: 0.88,
                metalness: 0.01,
                envMapIntensity: 0.5
            });
        });
    },

    curb() {
        return standard("curb", () => {
            const { map, normalMap } = getTexture("concrete", { size: 256, repeat: 4, normalStrength: 1.6 });
            return new THREE.MeshStandardMaterial({ map, normalMap, roughness: 0.85, color: 0xd8d5cd });
        });
    },

    concreteWall(color = 0xb9b5ab) {
        return standard(`concreteWall:${color}`, () => {
            const { map, normalMap } = getTexture("concrete", { size: 256, repeat: 6, normalStrength: 1.4 });
            return new THREE.MeshStandardMaterial({ map, normalMap, color, roughness: 0.82, envMapIntensity: 0.6 });
        });
    },

    brick(color = 0xffffff) {
        return standard(`brick:${color}`, () => {
            const { map, normalMap } = getTexture("brick", { size: 256, repeat: 5, normalStrength: 3 });
            return new THREE.MeshStandardMaterial({
                map,
                normalMap,
                color,
                normalScale: new THREE.Vector2(1.3, 1.3),
                roughness: 0.9,
                envMapIntensity: 0.5
            });
        });
    },

    plaster(color = 0xffffff) {
        return standard(`plaster:${color}`, () => {
            const { map, normalMap } = getTexture("plaster", { size: 128, repeat: 4, normalStrength: 1.2 });
            return new THREE.MeshStandardMaterial({ map, normalMap, color, roughness: 0.86, envMapIntensity: 0.55 });
        });
    },

    grass() {
        return standard("grass", () => {
            const { map, normalMap } = getTexture("grass", { size: 256, repeat: 30, normalStrength: 1.1 });
            return new THREE.MeshStandardMaterial({
                map,
                normalMap,
                roughness: 0.96,
                metalness: 0,
                envMapIntensity: 0.4
            });
        });
    },

    dirt() {
        return standard("dirt", () => {
            const { map } = getTexture("dirt", { size: 128, repeat: 12, normals: false });
            return new THREE.MeshStandardMaterial({ map, roughness: 0.97 });
        });
    },

    roofGravel() {
        return standard("roofGravel", () => {
            const { map } = getTexture("roofGravel", { size: 128, repeat: 8, normals: false });
            return new THREE.MeshStandardMaterial({ map, roughness: 0.95, envMapIntensity: 0.4 });
        });
    },

    shingle(color = 0xffffff) {
        return standard(`shingle:${color}`, () => {
            const { map, normalMap } = getTexture("shingle", { size: 128, repeat: 6, normalStrength: 2.2 });
            return new THREE.MeshStandardMaterial({ map, normalMap, color, roughness: 0.88 });
        });
    },

    bark() {
        return standard("bark", () => {
            const { map, normalMap } = getTexture("bark", { size: 128, repeat: 3, normalStrength: 2.6 });
            return new THREE.MeshStandardMaterial({ map, normalMap, roughness: 0.94 });
        });
    },

    foliage(color = 0xffffff) {
        return standard(`foliage:${color}`, () => {
            const { map, normalMap } = getTexture("foliage", { size: 128, repeat: 2, normalStrength: 1.8 });
            return new THREE.MeshStandardMaterial({
                map,
                normalMap,
                color,
                roughness: 0.9,
                envMapIntensity: 0.55,
                flatShading: false
            });
        });
    },

    glass(tint = 0x14202b) {
        return standard(`glass:${tint}`, () => new THREE.MeshStandardMaterial({
            color: tint,
            roughness: 0.06,
            metalness: 0.72,
            envMapIntensity: 1.9
        }));
    },

    litWindow() {
        return standard("litWindow", () => new THREE.MeshStandardMaterial({
            color: 0x181410,
            emissive: 0xffc98a,
            emissiveIntensity: 1,
            roughness: 0.35,
            metalness: 0.1,
            transparent: true,
            opacity: 1
        }));
    },

    carPaint(color) {
        return new THREE.MeshStandardMaterial({
            color,
            roughness: 0.28,
            metalness: 0.86,
            envMapIntensity: 1.6
        });
    },

    carGlass() {
        return standard("carGlass", () => new THREE.MeshStandardMaterial({
            color: 0x0a1014,
            roughness: 0.05,
            metalness: 0.9,
            envMapIntensity: 2.2
        }));
    },

    tyre() {
        return standard("tyre", () => new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.95 }));
    },

    chrome() {
        return standard("chrome", () => new THREE.MeshStandardMaterial({
            color: 0xc9ced4,
            roughness: 0.18,
            metalness: 1,
            envMapIntensity: 1.8
        }));
    },

    metal(color = 0xffffff) {
        return standard(`metal:${color}`, () => {
            const { map, normalMap } = getTexture("metal", { size: 128, repeat: 4, normalStrength: 1.4 });
            return new THREE.MeshStandardMaterial({
                map,
                normalMap,
                color,
                roughness: 0.52,
                metalness: 0.78,
                envMapIntensity: 1.1
            });
        });
    },

    paintedMetal(color) {
        return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.35, envMapIntensity: 0.9 });
    },

    court() {
        return standard("court", () => {
            const { map, normalMap } = getTexture("courtPaint", { size: 256, repeat: 8, normalStrength: 1.2 });
            return new THREE.MeshStandardMaterial({ map, normalMap, roughness: 0.72, envMapIntensity: 0.7 });
        });
    },

    courtLine() {
        return standard("courtLine", () => new THREE.MeshStandardMaterial({
            color: 0xf2efe6,
            roughness: 0.66,
            envMapIntensity: 0.7
        }));
    },

    fabric(color) {
        return standard(`fabric:${color}`, () => {
            const { map, normalMap } = getTexture("fabric", { size: 128, repeat: 3, normalStrength: 0.9 });
            return new THREE.MeshStandardMaterial({ map, normalMap, color, roughness: 0.84, envMapIntensity: 0.5 });
        });
    },

    denim(color = 0x3d4a63) {
        return standard(`denim:${color}`, () => {
            const { map, normalMap } = getTexture("fabric", { size: 128, repeat: 5, normalStrength: 1.2 });
            return new THREE.MeshStandardMaterial({ map, normalMap, color, roughness: 0.9 });
        });
    },

    skin(color) {
        return standard(`skin:${color}`, () => {
            const { map, normalMap } = getTexture("skin", { size: 128, repeat: 1, normalStrength: 0.5 });
            return new THREE.MeshStandardMaterial({
                map,
                normalMap,
                color,
                roughness: 0.62,
                metalness: 0,
                envMapIntensity: 0.7
            });
        });
    },

    hair(color) {
        return standard(`hair:${color}`, () => new THREE.MeshStandardMaterial({
            color,
            roughness: 0.48,
            metalness: 0.12,
            envMapIntensity: 0.8
        }));
    },

    rubber(color = 0xd0663a) {
        return standard(`rubber:${color}`, () => new THREE.MeshStandardMaterial({
            color,
            roughness: 0.78,
            metalness: 0.02
        }));
    },

    water() {
        return standard("water", () => {
            const { map } = getTexture("water", { size: 128, repeat: 6, normals: false });
            return new THREE.MeshStandardMaterial({
                map,
                color: 0x24506b,
                roughness: 0.08,
                metalness: 0.5,
                envMapIntensity: 1.7,
                transparent: true,
                opacity: 0.92
            });
        });
    },

    emissive(color, intensity = 1) {
        return new THREE.MeshStandardMaterial({
            color: 0x0b0b0b,
            emissive: color,
            emissiveIntensity: intensity,
            roughness: 0.4
        });
    }
};

/** Applies the scene environment map to every cached material. */
export function applyEnvironment(envMap) {
    for (const material of materialCache.values()) {
        material.envMap = envMap;
        material.needsUpdate = true;
    }
}

/**
 * Rain wets the world: roads and pavement get darker and much smoother so
 * they mirror the sky and headlights.
 */
export function setWetness(amount) {
    const wet = Math.max(0, Math.min(1, amount));
    const road = materialCache.get("asphalt");
    if (road) {
        road.roughness = 0.93 - wet * 0.66;
        road.envMapIntensity = 0.45 + wet * 1.5;
        road.color.setScalar(1 - wet * 0.42);
    }
    const walk = materialCache.get("sidewalk");
    if (walk) {
        walk.roughness = 0.88 - wet * 0.55;
        walk.envMapIntensity = 0.5 + wet * 1.2;
        walk.color.setScalar(1 - wet * 0.34);
    }
    const court = materialCache.get("court");
    if (court) {
        court.roughness = 0.72 - wet * 0.45;
        court.envMapIntensity = 0.7 + wet * 1.1;
        court.color.setScalar(1 - wet * 0.3);
    }
}

/** Night turns interior lights on. */
export function setWindowGlow(amount) {
    const lit = materialCache.get("litWindow");
    if (lit) {
        lit.emissiveIntensity = amount * 1.35;
        lit.opacity = Math.min(1, 0.15 + amount);
        lit.visible = amount > 0.02;
    }
}
