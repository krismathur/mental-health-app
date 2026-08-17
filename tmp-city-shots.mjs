/** Drives City Missions through its lighting states and captures screenshots. */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { mkdirSync, writeFileSync } from "node:fs";

const PORT = 9362;
const OUT = "tmp-shots-city";
const WIDTH = 960;
const HEIGHT = 540;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-gpu-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    `--window-size=${WIDTH},${HEIGHT}`,
    `--user-data-dir=${process.cwd()}/tmp-chrome-profile/shots-${Date.now()}`,
    "about:blank"
], { stdio: "ignore" });

let ws;
let nextId = 1;
const pending = new Map();
const errors = [];

const send = (method, params = {}) => {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};

async function evaluate(expression) {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
}

/** Mean and percentile luminance, so exposure is judged by numbers not vibes. */
async function measure(dataUri) {
    return evaluate(`(async () => {
        const image = new Image();
        image.src = "${dataUri}";
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 240; canvas.height = 135;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, 240, 135);
        const { data } = ctx.getImageData(0, 0, 240, 135);
        const luma = [];
        for (let i = 0; i < data.length; i += 4) {
            luma.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
        }
        luma.sort((a, b) => a - b);
        const at = (p) => Math.round(luma[Math.floor(luma.length * p)]);
        const mean = Math.round(luma.reduce((s, v) => s + v, 0) / luma.length);
        return { mean, p10: at(0.1), p50: at(0.5), p90: at(0.9),
                 crushed: Math.round(luma.filter((v) => v < 8).length / luma.length * 100) };
    })()`);
}

async function shoot(name) {
    // Let a few frames land so temporal effects and the env map settle.
    await sleep(1400);
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, "base64"));
    const stats = await evaluate(`(() => {
        const s = window.__city.stats;
        return Math.round(s.fps) + 'fps ' + s.drawCalls + ' calls';
    })()`).catch(() => "n/a");
    const light = await measure(`data:image/png;base64,${data}`).catch(() => null);
    const tone = light
        ? `mean ${String(light.mean).padStart(3)}  p10 ${String(light.p10).padStart(3)}` +
          `  p50 ${String(light.p50).padStart(3)}  p90 ${String(light.p90).padStart(3)}` +
          `  crushed ${String(light.crushed).padStart(2)}%`
        : "no reading";
    console.log(`  ${name.padEnd(22)} ${tone}   (${stats})`);
}

async function connect() {
    for (let attempt = 0; attempt < 60; attempt += 1) {
        try {
            const pages = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
            const page = pages.find((entry) => entry.type === "page");
            if (page) return page.webSocketDebuggerUrl;
        } catch { /* still starting */ }
        await sleep(180);
    }
    throw new Error("Chrome did not start");
}

try {
    ws = new WebSocket(await connect());
    await new Promise((resolve, reject) => {
        ws.addEventListener("open", resolve, { once: true });
        ws.addEventListener("error", reject, { once: true });
    });
    ws.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (message.id && pending.has(message.id)) {
            const task = pending.get(message.id);
            pending.delete(message.id);
            if (message.error) task.reject(new Error(message.error.message));
            else task.resolve(message.result);
            return;
        }
        if (message.method === "Runtime.exceptionThrown") {
            errors.push(message.params.exceptionDetails.exception?.description
                || message.params.exceptionDetails.text);
        }
    });
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
        width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false
    });

    await send("Page.navigate", { url: "http://localhost:3000/pressure-zone/index.html" });

    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
        await sleep(1000);
        const state = await evaluate(`(window.__city && window.__city.game || {}).state`).catch(() => null);
        if (state === "menu") { ready = true; break; }
    }
    if (!ready) throw new Error(`never reached the menu: ${errors.join(" | ")}`);

    const cam = (position, lookAt) =>
        evaluate(`window.__city.freeCam(${JSON.stringify(position)}, ${JSON.stringify(lookAt)})`);
    const chase = () => evaluate(`window.__city.freeCam(null)`);

    console.log("Captures:");
    await shoot("01-menu");

    await evaluate(`document.getElementById('playButton').click()`);
    await shoot("02-creator");

    await evaluate(`(() => {
        const g = window.__city.game;
        g.startGame({ name: 'Rowan', skin: 'olive', hair: 'short', hairColor: 'darkbrown',
                      outfit: 'street', jacket: 'hoodie', backpack: 'day', height: 1 }, {});
        return true;
    })()`);
    await shoot("03-bedroom-cinematic");

    await evaluate(`window.__city.game.skipCinematic()`);
    await shoot("04-bedroom");

    // Morning on the residential street, over the player's shoulder.
    await evaluate(`window.__city.setTime(8.4); window.__city.setWeather('clear');
                    window.__city.teleport('homeDoor');`);
    await shoot("05-morning-street");

    await evaluate(`window.__city.teleport('park')`);
    await shoot("06-park");

    // Framed establishing shots on real streets, so the city is judged and not a
    // wall the chase camera happened to press against.
    const SKYLINE = [[-46, 26, 52], [24, 4, -22]];
    const MAIN_STREET = [[-34, 2.7, 3.4], [40, 3.6, 1.6]];
    const CENTER_AVENUE = [[6.5, 3, 46], [6.5, 5, -44]];
    const COURT_VIEW = [[68, 7, 58], [45, 2, 36]];

    await cam(...SKYLINE);
    await shoot("07-day-skyline");

    await cam(...MAIN_STREET);
    await shoot("08-day-main-street");

    await cam(...CENTER_AVENUE);
    await shoot("09-day-avenue");

    await cam(...COURT_VIEW);
    await shoot("10-day-court");

    // Golden hour.
    await evaluate(`window.__city.setTime(18.6)`);
    await sleep(2500);
    await cam(...SKYLINE);
    await shoot("11-golden-skyline");

    await cam(...MAIN_STREET);
    await shoot("12-golden-main-street");

    // Rain and storm.
    await evaluate(`window.__city.setTime(15.8); window.__city.setWeather('rain')`);
    await sleep(4000);
    await cam(...MAIN_STREET);
    await shoot("13-rain-main-street");

    await evaluate(`window.__city.setWeather('storm')`);
    await sleep(4000);
    await cam(...COURT_VIEW);
    await shoot("14-storm-court");

    // Night.
    await evaluate(`window.__city.setWeather('clear'); window.__city.setTime(21.6)`);
    await sleep(4000);
    await cam(...SKYLINE);
    await shoot("15-night-skyline");

    await cam(...CENTER_AVENUE);
    await shoot("16-night-avenue");

    await chase();
    await evaluate(`window.__city.teleport('homeDoor')`);
    await shoot("17-night-residential");

    // Riding.
    await evaluate(`window.__city.setTime(19.2); window.__city.ride('bike')`);
    await shoot("18-bike-dusk");

    // Tournament under lights.
    await evaluate(`window.__city.startTournament()`);
    await sleep(3000);
    await shoot("19-tournament");

    await cam([56, 4.2, 47], [45, 1.6, 36]);
    await shoot("20-tournament-low");
    await chase();

    await evaluate(`window.__city.shoot(0.62)`);
    await sleep(700);
    await shoot("21-shot-flight");

    await sleep(2600);
    await shoot("22-shot-outcome");

    // Menus over live gameplay.
    await evaluate(`window.__city.map()`);
    await shoot("23-map");
    await evaluate(`window.__city.map(); window.__city.pause(true)`);
    await shoot("24-pause-profile");

    if (errors.length) {
        console.log("\nERRORS:");
        for (const error of errors) console.log(`  ! ${error}`);
        process.exitCode = 1;
    } else {
        console.log("\nno console errors");
    }
} catch (error) {
    console.log(`CAPTURE FAILED: ${error.message}`);
    for (const entry of errors) console.log(`  ! ${entry}`);
    process.exitCode = 1;
} finally {
    ws?.close();
    chrome.kill();
}
