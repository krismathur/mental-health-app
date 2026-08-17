/** Lightweight error probe: small viewport so software WebGL stays cheap. */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 9361;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`,
    "--headless=new",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-gpu-sandbox",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=420,300",
    `--user-data-dir=${process.cwd()}/tmp-chrome-profile/probe-${Date.now()}`,
    "about:blank"
], { stdio: "ignore" });

let ws;
let nextId = 1;
const pending = new Map();
const errors = [];
const logs = [];

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
        if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
            errors.push(message.params.args.map((a) => a.description || a.value).join(" "));
        }
        if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
            logs.push(message.params.entry.text);
        }
    });
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 420, height: 300, deviceScaleFactor: 1, mobile: false });

    await send("Page.navigate", { url: "http://localhost:3000/pressure-zone/index.html" });

    // Wait for the loader to finish.
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt += 1) {
        await sleep(1000);
        const status = await evaluate(`(() => {
            const g = window.__city && window.__city.game;
            return g ? g.state : (document.getElementById('loadingStatus') || {}).textContent;
        })()`);
        process.stdout.write(`  t+${attempt + 1}s state=${status}\n`);
        if (status === "menu") { ready = true; break; }
        if (errors.length) break;
    }
    if (!ready) throw new Error(`Never reached the menu. Errors: ${errors.join(" | ") || "none"}`);

    const counts = await evaluate(`(() => {
        const g = window.__city.game;
        let meshes = 0; let instanced = 0;
        g.scene.traverse((o) => { if (o.isInstancedMesh) instanced++; else if (o.isMesh) meshes++; });
        return { meshes, instanced, colliders: g.colliders.length, lamps: g.lampPositions.length,
                 buildingsOk: !!g.builder, hoops: g.hoops.length };
    })()`);
    console.log("scene:", counts);

    // Start a game without the creator UI.
    await evaluate(`(() => {
        const g = window.__city.game;
        g.startGame({ name: 'Rowan', skin: 'olive', hair: 'short', hairColor: 'darkbrown',
                      outfit: 'street', jacket: 'hoodie', backpack: 'day', height: 1 }, {});
        g.skipCinematic();
        return true;
    })()`);
    await sleep(6000);

    const play = await evaluate(`(() => {
        const g = window.__city.game;
        return {
            state: g.state,
            fps: Math.round(g.stats.fps * 10) / 10,
            drawCalls: g.stats.drawCalls,
            triangles: g.stats.triangles,
            mission: g.missions && g.missions.mission.id,
            objective: g.missions && g.missions.objectiveText,
            player: [Math.round(g.player.position.x), Math.round(g.player.position.y * 100) / 100, Math.round(g.player.position.z)],
            camera: [Math.round(g.camera.position.x), Math.round(g.camera.position.y * 10) / 10, Math.round(g.camera.position.z)],
            surface: g.player.surface,
            interactable: g.interactable && g.interactable.text
        };
    })()`);
    console.log("play:", play);

    // Walk forward, then check the objective and the systems.
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', bubbles: true }))`);
    await sleep(4000);
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', bubbles: true }))`);
    const moved = await evaluate(`(() => {
        const g = window.__city.game;
        return {
            player: [Math.round(g.player.position.x), Math.round(g.player.position.z)],
            speedSeen: Math.round(g.player.speed * 100) / 100,
            objective: g.missions.objectiveText,
            district: (() => { try { return g.hudDistrict; } catch { return null; } })()
        };
    })()`);
    console.log("moved:", moved);

    const systems = await evaluate(`(() => {
        const g = window.__city.game;
        return {
            trafficCars: g.traffic.cars.length,
            trafficMoved: Math.round(g.traffic.cars[0].distance),
            pedestrians: g.crowd.pedestrians.length,
            vehicles: g.vehicles.map((v) => v.kind),
            weather: g.weather,
            hour: Math.round(g.hour * 100) / 100,
            night: Math.round(g.sky.nightFactor * 100) / 100,
            envMap: !!g.sky.environment
        };
    })()`);
    console.log("systems:", systems);

    // Exercise night, storm, the court and the tournament.
    await evaluate(`window.__city.setTime(21.5); window.__city.setWeather('storm');`);
    await sleep(3000);
    await evaluate(`window.__city.teleport('court')`);
    await sleep(1500);
    await evaluate(`window.__city.startTournament()`);
    await sleep(4000);
    await evaluate(`window.__city.shoot(0.6)`);
    await sleep(3500);

    const match = await evaluate(`(() => {
        const g = window.__city.game;
        return {
            match: g.match ? { player: g.match.playerScore, opponent: g.match.opponentScore,
                               clock: Math.round(g.match.clock), attempts: g.match.attempts,
                               pressure: Math.round(g.match.pressure * 100) / 100 } : null,
            ballState: g.ball.state,
            ballY: Math.round(g.ball.position.y * 100) / 100,
            crowdVisible: g.courtCrowd.group.visible,
            night: Math.round(g.sky.nightFactor * 100) / 100,
            fps: Math.round(g.stats.fps * 10) / 10
        };
    })()`);
    console.log("match:", match);

    const save = await evaluate(`(() => {
        window.__city.game.saveGame(false);
        const raw = localStorage.getItem('city-missions-save-v1');
        return raw ? JSON.parse(raw).version : null;
    })()`);
    console.log("save version:", save);

    const real = [...errors, ...logs].filter((entry) => entry && !entry.includes("Failed to load resource"));
    if (real.length) {
        console.log("\nERRORS:");
        for (const error of real) console.log(`  ! ${error}`);
        process.exitCode = 1;
    } else {
        console.log("\nno console errors");
    }
} catch (error) {
    console.log(`PROBE FAILED: ${error.message}`);
    for (const entry of [...errors, ...logs]) console.log(`  ! ${entry}`);
    process.exitCode = 1;
} finally {
    ws?.close();
    chrome.kill();
}
