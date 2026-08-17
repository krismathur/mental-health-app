/**
 * Placeholder sound effects built from WebAudio oscillators.
 *
 * Each effect is a short list of notes so there are no audio files to ship. To
 * swap in real recordings later, replace playSound() with an <audio> or
 * AudioBuffer player and keep the same effect names.
 */

const MUTE_KEY = "mindzone_game_muted";

const SOUNDS = {
    jump: [{ type: "square", from: 420, to: 700, duration: 0.12, gain: 0.16 }],
    land: [{ type: "sine", from: 220, to: 120, duration: 0.1, gain: 0.13 }],
    step: [{ type: "sine", from: 180, to: 150, duration: 0.05, gain: 0.05 }],
    crystal: [
        { type: "triangle", from: 880, to: 880, duration: 0.08, gain: 0.16 },
        { type: "triangle", from: 1320, to: 1320, duration: 0.14, gain: 0.14, delay: 0.07 }
    ],
    checkpoint: [
        { type: "triangle", from: 520, to: 520, duration: 0.11, gain: 0.15 },
        { type: "triangle", from: 660, to: 660, duration: 0.11, gain: 0.15, delay: 0.1 },
        { type: "triangle", from: 880, to: 880, duration: 0.22, gain: 0.15, delay: 0.2 }
    ],
    crumble: [{ type: "sawtooth", from: 200, to: 70, duration: 0.32, gain: 0.11 }],
    setback: [{ type: "sine", from: 400, to: 180, duration: 0.34, gain: 0.14 }],
    reward: [
        { type: "triangle", from: 660, to: 660, duration: 0.1, gain: 0.15 },
        { type: "triangle", from: 990, to: 990, duration: 0.16, gain: 0.14, delay: 0.09 }
    ],
    click: [{ type: "square", from: 600, to: 600, duration: 0.05, gain: 0.1 }],
    complete: [
        { type: "triangle", from: 523, to: 523, duration: 0.14, gain: 0.16 },
        { type: "triangle", from: 659, to: 659, duration: 0.14, gain: 0.16, delay: 0.13 },
        { type: "triangle", from: 784, to: 784, duration: 0.14, gain: 0.16, delay: 0.26 },
        { type: "triangle", from: 1046, to: 1046, duration: 0.4, gain: 0.18, delay: 0.39 }
    ]
};

let context = null;
let muted = localStorage.getItem(MUTE_KEY) === "1";

function getContext() {
    if (!context) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) {
            return null;
        }
        context = new Ctor();
    }

    if (context.state === "suspended") {
        context.resume();
    }

    return context;
}

/** Browsers block audio until a gesture, so main.js calls this on first input. */
export function unlockAudio() {
    getContext();
}

export function isMuted() {
    return muted;
}

export function toggleMute() {
    muted = !muted;
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    return muted;
}

export function playSound(name) {
    if (muted) {
        return;
    }

    const notes = SOUNDS[name];
    const ctx = getContext();
    if (!notes || !ctx) {
        return;
    }

    for (const note of notes) {
        const start = ctx.currentTime + (note.delay || 0);
        const end = start + note.duration;

        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = note.type;
        oscillator.frequency.setValueAtTime(note.from, start);
        if (note.to !== note.from) {
            oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, note.to), end);
        }

        // Quick fade in and out keeps the blips from clicking.
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(note.gain, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(end + 0.02);
    }
}
