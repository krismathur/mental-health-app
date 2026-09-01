import { spawn } from "child_process";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9346;
const PROFILE = join(process.cwd(), "tmp-studio-chrome");
const SHOTS = join(process.cwd(), "tmp-studio-shots");
rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(PROFILE, { recursive: true });
mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function pageWs() {
    await wait(400);
    for (let i = 0; i < 50; i += 1) {
        try {
            const targets = await (await fetch("http://127.0.0.1:" + PORT + "/json/list")).json();
            const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
            if (page) return page.webSocketDebuggerUrl;
        } catch (e) {}
        await wait(200);
    }
    throw new Error("no page");
}

function send(ws, id, method, params) {
    return new Promise((resolve, reject) => {
        const onMessage = (event) => {
            const msg = JSON.parse(String(event.data));
            if (msg.id !== id) return;
            ws.removeEventListener("message", onMessage);
            if (msg.error) reject(new Error(JSON.stringify(msg.error)));
            else resolve(msg.result || {});
        };
        ws.addEventListener("message", onMessage);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
    "--headless=new", "--no-first-run", "--window-size=1440,980",
    "about:blank"
], { stdio: "ignore" });

try {
    const ws = new WebSocket(await pageWs());
    await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
    let id = 1;
    await send(ws, id++, "Page.enable");
    await send(ws, id++, "Runtime.enable");
    const consoleHook = [];
    ws.addEventListener("message", (event) => {
        const msg = JSON.parse(String(event.data));
        if (msg.method === "Runtime.exceptionThrown") {
            console.log("exception", JSON.stringify(msg.params.exceptionDetails || msg.params).slice(0, 800));
        }
        if (msg.method === "Runtime.consoleAPICalled") {
            console.log("console", (msg.params.args || []).map(a => a.value).join(" "));
        }
    });
    await send(ws, id++, "Console.enable");
    await send(ws, id++, "Page.navigate", { url: "http://127.0.0.1:3000/avatar.html?v=62" });
    await wait(4000);
    const err = await send(ws, id++, "Runtime.evaluate", {
        expression: `(() => {
            if (typeof window.openAthleteStudio === "function") {
                window.openAthleteStudio();
            } else {
                const btn = document.querySelector("[data-open-studio]");
                if (btn) btn.click();
            }
            const studio = document.getElementById("athleteStudio");
            return {
                hasFn: typeof window.openAthleteStudio === "function",
                pageError: window.__athleteStudioPageError,
                boot: window.__athleteStudioBoot || null,
                err: window.__athleteStudioError || null,
                opened: studio && !studio.hidden,
                openers: document.querySelectorAll("[data-open-studio]").length,
                ids: {
                    athlete: !!document.getElementById("studioAthlete"),
                    rig: !!document.getElementById("studioRig"),
                    face: !!document.getElementById("studioFace"),
                    stage: !!document.getElementById("studioStage"),
                    grid: !!document.getElementById("studioGrid"),
                    unequip: !!document.getElementById("studioUnequipBtn")
                },
                scripts: [...document.scripts].map(s => s.src.split("/").pop())
            };
        })()`,
        returnByValue: true
    });
    console.log("open", JSON.stringify(err.result.value));
    await wait(2500);
    const logs = await send(ws, id++, "Runtime.evaluate", {
        expression: `(() => {
            const canvas = document.getElementById("studioDress");
            const items = document.querySelectorAll(".studio-item").length;
            const tabs = [...document.querySelectorAll(".studio-tab")].map(t => t.textContent.trim());
            const stage = document.getElementById("studioStage");
            const rect = canvas && canvas.getBoundingClientRect();
            return {
                items,
                tabs,
                canvasW: canvas && canvas.width,
                canvasH: canvas && canvas.height,
                viewW: rect && Math.round(rect.width),
                viewH: rect && Math.round(rect.height),
                studioHidden: document.getElementById("athleteStudio").hidden,
                stageH: stage && Math.round(stage.getBoundingClientRect().height),
                hasArena: !!document.querySelector(".studio-scene-photo")
            };
        })()`,
        returnByValue: true
    });
    console.log("state", JSON.stringify(logs.result.value));
    const png = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "studio.png"), Buffer.from(png.data, "base64"));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelector('.studio-tab[data-tab="hats"]').click(); true`
    });
    await wait(400);
    const hatCount = await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelectorAll(".studio-item").length`,
        returnByValue: true
    });
    console.log("hats", hatCount.result.value);
    const hatsShot = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "hats-grid.png"), Buffer.from(hatsShot.data, "base64"));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelector('.studio-tab[data-tab="tops"]').click(); true`
    });
    await wait(400);
    const topCount = await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelectorAll(".studio-item").length`,
        returnByValue: true
    });
    console.log("tops", topCount.result.value);
    const topsGrid = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "tops-grid.png"), Buffer.from(topsGrid.data, "base64"));

    const topNames = await send(ws, id++, "Runtime.evaluate", {
        expression: `[...document.querySelectorAll(".studio-item span")].map(s => s.textContent)`,
        returnByValue: true
    });
    console.log("topNames", JSON.stringify(topNames.result.value));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelector('.studio-tab[data-tab="bottoms"]').click(); true`
    });
    await wait(400);
    const bottomNames = await send(ws, id++, "Runtime.evaluate", {
        expression: `[...document.querySelectorAll(".studio-item span")].map(s => s.textContent)`,
        returnByValue: true
    });
    console.log("bottomNames", JSON.stringify(bottomNames.result.value));
    const bottomsGrid = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "bottoms-grid.png"), Buffer.from(bottomsGrid.data, "base64"));

    const clamp = await send(ws, id++, "Runtime.evaluate", {
        expression: `(() => {
            const over = window.__studioSetRot(400, 0);
            window.__studioSetRot(0, 0);
            return {
                over,
                sides: document.querySelectorAll(".studio-side, .studio-back").length
            };
        })()`,
        returnByValue: true
    });
    console.log("spin", JSON.stringify(clamp.result.value));
    await wait(200);

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelector('.studio-tab[data-tab="skin"]').click(); document.querySelector('.studio-item[data-id="deep"]').click(); true`
    });
    await wait(1100);
    const deepShot = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "skin-deep.png"), Buffer.from(deepShot.data, "base64"));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelector('.studio-item[data-id="fair"]').click(); true`
    });
    await wait(800);
    const fairShot = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "skin-fair.png"), Buffer.from(fairShot.data, "base64"));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelector('.studio-tab[data-tab="tops"]').click(); document.querySelector('.studio-item[data-id="tee"]').click(); true`
    });
    await wait(1100);
    const teeShot = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "wear-tee.png"), Buffer.from(teeShot.data, "base64"));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelector('.studio-item[data-id="hoodie"]').click(); true`
    });
    await wait(1100);
    const hoodieShot = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "wear-hoodie.png"), Buffer.from(hoodieShot.data, "base64"));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelector('.studio-tab[data-tab="tops"]').click(); document.querySelector('.studio-item[data-id="jersey"]').click(); true`
    });
    await wait(1100);
    const jerseyShot = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "wear-jersey.png"), Buffer.from(jerseyShot.data, "base64"));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelector('.studio-tab[data-tab="bottoms"]').click(); document.querySelector('.studio-item[data-id="hoops"]').click(); true`
    });
    await wait(800);
    const hoopsShot = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "wear-hoops.png"), Buffer.from(hoopsShot.data, "base64"));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelector('.studio-tab[data-tab="player"]').click(); true`
    });
    await wait(300);

    for (const idName of ["beckham", "ronaldo", "durant"]) {
        await send(ws, id++, "Runtime.evaluate", {
            expression: `document.querySelector('.studio-tab[data-tab="player"]').click(); document.querySelector('.studio-item[data-id="${idName}"]').click(); true`
        });
        await wait(700);
        const shot = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
        writeFileSync(join(SHOTS, idName + ".png"), Buffer.from(shot.data, "base64"));
    }

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelector('.studio-item[data-id="curry"]').click(); document.querySelector('.studio-tab[data-tab="hats"]').click(); document.querySelector('.studio-item[data-id="cap"]').click(); true`
    });
    await wait(500);
    const cap = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "cap.png"), Buffer.from(cap.data, "base64"));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.getElementById("studioUnequipBtn").click(); document.querySelector('.studio-item[data-id="shades"]').click(); true`
    });
    await wait(400);
    const hats = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "hats.png"), Buffer.from(hats.data, "base64"));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.getElementById("studioUnequipBtn").click(); document.querySelector('.studio-tab[data-tab="tops"]').click(); document.querySelector('.studio-item[data-id="jersey"]').click(); true`
    });
    await wait(600);
    const tops = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "tops.png"), Buffer.from(tops.data, "base64"));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.querySelector('.studio-tab[data-tab="bottoms"]').click(); document.querySelector('.studio-item[data-id="hoops"]').click(); true`
    });
    await wait(500);
    const bottoms = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "bottoms.png"), Buffer.from(bottoms.data, "base64"));

    await send(ws, id++, "Runtime.evaluate", {
        expression: `document.getElementById("studioSaveBtn").click(); true`
    });
    await wait(500);
    const locker = await send(ws, id++, "Runtime.evaluate", {
        expression: `(() => {
            const name = document.querySelector(".avatar-profile-name");
            const img = document.querySelector(".avatar-profile-card img");
            return {
                studioHidden: document.getElementById("athleteStudio").hidden,
                name: name && name.textContent,
                img: img && img.getAttribute("src")
            };
        })()`,
        returnByValue: true
    });
    console.log("locker", JSON.stringify(locker.result.value));
    const after = await send(ws, id++, "Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, "locker-saved.png"), Buffer.from(after.data, "base64"));
    ws.close();
} finally {
    chrome.kill("SIGKILL");
}
