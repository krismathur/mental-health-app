/*
 * Rate limits.
 *
 * Two separate problems are being solved here:
 *
 *  1. Password guessing. /api/login had no limit at all, so an attacker could
 *     try passwords as fast as the network allowed.
 *  2. Bill shock. Every Gemini-backed route sat behind nothing but a session,
 *     so one logged-in account could drain the API key in an afternoon. The
 *     text-to-speech route is the expensive one and gets its own tighter cap.
 */
"use strict";

const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

// A logged-in kid is limited as a person, not as an IP, so a whole team on one
// school WiFi does not share a single quota. Falls back to IP before login.
function byUserOrIp(req) {
    if (req.session && req.session.userId) {
        return "user:" + req.session.userId;
    }

    return ipKeyGenerator(req.ip);
}

function jsonLimit(message) {
    return function (req, res) {
        res.status(429).json({ message: message });
    };
}

// Every CSS/JS/image/font file on a page would otherwise count against the
// global backstop below, so a handful of normal page loads could trip it.
// The backstop is meant to catch someone hammering real routes, not a
// browser fetching its own assets.
function isStaticAssetRequest(req) {
    return /\.(?:html?|js|css|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|mp3|mp4)$/i.test(req.path);
}

const common = {
    standardHeaders: "draft-7",
    legacyHeaders: false
};

// Broad backstop against a single host hammering the app.
const globalLimiter = rateLimit({
    ...common,
    windowMs: 15 * 60 * 1000,
    limit: 600,
    skip: isStaticAssetRequest,
    keyGenerator: function (req) {
        return ipKeyGenerator(req.ip);
    },
    handler: jsonLimit("You're going a bit fast. Please wait a minute and try again.")
});

// Credential endpoints. Deliberately strict, and counted per IP because the
// attacker controls the email field.
const authLimiter = rateLimit({
    ...common,
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    keyGenerator: function (req) {
        return ipKeyGenerator(req.ip);
    },
    handler: jsonLimit("Too many attempts. Please wait 15 minutes and try again.")
});

// Reset requests send real email to a real inbox. Counted per IP so nobody can
// use the endpoint to flood one kid's mailbox, and low enough that it is not a
// useful way to probe which addresses have accounts.
const resetRequestLimiter = rateLimit({
    ...common,
    windowMs: 60 * 60 * 1000,
    limit: 5,
    keyGenerator: function (req) {
        return ipKeyGenerator(req.ip);
    },
    handler: jsonLimit("Too many reset requests. Please wait an hour and try again.")
});

// Everything that costs a Gemini call.
const aiLimiter = rateLimit({
    ...common,
    windowMs: 60 * 60 * 1000,
    limit: 60,
    keyGenerator: byUserOrIp,
    handler: jsonLimit("You've used a lot of coaching for one hour. Take a break and come back soon.")
});

// Audio generation is billed per character and is the easiest way to run up a
// bill by accident, so it is capped harder than the text routes. One segment
// of a guided program == one request here; the longest programs run ~24
// segments, so the cap needs headroom for a couple of full sessions per hour.
const speechLimiter = rateLimit({
    ...common,
    windowMs: 60 * 60 * 1000,
    limit: 60,
    keyGenerator: byUserOrIp,
    handler: jsonLimit("That's a lot of guided audio for one hour. Try again a bit later.")
});

module.exports = { globalLimiter, authLimiter, resetRequestLimiter, aiLimiter, speechLimiter };
