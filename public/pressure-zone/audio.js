/**
 * Procedural audio.
 *
 * Everything is synthesised with the Web Audio API, so the game ships with
 * no audio files and still gets surface-specific footsteps, an engine that
 * tracks revs, weather beds, a crowd that swells, and positional ambience
 * that changes as the player moves between districts.
 */
const AMBIENCE_ZONES = [
    { id: "downtown", x: 45, z: -34, radius: 70, traffic: 1, birds: 0.05, hum: 0.5 },
    { id: "park", x: -40, z: 36, radius: 55, traffic: 0.22, birds: 1, hum: 0.05 },
    { id: "residential", x: -110, z: 0, radius: 70, traffic: 0.3, birds: 0.6, hum: 0.08 },
    { id: "court", x: 45, z: 36, radius: 40, traffic: 0.35, birds: 0.35, hum: 0.1 },
    { id: "rail", x: 120, z: 36, radius: 55, traffic: 0.45, birds: 0.1, hum: 0.75 }
];

const FOOTSTEP_PROFILES = {
    road: { frequency: 1600, decay: 0.09, noise: 0.7, body: 0.24 },
    sidewalk: { frequency: 2400, decay: 0.075, noise: 0.62, body: 0.3 },
    grass: { frequency: 900, decay: 0.14, noise: 1, body: 0.08 },
    court: { frequency: 2900, decay: 0.1, noise: 0.5, body: 0.36 },
    dirt: { frequency: 700, decay: 0.13, noise: 0.95, body: 0.12 },
    interior: { frequency: 1300, decay: 0.11, noise: 0.45, body: 0.4 }
};

function createNoiseBuffer(context, seconds = 2) {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    return buffer;
}

export class AudioEngine {
    constructor() {
        this.context = null;
        this.enabled = true;
        this.started = false;
        this.masterVolume = 0.7;
        this.zoneLevels = { traffic: 0, birds: 0, hum: 0 };
    }

    /** Web Audio needs a user gesture, so start-up is deferred. */
    start() {
        if (this.started) return;
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.context = new Context();
        this.started = true;

        this.master = this.context.createGain();
        this.master.gain.value = this.enabled ? this.masterVolume : 0;
        this.master.connect(this.context.destination);

        // A gentle bus compressor keeps loud moments from clipping.
        this.bus = this.context.createDynamicsCompressor();
        this.bus.threshold.value = -18;
        this.bus.ratio.value = 6;
        this.bus.attack.value = 0.004;
        this.bus.release.value = 0.22;
        this.bus.connect(this.master);

        this.noiseBuffer = createNoiseBuffer(this.context, 3);

        this.buildAmbience();
        this.buildWeather();
        this.buildCrowd();
    }

    resume() {
        if (this.context && this.context.state === "suspended") this.context.resume();
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (this.master) {
            this.master.gain.setTargetAtTime(enabled ? this.masterVolume : 0, this.context.currentTime, 0.08);
        }
    }

    loopNoise(filterType, frequency, q, gainValue) {
        const source = this.context.createBufferSource();
        source.buffer = this.noiseBuffer;
        source.loop = true;
        const filter = this.context.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = frequency;
        filter.Q.value = q;
        const gain = this.context.createGain();
        gain.gain.value = gainValue;
        source.connect(filter).connect(gain).connect(this.bus);
        source.start();
        return { source, filter, gain };
    }

    buildAmbience() {
        // Distant traffic: low rumble plus a mid band that swells.
        this.trafficBed = this.loopNoise("lowpass", 420, 0.9, 0);
        this.trafficMid = this.loopNoise("bandpass", 1100, 0.7, 0);

        // Electrical hum for downtown and the rail yard.
        this.hum = this.context.createOscillator();
        this.hum.type = "sawtooth";
        this.hum.frequency.value = 58;
        this.humFilter = this.context.createBiquadFilter();
        this.humFilter.type = "lowpass";
        this.humFilter.frequency.value = 200;
        this.humGain = this.context.createGain();
        this.humGain.gain.value = 0;
        this.hum.connect(this.humFilter).connect(this.humGain).connect(this.bus);
        this.hum.start();

        // Wind through the district.
        this.wind = this.loopNoise("bandpass", 480, 0.55, 0.006);

        this.birdTimer = 0;
        this.birdLevel = 0;
    }

    buildWeather() {
        this.rainBed = this.loopNoise("bandpass", 2600, 0.35, 0);
        this.rainLow = this.loopNoise("lowpass", 700, 0.6, 0);
    }

    buildCrowd() {
        this.crowdBed = this.loopNoise("bandpass", 620, 0.5, 0);
        this.crowdHigh = this.loopNoise("bandpass", 1800, 0.7, 0);
        this.crowdLevel = 0;
    }

    ramp(param, value, time = 0.25) {
        if (!this.context) return;
        param.setTargetAtTime(value, this.context.currentTime, time);
    }

    /** Blends the ambience beds based on where the player is standing. */
    updateAmbience(dt, position, { wetness = 0, nightFactor = 0, indoors = false } = {}) {
        if (!this.started) return;

        let traffic = 0;
        let birds = 0;
        let hum = 0;
        let totalWeight = 0;
        for (const zone of AMBIENCE_ZONES) {
            const distance = Math.hypot(position.x - zone.x, position.z - zone.z);
            const weight = Math.max(0, 1 - distance / (zone.radius * 1.8));
            if (weight <= 0) continue;
            traffic += zone.traffic * weight;
            birds += zone.birds * weight;
            hum += zone.hum * weight;
            totalWeight += weight;
        }
        if (totalWeight > 0) {
            traffic /= totalWeight;
            birds /= totalWeight;
            hum /= totalWeight;
        }

        // Night quietens the city; rain masks the birds; walls muffle everything.
        const quiet = 1 - nightFactor * 0.55;
        const indoorDamp = indoors ? 0.28 : 1;
        traffic *= quiet * indoorDamp;
        birds *= (1 - wetness) * (1 - nightFactor) * indoorDamp;
        hum *= indoorDamp;

        this.ramp(this.trafficBed.gain.gain, traffic * 0.05, 0.5);
        this.ramp(this.trafficMid.gain.gain, traffic * 0.014, 0.5);
        this.ramp(this.humGain.gain, hum * 0.012, 0.6);
        this.ramp(this.wind.gain.gain, (0.004 + wetness * 0.02) * indoorDamp, 0.6);
        this.birdLevel = birds;

        this.birdTimer -= dt;
        if (this.birdTimer <= 0 && birds > 0.25) {
            this.birdTimer = 1.6 + Math.random() * 4.5 / Math.max(birds, 0.1);
            this.chirp(birds);
        }

        this.ramp(this.rainBed.gain.gain, wetness * 0.05 * indoorDamp, 0.6);
        this.ramp(this.rainLow.gain.gain, wetness * 0.03 * indoorDamp, 0.6);
    }

    chirp(level) {
        if (!this.started) return;
        const now = this.context.currentTime;
        const notes = 2 + Math.floor(Math.random() * 3);
        for (let note = 0; note < notes; note += 1) {
            const oscillator = this.context.createOscillator();
            const gain = this.context.createGain();
            const start = now + note * 0.09;
            const base = 2400 + Math.random() * 1600;
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(base, start);
            oscillator.frequency.exponentialRampToValueAtTime(base * 1.5, start + 0.05);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.012 * level, start + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
            oscillator.connect(gain).connect(this.bus);
            oscillator.start(start);
            oscillator.stop(start + 0.12);
        }
    }

    footstep(surface = "sidewalk", intensity = 0.5) {
        if (!this.started) return;
        const profile = FOOTSTEP_PROFILES[surface] || FOOTSTEP_PROFILES.sidewalk;
        const now = this.context.currentTime;

        const source = this.context.createBufferSource();
        source.buffer = this.noiseBuffer;
        const filter = this.context.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = profile.frequency * (0.9 + Math.random() * 0.2);
        filter.Q.value = 1.1;
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.05 * profile.noise * (0.55 + intensity), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.decay);
        source.connect(filter).connect(gain).connect(this.bus);
        source.start(now);
        source.stop(now + profile.decay + 0.02);

        if (profile.body > 0.05) {
            const thud = this.context.createOscillator();
            const thudGain = this.context.createGain();
            thud.type = "sine";
            thud.frequency.setValueAtTime(120, now);
            thud.frequency.exponentialRampToValueAtTime(58, now + 0.07);
            thudGain.gain.setValueAtTime(0.05 * profile.body * (0.5 + intensity), now);
            thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
            thud.connect(thudGain).connect(this.bus);
            thud.start(now);
            thud.stop(now + 0.1);
        }
    }

    /** Ball bounce: pitch and level scale with impact speed. */
    bounce(intensity = 0.6, surface = "court") {
        if (!this.started) return;
        const now = this.context.currentTime;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        const base = surface === "court" ? 168 : 132;
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(base * (0.9 + intensity * 0.5), now);
        oscillator.frequency.exponentialRampToValueAtTime(base * 0.55, now + 0.12);
        gain.gain.setValueAtTime(Math.min(0.16, 0.06 + intensity * 0.12), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        oscillator.connect(gain).connect(this.bus);
        oscillator.start(now);
        oscillator.stop(now + 0.2);

        const slap = this.context.createBufferSource();
        slap.buffer = this.noiseBuffer;
        const filter = this.context.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 2200;
        const slapGain = this.context.createGain();
        slapGain.gain.setValueAtTime(0.035 * intensity, now);
        slapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        slap.connect(filter).connect(slapGain).connect(this.bus);
        slap.start(now);
        slap.stop(now + 0.06);
    }

    /** Rim, backboard and swish each get their own character. */
    rim(kind = "rim") {
        if (!this.started) return;
        const now = this.context.currentTime;
        if (kind === "swish") {
            const source = this.context.createBufferSource();
            source.buffer = this.noiseBuffer;
            const filter = this.context.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.setValueAtTime(4200, now);
            filter.frequency.exponentialRampToValueAtTime(1800, now + 0.22);
            filter.Q.value = 0.8;
            const gain = this.context.createGain();
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
            source.connect(filter).connect(gain).connect(this.bus);
            source.start(now);
            source.stop(now + 0.28);
            return;
        }
        const frequencies = kind === "backboard" ? [220, 340] : [640, 910, 1240];
        frequencies.forEach((frequency, index) => {
            const oscillator = this.context.createOscillator();
            const gain = this.context.createGain();
            oscillator.type = kind === "backboard" ? "triangle" : "sine";
            oscillator.frequency.setValueAtTime(frequency, now);
            gain.gain.setValueAtTime(0.045 / (index + 1), now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "backboard" ? 0.24 : 0.5));
            oscillator.connect(gain).connect(this.bus);
            oscillator.start(now);
            oscillator.stop(now + 0.55);
        });
    }

    whistle() {
        if (!this.started) return;
        const now = this.context.currentTime;
        for (const detune of [0, 14]) {
            const oscillator = this.context.createOscillator();
            const gain = this.context.createGain();
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(2450 + detune * 12, now);
            const tremolo = this.context.createOscillator();
            const tremoloGain = this.context.createGain();
            tremolo.frequency.value = 26;
            tremoloGain.gain.value = 90;
            tremolo.connect(tremoloGain).connect(oscillator.frequency);
            tremolo.start(now);
            tremolo.stop(now + 0.5);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.045, now + 0.02);
            gain.gain.setValueAtTime(0.045, now + 0.32);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
            oscillator.connect(gain).connect(this.bus);
            oscillator.start(now);
            oscillator.stop(now + 0.45);
        }
    }

    setCrowd(level, excitement = 0) {
        if (!this.started) return;
        this.crowdLevel = level;
        this.ramp(this.crowdBed.gain.gain, level * 0.05 * (1 + excitement), 0.4);
        this.ramp(this.crowdHigh.gain.gain, level * 0.02 * (1 + excitement * 2.4), 0.25);
    }

    cheer(intensity = 1) {
        if (!this.started) return;
        const now = this.context.currentTime;
        const source = this.context.createBufferSource();
        source.buffer = this.noiseBuffer;
        const filter = this.context.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.linearRampToValueAtTime(1700, now + 0.4);
        filter.Q.value = 0.5;
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.09 * intensity, now + 0.16);
        gain.gain.setValueAtTime(0.09 * intensity, now + 0.7);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
        source.connect(filter).connect(gain).connect(this.bus);
        source.start(now);
        source.stop(now + 2.2);
    }

    groan() {
        if (!this.started) return;
        const now = this.context.currentTime;
        const source = this.context.createBufferSource();
        source.buffer = this.noiseBuffer;
        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(700, now);
        filter.frequency.linearRampToValueAtTime(300, now + 1.1);
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
        source.connect(filter).connect(gain).connect(this.bus);
        source.start(now);
        source.stop(now + 1.4);
    }

    thunder() {
        if (!this.started) return;
        const now = this.context.currentTime + 0.6 + Math.random() * 1.4;
        const source = this.context.createBufferSource();
        source.buffer = this.noiseBuffer;
        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320, now);
        filter.frequency.exponentialRampToValueAtTime(70, now + 2.4);
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.16, now + 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
        source.connect(filter).connect(gain).connect(this.bus);
        source.start(now);
        source.stop(now + 2.7);
    }

    /** Engine note built from three detuned saws tracking RPM. */
    startEngine() {
        if (!this.started || this.engine) return;
        const gain = this.context.createGain();
        gain.gain.value = 0;
        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 700;
        gain.connect(filter).connect(this.bus);

        const oscillators = [];
        for (const ratio of [1, 1.5, 2.02]) {
            const oscillator = this.context.createOscillator();
            oscillator.type = "sawtooth";
            oscillator.frequency.value = 60 * ratio;
            const partial = this.context.createGain();
            partial.gain.value = ratio === 1 ? 0.6 : 0.22;
            oscillator.connect(partial).connect(gain);
            oscillator.start();
            oscillators.push({ oscillator, ratio });
        }
        this.engine = { gain, filter, oscillators };
    }

    updateEngine(rpm, load) {
        if (!this.engine) return;
        const base = 44 + rpm * 96;
        for (const { oscillator, ratio } of this.engine.oscillators) {
            oscillator.frequency.setTargetAtTime(base * ratio, this.context.currentTime, 0.06);
        }
        this.engine.filter.frequency.setTargetAtTime(400 + rpm * 2200, this.context.currentTime, 0.1);
        this.engine.gain.gain.setTargetAtTime(0.014 + load * 0.03, this.context.currentTime, 0.1);
    }

    stopEngine() {
        if (!this.engine) return;
        this.engine.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.15);
        const engine = this.engine;
        this.engine = null;
        setTimeout(() => {
            for (const { oscillator } of engine.oscillators) oscillator.stop();
        }, 500);
    }

    /** Bike freewheel and skateboard roll. */
    roll(speed, surface = "road") {
        if (!this.started) return;
        if (!this.rollNode) {
            this.rollNode = this.loopNoise("bandpass", 900, 1.4, 0);
        }
        const level = Math.min(0.04, speed * 0.006) * (surface === "grass" ? 1.6 : 1);
        this.ramp(this.rollNode.gain.gain, level, 0.12);
        this.rollNode.filter.frequency.setTargetAtTime(600 + speed * 220, this.context.currentTime, 0.15);
    }

    stopRoll() {
        if (this.rollNode) this.ramp(this.rollNode.gain.gain, 0, 0.15);
    }

    /** UI feedback, kept quiet and short. */
    blip(frequency = 620, duration = 0.09, type = "sine", volume = 0.03) {
        if (!this.started) return;
        const now = this.context.currentTime;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(gain).connect(this.bus);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
    }

    /** A short musical sting for mission completion. */
    sting(success = true) {
        if (!this.started) return;
        const notes = success ? [392, 523.25, 659.25, 783.99] : [392, 349.23, 293.66];
        notes.forEach((frequency, index) => {
            const now = this.context.currentTime + index * 0.11;
            const oscillator = this.context.createOscillator();
            const gain = this.context.createGain();
            oscillator.type = "triangle";
            oscillator.frequency.setValueAtTime(frequency, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
            oscillator.connect(gain).connect(this.bus);
            oscillator.start(now);
            oscillator.stop(now + 0.55);
        });
    }
}
