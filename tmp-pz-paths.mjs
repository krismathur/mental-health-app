/**
 * Second Pressure Zone pass: the branches the happy path misses.
 *   - skipping the reset ("Shoot Now")
 *   - a deliberate miss and the crowd's reaction
 *   - the two-free-throw scenario stepping back to the line
 *   - letting the clock expire (buzzer)
 *   - the pause overlay
 */

import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 9334;
const SHOTS = "tmp-shots-pz";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

mkdirSync(SHOTS, { recursive: true });
rmSync("/tmp/pz-paths-profile", { recursive: true, force: true });

const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--autoplay-policy=no-user-gesture-required",
    "--window-size=1280,860",
    "--user-data-dir=/tmp/pz-paths-profile",
    "about:blank"
], { stdio: "ignore" });

let ws = null;
let nextId = 1;
const pending = new Map();
const errors = [];

function send(method, params = {}) {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
}

async function shot(name) {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(data, "base64"));
    console.log(`  captured ${name}`);
}

/** Waits for the sweeping marker to reach a spot, then locks it there. */
async function lockAt(markerId, low, high) {
    for (let attempt = 0; attempt < 400; attempt += 1) {
        const locked = await evaluate(`(() => {
            const marker = document.getElementById(${JSON.stringify(markerId)});
            const left = parseFloat(marker.style.left || "50");
            if (left >= ${low} && left <= ${high}) {
                document.getElementById("shootBtn").click();
                return left;
            }
            return null;
        })()`);
        if (locked !== null) {
            return locked;
        }
        await sleep(16);
    }
    throw new Error(`marker ${markerId} never landed in ${low}-${high}`);
}

async function phase() {
    return evaluate(`(() => {
        if (!document.getElementById("promptLayer").hidden) {
            return "prompt:" + document.getElementById("promptTitle").textContent;
        }
        if (!document.getElementById("meterLayer").hidden) {
            return "meters:" + document.getElementById("shootBtn").textContent;
        }
        if (!document.getElementById("resultOverlay").hidden) {
            return "result:" + document.getElementById("resultTitle").textContent;
        }
        return "playing";
    })()`);
}

const url = await (async () => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
        try {
            const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
            const page = (await response.json()).find((t) => t.type === "page");
            if (page) {
                return page.webSocketDebuggerUrl;
            }
        } catch { /* booting */ }
        await sleep(250);
    }
    throw new Error("chrome never came up");
})();

ws = new WebSocket(url);
await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
});
ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) {
            reject(new Error(message.error.message));
        } else {
            resolve(message.result);
        }
        return;
    }
    if (message.method === "Runtime.exceptionThrown") {
        errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error"
        && !message.params.entry.text.includes("404")) {
        errors.push(message.params.entry.text);
    }
});

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");

await send("Page.navigate", { url: "http://localhost:3000/pressure-zone/index.html" });
await sleep(1500);

// Unlock every scenario so we can jump straight to the interesting ones.
await evaluate(`(() => {
    const played = {};
    for (const id of ["tie-game","down-one","teammate-miss","own-mistake","road-boos","two-free-throws","comeback","championship"]) {
        played[id] = { attempts: 1, made: 0 };
    }
    localStorage.setItem("mindzone_pressure_progress", JSON.stringify({
        character: "nova", stats: { focus: 60, calm: 58, confidence: 55, resilience: 61 },
        badges: [], xp: 120, possessions: 4, made: 1, resets: 2, played, missedLast: true
    }));
})()`);
await send("Page.reload");
await sleep(1800);

console.log("\n--- Two free throws: miss the first, make the second, no reset ---");

await evaluate(`document.getElementById("startBtn").click()`);
await sleep(400);
await evaluate(`document.getElementById("playerNextBtn").click()`);
await sleep(400);
await evaluate(`document.querySelector('[data-scenario="two-free-throws"]').click()`);
await sleep(3400);

// Skip the intro if it is still up, then wait for the whistle.
await evaluate(`document.getElementById("court").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))`);
await sleep(4200);
console.log(`  ${await phase()}`);
await shot("p-1-ft-first");

// "Shoot Now" - the second button - skips the whole reset.
await evaluate(`document.querySelectorAll("#promptActions button")[1].click()`);
await sleep(500);
const hint = await evaluate(`document.getElementById("meterHint").textContent`);
console.log(`  no-reset hint: ${hint}`);
console.log(`  zone width: ${await evaluate(`document.getElementById("aimZone").style.width`)}`);

await lockAt("aimMarker", 90, 100);
await sleep(300);
await lockAt("powerMarker", 88, 100);
await sleep(1500);
await shot("p-2-ft-miss-flight");
await sleep(2200);
console.log(`  after miss: ${await phase()}`);
await shot("p-3-ft-miss-reaction");

// Should step back to the line for free throw two.
await sleep(2600);
const second = await phase();
console.log(`  second attempt: ${second}`);
await shot("p-4-ft-second");

if (second.startsWith("prompt")) {
    await evaluate(`document.querySelectorAll("#promptActions button")[1].click()`);
    await sleep(400);
    await lockAt("aimMarker", 48, 52);
    await sleep(250);
    await lockAt("powerMarker", 48, 52);
    await sleep(4200);
    console.log(`  ${await phase()}`);
    await shot("p-5-ft-result");
    console.log("  xp lines:", await evaluate(`JSON.stringify([...document.querySelectorAll("#xpList li")].map(li => li.textContent))`));
}

console.log("\n--- Championship: let the clock run out ---");

await evaluate(`document.getElementById("resultOverlay").hidden = true;
                document.getElementById("scenarioBackBtn")?.click?.();`);
await evaluate(`(() => {
    document.getElementById("courtScreen").classList.remove("is-active");
    document.getElementById("scenarioScreen").classList.add("is-active");
})()`);
await sleep(300);
await evaluate(`document.querySelector('[data-scenario="championship"]').click()`);
await sleep(3300);
await evaluate(`document.getElementById("court").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))`);
await sleep(2600);
await shot("p-6-championship-timeout");
console.log(`  ${await phase()}`);

// Take the breath, then just stand there until the horn.
await evaluate(`document.querySelectorAll("#promptActions button")[0].click()`);
await sleep(6800);
await evaluate(`document.querySelectorAll("#promptActions button")[0]?.click?.()`);
await sleep(2800);
console.log(`  ${await phase()} clock=${await evaluate(`document.getElementById("gameClock").textContent`)}`);
await sleep(4500);
await shot("p-7-buzzer");
const buzzerResult = await phase();
console.log(`  ${buzzerResult}`);
await sleep(2500);
await shot("p-8-buzzer-result");
console.log(`  ${await phase()}`);
console.log("  message:", await evaluate(`document.getElementById("resultMessage").textContent`));

console.log("\n--- Pause ---");
await evaluate(`document.getElementById("resultOverlay").hidden = true; document.getElementById("pauseBtn").click()`);
await sleep(400);
await shot("p-9-pause");

console.log(`\nconsole errors: ${errors.length}`);
for (const error of errors.slice(0, 10)) {
    console.log(`  ! ${error}`);
}

ws.close();
chrome.kill();
process.exit(0);
