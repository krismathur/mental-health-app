/**
 * Atmosphere, lighting, weather and the post-processing chain.
 *
 * The sky is a shader dome driven by a time-of-day clock. The same clock
 * moves the sun, recolours the fog, fades the stars and switches street
 * lighting, so one number controls the entire mood of the city.
 */
import * as THREE from "./vendor/three.module.js";
import { setWetness, setWindowGlow, applyEnvironment } from "./materials.js";

const SKY_VERTEX = /* glsl */`
    varying vec3 vWorldDirection;
    void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldDirection = normalize(worldPosition.xyz - cameraPosition);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w;
    }
`;

const SKY_FRAGMENT = /* glsl */`
    precision highp float;
    varying vec3 vWorldDirection;

    uniform vec3 uSunDirection;
    uniform vec3 uZenith;
    uniform vec3 uHorizon;
    uniform vec3 uGround;
    uniform vec3 uSunColor;
    uniform float uSunIntensity;
    uniform float uStarStrength;
    uniform float uCloudCover;
    uniform float uCloudDarkness;
    uniform float uTime;
    uniform float uFlash;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
        );
    }

    float fbm(vec2 p) {
        float total = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
            total += valueNoise(p) * amplitude;
            p *= 2.03;
            amplitude *= 0.5;
        }
        return total;
    }

    void main() {
        vec3 direction = normalize(vWorldDirection);
        float height = direction.y;

        // Base gradient: ground haze below, horizon band, zenith above.
        float horizonBlend = pow(clamp(1.0 - abs(height), 0.0, 1.0), 2.4);
        vec3 sky = mix(uZenith, uHorizon, horizonBlend);
        sky = mix(sky, uGround, smoothstep(0.0, -0.14, height));

        // Sun disc plus wide atmospheric scatter around it.
        float sunAngle = max(dot(direction, uSunDirection), 0.0);
        float disc = smoothstep(0.9985, 0.9995, sunAngle);
        float glow = pow(sunAngle, 220.0) * 0.6 + pow(sunAngle, 12.0) * 0.28 + pow(sunAngle, 3.0) * 0.08;
        sky += uSunColor * glow * uSunIntensity;

        // Stars, only in the upper hemisphere and only after dusk.
        if (uStarStrength > 0.001 && height > 0.0) {
            vec2 starCoord = direction.xz / max(height + 0.35, 0.05) * 34.0;
            float star = hash(floor(starCoord));
            float twinkle = 0.7 + 0.3 * sin(uTime * 2.4 + star * 90.0);
            float brightness = smoothstep(0.9955, 0.9995, star) * twinkle;
            sky += vec3(0.82, 0.87, 1.0) * brightness * uStarStrength * smoothstep(0.0, 0.25, height);
        }

        // Clouds projected onto the dome, drifting with the wind.
        if (uCloudCover > 0.001 && height > -0.03) {
            vec2 cloudCoord = direction.xz / max(height + 0.22, 0.04) * 1.1;
            cloudCoord += vec2(uTime * 0.006, uTime * 0.0022);
            float shape = fbm(cloudCoord);
            float detail = fbm(cloudCoord * 3.1 + 4.0) * 0.35;
            float density = smoothstep(0.62 - uCloudCover * 0.5, 0.92 - uCloudCover * 0.28, shape + detail);
            density *= smoothstep(-0.03, 0.16, height);
            vec3 sunlitEdge = mix(vec3(0.5), uSunColor, 0.55) * (0.55 + glow * 2.0);
            vec3 cloudColor = mix(sunlitEdge, vec3(0.16, 0.17, 0.2), uCloudDarkness);
            sky = mix(sky, cloudColor, density * 0.94);
        }

        sky += vec3(0.6, 0.68, 0.85) * uFlash;
        gl_FragColor = vec4(sky, 1.0);
    }
`;

const POST_VERTEX = /* glsl */`
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;

const POST_FRAGMENT = /* glsl */`
    precision highp float;
    varying vec2 vUv;

    uniform sampler2D uScene;
    uniform sampler2D uDepth;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uFocusRange;
    uniform float uBlurAmount;
    uniform float uNear;
    uniform float uFar;
    uniform vec3 uLift;
    uniform vec3 uGain;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uFlash;
    uniform float uExposure;
    uniform float uAoStrength;
    uniform float uAoRadius;
    uniform float uProjScale;

    float linearDepth(vec2 uv) {
        float raw = texture2D(uDepth, uv).x;
        float ndc = raw * 2.0 - 1.0;
        return (2.0 * uNear * uFar) / (uFar + uNear - ndc * (uFar - uNear));
    }

    /*
     * Depth-difference ambient occlusion. Not a physically correct SSAO, but it
     * puts contact shadows where surfaces meet, which is the single biggest cue
     * separating "3D shapes floating in light" from a photograph.
     */
    float ambientOcclusion(vec2 uv, float depth) {
        if (uAoStrength <= 0.001 || depth > 120.0) return 1.0;

        float radius = uAoRadius * uProjScale / depth;
        radius = min(radius, 0.06);
        float angle = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
        float occlusion = 0.0;

        for (int i = 0; i < 8; i += 1) {
            float ring = (float(i) + 0.5) / 8.0;
            float theta = angle + ring * 6.2831 * 2.4;
            vec2 offset = vec2(cos(theta), sin(theta)) * radius * sqrt(ring);
            // uProjScale is in vertical-FOV units, so the horizontal sample has to
            // shrink by the aspect ratio or the kernel comes out stretched.
            offset.x /= uResolution.x / uResolution.y;
            float sampled = linearDepth(uv + offset);
            float difference = depth - sampled;
            // Only count occluders that are in front, and ignore far-off geometry
            // so silhouettes against the sky do not grow dark halos.
            float valid = step(0.02, difference) * (1.0 - smoothstep(uAoRadius, uAoRadius * 2.2, difference));
            occlusion += valid;
        }

        return clamp(1.0 - (occlusion / 8.0) * uAoStrength, 0.0, 1.0);
    }

    // Three.js skips tone mapping and the sRGB encode when a pass targets a
    // render target, so the post chain has to finish the job itself.
    vec3 acesFilmic(vec3 color) {
        const mat3 inputMatrix = mat3(
            0.59719, 0.07600, 0.02840,
            0.35458, 0.90834, 0.13383,
            0.04823, 0.01566, 0.83777
        );
        const mat3 outputMatrix = mat3(
            1.60475, -0.10208, -0.00327,
            -0.53108, 1.10813, -0.07276,
            -0.07367, -0.00605, 1.07602
        );
        vec3 v = inputMatrix * color;
        vec3 a = v * (v + 0.0245786) - 0.000090537;
        vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
        return clamp(outputMatrix * (a / b), 0.0, 1.0);
    }

    vec3 encodeSRGB(vec3 color) {
        return mix(
            pow(color, vec3(0.41666)) * 1.055 - 0.055,
            color * 12.92,
            vec3(lessThanEqual(color, vec3(0.0031308)))
        );
    }

    void main() {
        vec3 color = texture2D(uScene, vUv).rgb;
        float sceneDepth = linearDepth(vUv);

        color *= ambientOcclusion(vUv, sceneDepth);

        // Depth of field, used for cinematic beats only.
        if (uBlurAmount > 0.001) {
            float depth = sceneDepth;
            float coc = clamp(abs(depth - uFocusRange) / uFocusRange, 0.0, 1.0) * uBlurAmount;
            if (coc > 0.002) {
                vec2 texel = coc * 4.0 / uResolution;
                vec3 blurred = color;
                blurred += texture2D(uScene, vUv + vec2(texel.x, 0.0)).rgb;
                blurred += texture2D(uScene, vUv - vec2(texel.x, 0.0)).rgb;
                blurred += texture2D(uScene, vUv + vec2(0.0, texel.y)).rgb;
                blurred += texture2D(uScene, vUv - vec2(0.0, texel.y)).rgb;
                blurred += texture2D(uScene, vUv + texel * 0.7).rgb;
                blurred += texture2D(uScene, vUv - texel * 0.7).rgb;
                blurred += texture2D(uScene, vUv + vec2(texel.x, -texel.y) * 0.7).rgb;
                blurred += texture2D(uScene, vUv + vec2(-texel.x, texel.y) * 0.7).rgb;
                color = mix(color, blurred / 9.0, clamp(coc, 0.0, 1.0));
            }
        }

        // The 0.6 divisor matches three's own ACES pass, which the render target
        // path skips; without it the whole frame lands a stop and a half down.
        color = encodeSRGB(acesFilmic(color * (uExposure / 0.6)));

        // Film grade in display space so the contrast pivot sits on mid grey.
        color = color + uLift * (1.0 - color);
        color *= uGain;
        color = (color - 0.5) * uContrast + 0.5;
        float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
        color = mix(vec3(luma), color, uSaturation);
        color += uFlash * 0.35;

        // Vignette and animated grain keep it from looking sterile.
        vec2 centered = vUv - 0.5;
        float vignette = 1.0 - dot(centered, centered) * uVignette;
        color *= clamp(vignette, 0.0, 1.0);

        float grain = fract(sin(dot(vUv * uResolution + uTime, vec2(12.9898, 78.233))) * 43758.5453);
        color += (grain - 0.5) * uGrain;

        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
`;

const SUNRISE = 5.6;
const SUNSET = 20.2;

/** Keyframed atmosphere for each hour band. Colours are linear-space friendly. */
const TIME_KEYS = [
    { hour: 0, zenith: 0x05070f, horizon: 0x0d1220, ground: 0x080a10, sun: 0x2a3550, intensity: 0.06, ambient: 0.11 },
    { hour: 5, zenith: 0x0d1626, horizon: 0x35304a, ground: 0x14161e, sun: 0x6a5a72, intensity: 0.16, ambient: 0.2 },
    { hour: 6.5, zenith: 0x2c4f80, horizon: 0xd9895a, ground: 0x4a3b34, sun: 0xffb98a, intensity: 1.5, ambient: 0.45 },
    { hour: 9, zenith: 0x4d86c4, horizon: 0xbcd0e0, ground: 0x6f7472, sun: 0xffe3bd, intensity: 3.1, ambient: 0.72 },
    { hour: 13, zenith: 0x3f7fc8, horizon: 0xc6d8e6, ground: 0x77796f, sun: 0xfff6e4, intensity: 3.5, ambient: 0.85 },
    { hour: 17, zenith: 0x4a80bd, horizon: 0xdcc4a4, ground: 0x6d6a5e, sun: 0xffd9a0, intensity: 2.6, ambient: 0.66 },
    { hour: 18.8, zenith: 0x2f4c7d, horizon: 0xe8935a, ground: 0x4a3a30, sun: 0xffad78, intensity: 1.7, ambient: 0.42 },
    { hour: 20, zenith: 0x14203c, horizon: 0x5c4260, ground: 0x1d1c24, sun: 0x8a5a70, intensity: 0.4, ambient: 0.22 },
    { hour: 21.5, zenith: 0x070b18, horizon: 0x151a2c, ground: 0x0a0c12, sun: 0x33405e, intensity: 0.09, ambient: 0.13 },
    { hour: 24, zenith: 0x05070f, horizon: 0x0d1220, ground: 0x080a10, sun: 0x2a3550, intensity: 0.06, ambient: 0.11 }
];

export const WEATHER_TYPES = {
    clear: { cloudCover: 0.34, cloudDark: 0.09, fog: 0.0016, rain: 0, wind: 0.25, wetness: 0, light: 1 },
    cloudy: { cloudCover: 0.62, cloudDark: 0.32, fog: 0.0028, rain: 0, wind: 0.5, wetness: 0.05, light: 0.78 },
    rain: { cloudCover: 0.82, cloudDark: 0.6, fog: 0.0052, rain: 0.55, wind: 0.7, wetness: 0.8, light: 0.55 },
    storm: { cloudCover: 0.95, cloudDark: 0.8, fog: 0.0078, rain: 1, wind: 1, wetness: 1, light: 0.4 },
    fog: { cloudCover: 0.5, cloudDark: 0.25, fog: 0.021, rain: 0, wind: 0.15, wetness: 0.2, light: 0.66 }
};

function lerpColor(target, a, b, t) {
    target.setHex(a);
    const other = new THREE.Color(b);
    target.lerp(other, t);
    return target;
}

function sampleTime(hour) {
    let previous = TIME_KEYS[0];
    let next = TIME_KEYS[TIME_KEYS.length - 1];
    for (let index = 0; index < TIME_KEYS.length - 1; index += 1) {
        if (hour >= TIME_KEYS[index].hour && hour <= TIME_KEYS[index + 1].hour) {
            previous = TIME_KEYS[index];
            next = TIME_KEYS[index + 1];
            break;
        }
    }
    const span = next.hour - previous.hour || 1;
    const t = Math.max(0, Math.min(1, (hour - previous.hour) / span));
    return { previous, next, t };
}

export class SkySystem {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.hour = 8.5;
        this.weather = "clear";
        this.weatherBlend = { ...WEATHER_TYPES.clear };
        this.targetWeather = { ...WEATHER_TYPES.clear };
        this.flash = 0;
        this.lightningTimer = 14;
        this.envTimer = 0;
        this.envHour = -99;
        this.envCloud = -99;
        this.envDirty = true;
        this.envEnabled = false;
        this.shadowFocus = new THREE.Vector3();
        this.baseExposure = renderer.toneMappingExposure;
        this.onThunder = null;

        this.uniforms = {
            uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
            uZenith: { value: new THREE.Color(0x3f7fc8) },
            uHorizon: { value: new THREE.Color(0xc6d8e6) },
            uGround: { value: new THREE.Color(0x77796f) },
            uSunColor: { value: new THREE.Color(0xfff6e4) },
            uSunIntensity: { value: 1 },
            uStarStrength: { value: 0 },
            uCloudCover: { value: 0.16 },
            uCloudDarkness: { value: 0.05 },
            uTime: { value: 0 },
            uFlash: { value: 0 }
        };

        this.dome = new THREE.Mesh(
            new THREE.SphereGeometry(1, 32, 16),
            new THREE.ShaderMaterial({
                vertexShader: SKY_VERTEX,
                fragmentShader: SKY_FRAGMENT,
                uniforms: this.uniforms,
                side: THREE.BackSide,
                depthWrite: false,
                fog: false
            })
        );
        this.dome.frustumCulled = false;
        this.dome.renderOrder = -1000;
        scene.add(this.dome);

        this.sun = new THREE.DirectionalLight(0xffffff, 3);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(1024, 1024);
        this.sun.shadow.camera.near = 1;
        this.sun.shadow.camera.far = 240;
        this.sun.shadow.camera.left = -55;
        this.sun.shadow.camera.right = 55;
        this.sun.shadow.camera.top = 55;
        this.sun.shadow.camera.bottom = -55;
        this.sun.shadow.camera.updateProjectionMatrix();
        this.sun.shadow.bias = -0.0004;
        this.sun.shadow.normalBias = 0.05;
        scene.add(this.sun, this.sun.target);

        this.bounce = new THREE.HemisphereLight(0x9dbde0, 0x4a4438, 0.8);
        scene.add(this.bounce);

        this.fill = new THREE.AmbientLight(0xffffff, 0.12);
        scene.add(this.fill);

        scene.fog = new THREE.FogExp2(0xc6d8e6, 0.0016);

        this.pmrem = new THREE.PMREMGenerator(renderer);
        this.envScene = new THREE.Scene();
        this.envDome = new THREE.Mesh(this.dome.geometry, this.dome.material);
        this.envDome.scale.setScalar(80);
        this.envScene.add(this.envDome);
        this.environment = null;

        this.buildRain();
    }

    buildRain() {
        const count = 2800;
        const positions = new Float32Array(count * 3);
        const speeds = new Float32Array(count);
        for (let index = 0; index < count; index += 1) {
            positions[index * 3] = (Math.random() - 0.5) * 90;
            positions[index * 3 + 1] = Math.random() * 42;
            positions[index * 3 + 2] = (Math.random() - 0.5) * 90;
            speeds[index] = 0.7 + Math.random() * 0.6;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));

        this.rainUniforms = {
            uTime: { value: 0 },
            uOrigin: { value: new THREE.Vector3() },
            uOpacity: { value: 0 },
            uWind: { value: new THREE.Vector2(0.8, 0.2) }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.rainUniforms,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexShader: /* glsl */`
                attribute float aSpeed;
                uniform float uTime;
                uniform vec3 uOrigin;
                uniform vec2 uWind;
                varying float vFade;
                void main() {
                    vec3 pos = position;
                    float fall = mod(pos.y - uTime * (26.0 * aSpeed), 42.0);
                    pos.y = fall;
                    pos.x += uWind.x * (42.0 - fall) * 0.16;
                    pos.z += uWind.y * (42.0 - fall) * 0.16;
                    pos.x = mod(pos.x + uOrigin.x + 45.0, 90.0) - 45.0 + uOrigin.x;
                    pos.z = mod(pos.z + uOrigin.z + 45.0, 90.0) - 45.0 + uOrigin.z;
                    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
                    vFade = clamp(1.0 - length(mv.xyz) / 60.0, 0.0, 1.0);
                    gl_Position = projectionMatrix * mv;
                    gl_PointSize = max(1.4, 4.5 / max(-mv.z, 1.0) * 12.0);
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uOpacity;
                varying float vFade;
                void main() {
                    vec2 coord = gl_PointCoord - 0.5;
                    float streak = smoothstep(0.5, 0.0, abs(coord.x) * 3.4 + abs(coord.y) * 0.6);
                    gl_FragColor = vec4(vec3(0.68, 0.76, 0.86), streak * vFade * uOpacity * 0.5);
                }
            `
        });

        this.rain = new THREE.Points(geometry, material);
        this.rain.frustumCulled = false;
        this.rain.visible = false;
        this.scene.add(this.rain);
    }

    setTime(hour) {
        this.hour = ((hour % 24) + 24) % 24;
        this.envDirty = true;
    }

    setWeather(name) {
        if (!WEATHER_TYPES[name]) return;
        this.weather = name;
        this.targetWeather = WEATHER_TYPES[name];
        this.envDirty = true;
    }

    get nightFactor() {
        const { previous, next, t } = sampleTime(this.hour);
        const intensity = previous.intensity + (next.intensity - previous.intensity) * t;
        return Math.max(0, Math.min(1, 1 - intensity / 1.6));
    }

    update(dt, focus) {
        // Ease weather so transitions read as a front moving in.
        const speed = Math.min(1, dt * 0.35);
        for (const key of Object.keys(this.targetWeather)) {
            this.weatherBlend[key] += (this.targetWeather[key] - this.weatherBlend[key]) * speed;
        }

        const { previous, next, t } = sampleTime(this.hour);
        const weatherLight = this.weatherBlend.light;

        lerpColor(this.uniforms.uZenith.value, previous.zenith, next.zenith, t);
        lerpColor(this.uniforms.uHorizon.value, previous.horizon, next.horizon, t);
        lerpColor(this.uniforms.uGround.value, previous.ground, next.ground, t);
        lerpColor(this.uniforms.uSunColor.value, previous.sun, next.sun, t);

        const intensity = previous.intensity + (next.intensity - previous.intensity) * t;
        const ambient = previous.ambient + (next.ambient - previous.ambient) * t;

        // Sun arc: rises in the east, sets in the west, tilted for long shadows.
        // The span has to match TIME_KEYS or golden hour lands after sundown.
        const dayAngle = ((this.hour - SUNRISE) / (SUNSET - SUNRISE)) * Math.PI;
        const elevation = Math.sin(dayAngle);
        const direction = new THREE.Vector3(
            Math.cos(dayAngle),
            Math.max(elevation, -0.35),
            Math.sin(dayAngle) * 0.42 - 0.25
        ).normalize();
        const belowHorizon = elevation <= 0.02;
        const bodyDirection = belowHorizon ? direction.clone().negate() : direction;

        this.uniforms.uSunDirection.value.copy(bodyDirection);
        this.uniforms.uSunIntensity.value = belowHorizon ? 0.25 : 1;
        this.uniforms.uCloudCover.value = this.weatherBlend.cloudCover;
        this.uniforms.uCloudDarkness.value = this.weatherBlend.cloudDark;
        this.uniforms.uStarStrength.value = Math.max(0, this.nightFactor - 0.35) * 1.6 * (1 - this.weatherBlend.cloudCover * 0.85);
        this.uniforms.uTime.value += dt;
        this.uniforms.uFlash.value = this.flash;

        this.sun.color.copy(this.uniforms.uSunColor.value);
        this.sun.intensity = intensity * weatherLight;
        if (belowHorizon) {
            // Moonlight: cool, soft, still casts a readable shadow.
            this.sun.color.setHex(0xa8bee8);
            this.sun.intensity = 0.9 * weatherLight;
        }
        // Snap the shadow focus to whole texels, otherwise the map crawls as the
        // player walks and every edge shimmers.
        const texel = (this.sun.shadow.camera.right - this.sun.shadow.camera.left)
            / this.sun.shadow.mapSize.x;
        this.shadowFocus.set(
            Math.round(focus.x / texel) * texel,
            0,
            Math.round(focus.z / texel) * texel
        );
        this.sun.position.copy(bodyDirection).multiplyScalar(110).add(this.shadowFocus);
        this.sun.target.position.copy(this.shadowFocus);
        this.sun.target.updateMatrixWorld();

        // Skylight comes from the zenith, not the horizon. Using the horizon made
        // golden-hour shade orange when real shade at sundown is blue.
        this.bounce.intensity = (0.55 + ambient * 1.25) * weatherLight;
        this.bounce.color.copy(this.uniforms.uZenith.value).lerp(this.uniforms.uHorizon.value, 0.3);
        this.bounce.groundColor.setHex(belowHorizon ? 0x1b1f2b : 0x5a5142);
        this.fill.intensity = 0.1 + ambient * 0.22 + this.flash * 2;

        this.scene.fog.color.copy(this.uniforms.uHorizon.value).lerp(this.uniforms.uZenith.value, 0.25);
        this.scene.fog.density = this.weatherBlend.fog;

        setWetness(this.weatherBlend.wetness);
        setWindowGlow(Math.max(0, this.nightFactor * 1.25 - 0.18));

        // Eyes adapt to darkness, and so should the camera; without this the night
        // and storm states crush to black even though the lights are working.
        const night = this.nightFactor;
        const adapted = this.baseExposure * (1 + night * 1.15 + (1 - weatherLight) * 0.5);
        this.renderer.toneMappingExposure += (adapted - this.renderer.toneMappingExposure)
            * Math.min(1, dt * 1.5);

        this.dome.position.copy(focus);
        this.dome.scale.setScalar(600);

        // Rain
        const rainAmount = this.weatherBlend.rain;
        this.rain.visible = rainAmount > 0.02;
        if (this.rain.visible) {
            this.rainUniforms.uTime.value += dt;
            this.rainUniforms.uOpacity.value = rainAmount;
            this.rainUniforms.uOrigin.value.copy(focus);
            this.rainUniforms.uWind.value.set(this.weatherBlend.wind, this.weatherBlend.wind * 0.3);
            this.rain.position.set(focus.x, 0, focus.z);
        }

        // Lightning during storms.
        this.flash = Math.max(0, this.flash - dt * 3.4);
        if (this.weather === "storm") {
            this.lightningTimer -= dt;
            if (this.lightningTimer <= 0) {
                this.lightningTimer = 7 + Math.random() * 12;
                this.flash = 0.85;
                if (this.onThunder) this.onThunder();
            }
        }

        // The env map only matters when the light actually changed, and the PMREM
        // convolution is far too expensive to run on a fixed timer.
        this.envTimer = Math.max(0, this.envTimer - dt);
        const sunMoved = Math.abs(this.hour - this.envHour) > 0.12;
        const skyChanged = Math.abs(this.weatherBlend.cloudCover - this.envCloud) > 0.06;
        if (this.envEnabled && this.envTimer === 0 && (sunMoved || skyChanged || this.envDirty)) {
            this.envTimer = 0.35;
            this.refreshEnvironment();
        }
    }

    refreshEnvironment() {
        this.envEnabled = true;
        this.envHour = this.hour;
        this.envCloud = this.weatherBlend.cloudCover;
        this.envDirty = false;
        const previous = this.environment;
        const target = this.pmrem.fromScene(this.envScene);
        this.environment = target.texture;
        this.scene.environment = this.environment;
        applyEnvironment(this.environment);
        if (previous) previous.dispose();
    }

    dispose() {
        this.pmrem.dispose();
    }
}

export class PostProcessing {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.enabled = true;
        this.sceneCost = { calls: 0, triangles: 0 };

        const size = renderer.getDrawingBufferSize(new THREE.Vector2());
        const halfFloat = renderer.capabilities.isWebGL2
            || renderer.extensions.has("EXT_color_buffer_half_float");
        this.target = new THREE.WebGLRenderTarget(size.x, size.y, {
            type: halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
            depthBuffer: true
        });
        this.target.depthTexture = new THREE.DepthTexture(size.x, size.y);
        this.target.depthTexture.type = THREE.UnsignedShortType;

        this.uniforms = {
            uScene: { value: this.target.texture },
            uDepth: { value: this.target.depthTexture },
            uResolution: { value: new THREE.Vector2(size.x, size.y) },
            uTime: { value: 0 },
            uVignette: { value: 0.62 },
            uGrain: { value: 0.032 },
            uFocusRange: { value: 14 },
            uBlurAmount: { value: 0 },
            uNear: { value: camera.near },
            uFar: { value: camera.far },
            uLift: { value: new THREE.Vector3(0.036, 0.042, 0.062) },
            uGain: { value: new THREE.Vector3(1.03, 1.0, 0.97) },
            uSaturation: { value: 1.06 },
            uContrast: { value: 1.02 },
            uFlash: { value: 0 },
            uExposure: { value: renderer.toneMappingExposure },
            uAoStrength: { value: 0.62 },
            uAoRadius: { value: 0.85 },
            uProjScale: { value: 1 }
        };

        this.quad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.ShaderMaterial({
                vertexShader: POST_VERTEX,
                fragmentShader: POST_FRAGMENT,
                uniforms: this.uniforms,
                depthTest: false,
                depthWrite: false
            })
        );
        this.quad.frustumCulled = false;
        this.orthoScene = new THREE.Scene();
        this.orthoScene.add(this.quad);
        this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }

    setSize(width, height) {
        const pixelRatio = this.renderer.getPixelRatio();
        const w = Math.max(1, Math.floor(width * pixelRatio));
        const h = Math.max(1, Math.floor(height * pixelRatio));
        this.target.setSize(w, h);
        this.uniforms.uResolution.value.set(w, h);
    }

    /** AO is the most expensive thing in the chain, so low detail drops it. */
    setAmbientOcclusion(strength) {
        this.uniforms.uAoStrength.value = strength;
    }

    /** Cinematic focus pull, used when entering a location or a big moment. */
    setCinematic(amount) {
        this.uniforms.uBlurAmount.value = amount;
        this.uniforms.uVignette.value = 0.62 + amount * 0.5;
    }

    render(dt, flash = 0) {
        this.uniforms.uTime.value += dt;
        this.uniforms.uFlash.value = flash;
        this.uniforms.uExposure.value = this.renderer.toneMappingExposure;
        this.uniforms.uProjScale.value = 0.5 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
        if (!this.enabled) {
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.scene, this.camera);
            this.readSceneCost();
            return;
        }
        this.renderer.setRenderTarget(this.target);
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        this.readSceneCost();
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.orthoScene, this.orthoCamera);
    }

    /** The fullscreen pass resets renderer.info, so snapshot the world pass first. */
    readSceneCost() {
        this.sceneCost.calls = this.renderer.info.render.calls;
        this.sceneCost.triangles = this.renderer.info.render.triangles;
    }
}
