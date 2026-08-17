/** Isolates what is eating the light: shadows, post grade, or the lights themselves. */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = 9363;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`, "--headless=new",
    "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-gpu-sandbox",
    "--no-first-run", "--no-default-browser-check", "--window-size=640,360",
    `--user-data-dir=${process.cwd()}/tmp-chrome-profile/light-${Date.now()}`, "about:blank"
], { stdio: "ignore" });

let ws; let nextId = 1;
const pending = new Map();
const send = (method, params = {}) => {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};
async function evaluate(expression) {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
}
async function connect() {
    for (let i = 0; i < 60; i += 1) {
        try {
            const pages = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
            const page = pages.find((e) => e.type === "page");
            if (page) return page.webSocketDebuggerUrl;
        } catch { /* starting */ }
        await sleep(180);
    }
    throw new Error("Chrome did not start");
}
async function meanLuma() {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    return evaluate(`(async () => {
        const img = new Image();
        img.src = "data:image/png;base64,${data}";
        await img.decode();
        const c = document.createElement('canvas'); c.width = 160; c.height = 90;
        const x = c.getContext('2d'); x.drawImage(img, 0, 0, 160, 90);
        const d = x.getImageData(0, 0, 160, 90).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2];
        return Math.round(sum / (d.length / 4));
    })()`);
}

try {
    ws = new WebSocket(await connect());
    await new Promise((res, rej) => {
        ws.addEventListener("open", res, { once: true });
        ws.addEventListener("error", rej, { once: true });
    });
    ws.addEventListener("message", (event) => {
        const m = JSON.parse(event.data);
        if (m.id && pending.has(m.id)) {
            const t = pending.get(m.id); pending.delete(m.id);
            if (m.error) t.reject(new Error(m.error.message)); else t.resolve(m.result);
        }
    });
    await send("Page.enable"); await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 640, height: 360, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: "http://localhost:3000/pressure-zone/index.html" });

    for (let i = 0; i < 120; i += 1) {
        await sleep(1000);
        if (await evaluate(`(window.__city&&window.__city.game||{}).state`).catch(() => null) === "menu") break;
    }
    await evaluate(`(() => { const g = window.__city.game;
        g.startGame({ name:'R', skin:'olive', hair:'short', hairColor:'darkbrown',
                      outfit:'street', jacket:'hoodie', backpack:'day', height:1 }, {});
        g.skipCinematic(); return true; })()`);
    await sleep(3000);
    await evaluate(`window.__city.setTime(12.5); window.__city.teleport('court')`);
    await sleep(4000);

    console.log("Light state at 12:30 on the court:");
    console.log(await evaluate(`(() => {
        const s = window.__city.game.sky;
        return { sunIntensity: Math.round(s.sun.intensity*100)/100,
                 sunColor: '#' + s.sun.color.getHexString(),
                 sunPos: [Math.round(s.sun.position.x), Math.round(s.sun.position.y), Math.round(s.sun.position.z)],
                 hemi: Math.round(s.bounce.intensity*100)/100,
                 ambient: Math.round(s.fill.intensity*100)/100,
                 fogDensity: s.scene.fog.density,
                 exposure: window.__city.game.renderer.toneMappingExposure,
                 envMap: !!s.environment };
    })()`));

    const asphalt = await evaluate(`(() => {
        const g = window.__city.game;
        let found = null;
        g.scene.traverse((o) => {
            if (found || !o.isMesh || !o.material || !o.material.color) return;
            if ((o.name || '').includes('road') || (o.material.name || '').includes('asphalt')) {
                found = { name: o.name, material: o.material.name,
                          color: '#' + o.material.color.getHexString(),
                          roughness: o.material.roughness, metalness: o.material.metalness,
                          hasMap: !!o.material.map, envIntensity: o.material.envMapIntensity };
            }
        });
        return found;
    })()`);
    console.log("road material:", asphalt);

    console.log("\nMean screen luminance under each configuration:");
    console.log(`  as shipped                ${await meanLuma()}`);

    await evaluate(`window.__city.game.post.enabled = false`);
    await sleep(2000);
    console.log(`  post chain off            ${await meanLuma()}`);
    await evaluate(`window.__city.game.post.enabled = true`);

    await evaluate(`window.__city.game.sky.sun.castShadow = false`);
    await sleep(2500);
    console.log(`  shadows off               ${await meanLuma()}`);
    await evaluate(`window.__city.game.sky.sun.castShadow = true`);

    await evaluate(`window.__city.game.renderer.toneMappingExposure = 2.2`);
    await sleep(2000);
    console.log(`  exposure 2.2              ${await meanLuma()}`);

    await evaluate(`window.__city.game.renderer.toneMappingExposure = 1.05;
                    window.__city.game.scene.traverse((o) => {
                        if (o.isMesh && o.material && o.material.color) o.material.color.setHex(0x808080);
                    })`);
    await sleep(2500);
    console.log(`  all albedo forced to 50%  ${await meanLuma()}`);
} catch (error) {
    console.log(`PROBE FAILED: ${error.message}`);
    process.exitCode = 1;
} finally {
    ws?.close(); chrome.kill();
}
