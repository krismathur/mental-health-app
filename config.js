/*
 * Environment configuration, validated once at boot.
 *
 * The point of failing here is that every one of these mistakes used to fail
 * silently in a way that looked fine locally: a hardcoded session secret, a
 * missing API key surfacing as a 500 the first time a kid opened the coach.
 * In production the process refuses to start instead.
 */
"use strict";

// Loaded here rather than in server.js so validation cannot run before the
// .env file does, whatever requires this module first.
require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

const problems = [];

function required(name, hint) {
    const value = (process.env[name] || "").trim();

    if (!value) {
        if (isProduction) {
            problems.push(`  ${name} is not set — ${hint}`);
        }
        return "";
    }

    return value;
}

const sessionSecret = required(
    "SESSION_SECRET",
    "generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
);

const geminiApiKey = required("GEMINI_API_KEY", "the coach, plans, and meditation audio all need it");
const geminiModel = required("GEMINI_MODEL", "for example: gemini-2.5-flash");

// A dev-only fallback so `npm start` still works on a laptop with no .env.
// Never reached in production because the check above already exited.
const DEV_SECRET = "mindzone-development-only-secret-do-not-ship";

if (isProduction && sessionSecret === DEV_SECRET) {
    problems.push("  SESSION_SECRET is still the development placeholder");
}

// Password reset is the one flow that needs outbound mail. It is optional so
// that a laptop with no .env still boots, but production says so at startup
// rather than letting a kid request a reset that can never arrive.
const smtp = {
    host: (process.env.SMTP_HOST || "").trim(),
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: (process.env.SMTP_USER || "").trim(),
    pass: process.env.SMTP_PASS || "",
    from: (process.env.MAIL_FROM || "").trim() || "MindZone <no-reply@mindzone.app>"
};

if (isProduction && !(smtp.host && smtp.user && smtp.pass)) {
    console.warn(
        "\n[config] SMTP_HOST / SMTP_USER / SMTP_PASS are not set.\n" +
        "         Password reset is disabled: /api/forgot-password will return 503\n" +
        "         and the 'Forgot password?' link stays hidden.\n"
    );
}

if (problems.length) {
    console.error("\nMindZone cannot start in production:\n" + problems.join("\n") + "\n");
    process.exit(1);
}

module.exports = {
    NODE_ENV,
    isProduction,
    port: parseInt(process.env.PORT, 10) || 3000,
    sessionSecret: sessionSecret || DEV_SECRET,
    geminiApiKey,
    geminiModel,
    // Hostinger and every other managed host put a proxy in front of the app,
    // so req.protocol and the client IP are only correct once this is on.
    trustProxy: process.env.TRUST_PROXY === "false" ? false : 1,
    // Managed hosts mount the writable disk at their own path, and the test
    // suite points this at a throwaway file.
    dataDir: process.env.DATA_DIR || "",
    smtp,
    // Reset links have to be absolute, and a link is the one thing we cannot
    // build from the request: an attacker controls the Host header, so
    // trusting it would let them point a real reset token at their own site.
    appUrl: (process.env.APP_URL || "").trim().replace(/\/+$/, "")
};
