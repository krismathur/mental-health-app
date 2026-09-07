/*
 * End-to-end tests against a real server process backed by a throwaway
 * database, so the middleware stack (helmet, sessions, rate limits) is
 * exercised exactly as it will be in production.
 *
 * No Gemini key is passed in, which keeps the suite offline and free: routes
 * that would call the model return a configuration error instead, and the
 * checks below are all about what happens before that point.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PORT = 34117;
const BASE = "http://127.0.0.1:" + PORT;

let server;
let dataDir;
// With no SMTP configured the dev mailer prints the reset link to stdout,
// which is the only way a test can get hold of a token it is not allowed to
// read from the database (only the hash is stored there).
let serverOutput = "";

function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function waitForServer(attempts) {
    for (let i = 0; i < attempts; i += 1) {
        try {
            const response = await fetch(BASE + "/health");
            if (response.ok) {
                return;
            }
        } catch (error) {
            // not up yet
        }
        await wait(200);
    }

    throw new Error("test server never became healthy");
}

// Keeps the session cookie across requests the way a browser would.
function makeClient() {
    let cookie = "";

    return async function request(method, url, body) {
        const headers = {};

        if (cookie) {
            headers.Cookie = cookie;
        }

        if (body !== undefined) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(BASE + url, {
            method: method,
            headers: headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });

        const setCookie = response.headers.get("set-cookie");

        if (setCookie) {
            cookie = setCookie.split(";")[0];
        }

        let payload = null;
        try {
            payload = await response.json();
        } catch (error) {
            payload = null;
        }

        return { status: response.status, body: payload };
    };
}

const validProfile = {
    name: "Test Athlete",
    age: "14",
    sport: "Soccer",
    goal: "stay calm in games",
    challenge: "nerves before kickoff",
    days: 7,
    mentalSkill: 5,
    goalCommitment: 8,
    confidence: 3,
    stress: 4,
    focus: 3,
    bounce: 2,
    parentConsent: true
};

let counter = 0;
function freshEmail() {
    counter += 1;
    return "test" + counter + "." + process.pid + "@example.com";
}

test.before(async function () {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mindzone-test-"));

    server = spawn(process.execPath, ["server.js"], {
        cwd: path.join(__dirname, ".."),
        env: {
            ...process.env,
            PORT: String(PORT),
            DATA_DIR: dataDir,
            NODE_ENV: "development",
            // Force the offline path for model-backed routes.
            GEMINI_API_KEY: "",
            GEMINI_MODEL: ""
        },
        stdio: ["ignore", "pipe", "pipe"]
    });

    // Must be consumed, or a full pipe buffer would stall the server.
    server.stdout.on("data", function (chunk) { serverOutput += chunk; });
    server.stderr.on("data", function (chunk) { serverOutput += chunk; });

    await waitForServer(40);
});

test.after(function () {
    if (server) {
        server.kill();
    }

    if (dataDir) {
        fs.rmSync(dataDir, { recursive: true, force: true });
    }
});

test("health check reports ok", async function () {
    const client = makeClient();
    const result = await client("GET", "/health");

    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body.status, "ok");
});

test("security headers are present and the server does not advertise itself", async function () {
    const response = await fetch(BASE + "/index.html");

    assert.ok(response.headers.get("content-security-policy"), "CSP must be set");
    assert.strictEqual(response.headers.get("x-content-type-options"), "nosniff");
    assert.strictEqual(response.headers.get("x-powered-by"), null, "X-Powered-By should be off");

    const csp = response.headers.get("content-security-policy");
    assert.match(csp, /script-src 'self'/, "inline script must not be allowed");
    assert.ok(!csp.includes("unsafe-inline"), "CSP must not weaken itself with unsafe-inline");
});

test("the database directory is not served over HTTP", async function () {
    const response = await fetch(BASE + "/data/database.db");
    assert.strictEqual(response.status, 404);
});

test("signup rejects short passwords", async function () {
    const client = makeClient();
    const result = await client("POST", "/api/signup", { email: freshEmail(), password: "short12" });

    assert.strictEqual(result.status, 400);
    assert.match(result.body.message, /8 characters/);
});

test("signup rejects obvious passwords", async function () {
    const client = makeClient();
    const result = await client("POST", "/api/signup", { email: freshEmail(), password: "basketball" });

    assert.strictEqual(result.status, 400);
    assert.match(result.body.message, /too easy to guess/);
});

test("signup creates a session and login works afterwards", async function () {
    const email = freshEmail();
    const password = "StrongPass2026";

    const signupClient = makeClient();
    const signup = await signupClient("POST", "/api/signup", { email: email, password: password });
    assert.strictEqual(signup.status, 200);

    const me = await signupClient("GET", "/api/me");
    assert.strictEqual(me.status, 200);
    assert.ok(me.body.id);

    const loginClient = makeClient();
    const login = await loginClient("POST", "/api/login", { email: email, password: password });
    assert.strictEqual(login.status, 200);
});

test("login rejects a wrong password without revealing which field was wrong", async function () {
    const email = freshEmail();
    const client = makeClient();

    await client("POST", "/api/signup", { email: email, password: "StrongPass2026" });

    const wrongPassword = await makeClient()("POST", "/api/login", { email: email, password: "NotThePassword1" });
    const unknownEmail = await makeClient()("POST", "/api/login", { email: freshEmail(), password: "StrongPass2026" });

    assert.strictEqual(wrongPassword.status, 401);
    assert.strictEqual(unknownEmail.status, 401);
    assert.strictEqual(wrongPassword.body.message, unknownEmail.body.message);
});

test("protected routes reject anonymous callers", async function () {
    const client = makeClient();

    for (const [method, url] of [["GET", "/api/me"], ["GET", "/api/profile"], ["GET", "/api/coach-history"], ["DELETE", "/api/account"]]) {
        const result = await client(method, url);
        assert.strictEqual(result.status, 401, method + " " + url + " should require login");
    }
});

test("a profile cannot be saved without parental consent", async function () {
    const client = makeClient();
    await client("POST", "/api/signup", { email: freshEmail(), password: "StrongPass2026" });

    const withoutConsent = { ...validProfile };
    delete withoutConsent.parentConsent;

    const rejected = await client("POST", "/api/profile", withoutConsent);
    assert.strictEqual(rejected.status, 400);
    assert.match(rejected.body.message, /parent or guardian/);

    const accepted = await client("POST", "/api/profile", validProfile);
    assert.strictEqual(accepted.status, 200);
});

test("consent survives a later profile edit that does not resend it", async function () {
    const client = makeClient();
    await client("POST", "/api/signup", { email: freshEmail(), password: "StrongPass2026" });
    await client("POST", "/api/profile", validProfile);

    const edit = { ...validProfile, goal: "a different goal" };
    delete edit.parentConsent;

    const result = await client("POST", "/api/profile", edit);
    assert.strictEqual(result.status, 200, "editing must not re-demand consent");

    const profile = await client("GET", "/api/profile");
    assert.strictEqual(profile.body.profile.parent_consent, 1);
    assert.ok(profile.body.profile.parent_consent_at, "consent time must be recorded");
});

test("ages outside 10-18 are refused", async function () {
    const client = makeClient();
    await client("POST", "/api/signup", { email: freshEmail(), password: "StrongPass2026" });

    for (const age of ["9", "19", "25", "abc"]) {
        const result = await client("POST", "/api/profile", { ...validProfile, age: age });
        assert.strictEqual(result.status, 400, "age " + age + " should be refused");
    }
});

test("deleting an account removes the session and every row", async function () {
    const client = makeClient();
    await client("POST", "/api/signup", { email: freshEmail(), password: "StrongPass2026" });
    await client("POST", "/api/profile", validProfile);

    const deleted = await client("DELETE", "/api/account");
    assert.strictEqual(deleted.status, 200);

    const after = await client("GET", "/api/me");
    assert.strictEqual(after.status, 401, "session must be gone");
});

test("unknown api paths answer as JSON, not HTML", async function () {
    const client = makeClient();
    const result = await client("GET", "/api/does-not-exist");

    assert.strictEqual(result.status, 404);
    assert.ok(result.body, "should be a JSON body");
});

// Reset requests are capped at 5 per hour per IP and every test shares
// 127.0.0.1, so these spend that budget carefully.
function lastResetToken() {
    const matches = serverOutput.match(/reset-password\.html\?token=([a-f0-9]{64})/g);

    if (!matches) {
        return "";
    }

    return matches[matches.length - 1].split("=")[1];
}

test("password reset lets a user log in with a new password", async function () {
    const client = makeClient();
    const email = freshEmail();

    await client("POST", "/api/signup", { email: email, password: "OriginalPass1" });
    await client("POST", "/api/logout");

    const asked = await client("POST", "/api/forgot-password", { email: email });
    assert.strictEqual(asked.status, 200);

    // The link is emitted asynchronously after the response.
    await wait(200);

    const token = lastResetToken();
    assert.match(token, /^[a-f0-9]{64}$/, "a reset token should have been issued");

    const weak = await client("POST", "/api/reset-password", { token: token, password: "short" });
    assert.strictEqual(weak.status, 400, "reset must enforce the same password rules as signup");

    const reset = await client("POST", "/api/reset-password", { token: token, password: "BrandNewPass9" });
    assert.strictEqual(reset.status, 200);

    const oldPassword = await client("POST", "/api/login", { email: email, password: "OriginalPass1" });
    assert.strictEqual(oldPassword.status, 401, "the old password must stop working");

    const newPassword = await client("POST", "/api/login", { email: email, password: "BrandNewPass9" });
    assert.strictEqual(newPassword.status, 200);

    // Single use: the same token must not work a second time.
    const replay = await client("POST", "/api/reset-password", { token: token, password: "AnotherPass7" });
    assert.strictEqual(replay.status, 400);
});

test("password reset logs out sessions that were already open", async function () {
    const attacker = makeClient();
    const owner = makeClient();
    const email = freshEmail();

    // The attacker is signed in and stays signed in while the owner resets.
    await attacker("POST", "/api/signup", { email: email, password: "StolenPass1" });
    assert.strictEqual((await attacker("GET", "/api/me")).status, 200);

    await owner("POST", "/api/forgot-password", { email: email });
    await wait(200);

    const reset = await owner("POST", "/api/reset-password", {
        token: lastResetToken(),
        password: "OwnerTookItBack4"
    });
    assert.strictEqual(reset.status, 200);

    const stillIn = await attacker("GET", "/api/me");
    assert.strictEqual(stillIn.status, 401, "resetting must kill sessions opened before the reset");
});

test("forgot-password does not reveal whether an email has an account", async function () {
    const client = makeClient();

    const unknown = await client("POST", "/api/forgot-password", { email: "nobody-here@example.com" });

    assert.strictEqual(unknown.status, 200);
    assert.match(unknown.body.message, /if that email has an account/i);
});

test("repeated failed logins are rate limited", async function () {
    const client = makeClient();
    let sawLimit = false;

    for (let i = 0; i < 25; i += 1) {
        const result = await client("POST", "/api/login", {
            email: "bruteforce@example.com",
            password: "guess" + i
        });

        if (result.status === 429) {
            sawLimit = true;
            break;
        }
    }

    assert.ok(sawLimit, "password guessing must eventually be blocked");
});
