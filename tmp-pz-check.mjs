/**
 * Browser smoke test for Survival Island over Chrome DevTools Protocol.
 * Usage: node tmp-pz-check.mjs [--mobile]
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const MOBILE = process.argv.includes("--mobile");
const PORT = MOBILE ? 9334 : 9333;
const SHOTS = "tmp-shots-pz";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = `/tmp/survival-island-check-${MOBILE ? "mobile" : "desktop"}`;
mkdirSync(SHOTS, { recursive: true });
rmSync(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--autoplay-policy=no-user-gesture-required",
    `--window-size=${MOBILE ? "390,844" : "1280,860"}`,
    `--user-data-dir=${profile}`,
    "about:blank"
], { stdio: "ignore" });

let ws;
let nextId = 1;
const pending = new Map();
const errors = [];

function send(method, params = {}) {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
    const result = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true
    });
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
}

async function click(selector) {
    const clicked = await evaluate(`(() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        if (!node) return false;
        node.click();
        return true;
    })()`);
    if (!clicked) throw new Error(`Missing ${selector}`);
}

async function shot(name) {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(data, "base64"));
}

async function connect() {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
            const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
            const pages = await response.json();
            const page = pages.find((entry) => entry.type === "page");
            if (page) return page.webSocketDebuggerUrl;
        } catch {
            // Chrome is still starting.
        }
        await sleep(200);
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
            errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
        }
        if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
            errors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
        }
        if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
            errors.push(message.params.entry.text);
        }
    });

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");
    if (MOBILE) {
        await send("Emulation.setDeviceMetricsOverride", {
            width: 390, height: 844, deviceScaleFactor: 2, mobile: true
        });
        await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    }

    await send("Page.navigate", { url: "http://localhost:3000/pressure-zone/index.html" });
    await sleep(1600);
    await shot(`${MOBILE ? "m" : "d"}-island-menu`);
    await click("#newGameButton");
    await sleep(250);
    await evaluate("document.getElementById('survivorName').value = 'River'");
    await shot(`${MOBILE ? "m" : "d"}-island-creator`);
    await click("#beginExpeditionButton");
    await sleep(900);
    await shot(`${MOBILE ? "m" : "d"}-island-game`);

    const initial = await evaluate(`(() => ({
        active: !document.getElementById("gameplayScreen").hidden,
        canvas: [document.getElementById("gameCanvas").width, document.getElementById("gameCanvas").height],
        objective: document.getElementById("objectiveText").textContent,
        touch: getComputedStyle(document.getElementById("touchControls")).display
    }))()`);
    if (!initial.active || initial.canvas[0] < 1 || initial.canvas[1] < 1) {
        throw new Error(`Gameplay failed to initialize: ${JSON.stringify(initial)}`);
    }

    // Walk from spawn to the closest driftwood and gather it using real input.
    await evaluate(`new Promise((resolve) => {
        window.dispatchEvent(new KeyboardEvent("keydown", {code:"ArrowLeft"}));
        setTimeout(() => {
            window.dispatchEvent(new KeyboardEvent("keyup", {code:"ArrowLeft"}));
            window.dispatchEvent(new KeyboardEvent("keydown", {code:"ArrowDown"}));
            setTimeout(() => {
                window.dispatchEvent(new KeyboardEvent("keyup", {code:"ArrowDown"}));
                window.dispatchEvent(new KeyboardEvent("keydown", {code:"KeyE"}));
                window.dispatchEvent(new KeyboardEvent("keyup", {code:"KeyE"}));
                resolve();
            }, 260);
        }, 180);
    })`);
    await sleep(300);

    await click("#inventoryButton");
    await sleep(150);
    const inventoryText = await evaluate("document.getElementById('inventoryGrid').textContent");
    await shot(`${MOBILE ? "m" : "d"}-island-inventory`);
    if (!inventoryText.includes("Wood")) throw new Error(`Gathering smoke test failed: ${inventoryText}`);
    await click("#inventoryCloseButton");

    for (const [button, panel, name] of [
        ["#craftingButton", "#craftingPanel", "crafting"],
        ["#mapButton", "#mapPanel", "map"],
        ["#profileButton", "#profilePanel", "profile"]
    ]) {
        await click(button);
        await sleep(120);
        const open = await evaluate(`!document.querySelector(${JSON.stringify(panel)}).hidden`);
        if (!open) throw new Error(`${name} panel did not open`);
        await shot(`${MOBILE ? "m" : "d"}-island-${name}`);
        await click(`${panel} .close-button`);
    }

    await click("#pauseGameButton");
    await click("#saveQuitButton");
    await sleep(250);
    const canContinue = await evaluate("!document.getElementById('continueGameButton').disabled");
    if (!canContinue) throw new Error("Save/continue smoke test failed");
    await click("#continueGameButton");
    await sleep(300);

    console.log(`PASS Survival Island browser smoke (${MOBILE ? "mobile" : "desktop"})`);
    console.log(`  objective: ${initial.objective}`);
    console.log(`  touch controls: ${initial.touch}`);
    console.log(`  console errors: ${errors.length}`);
    if (errors.length) {
        for (const error of errors) console.log(`  ! ${error}`);
        process.exitCode = 1;
    }
} finally {
    ws?.close();
    chrome.kill();
}
