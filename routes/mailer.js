/*
 * Outbound email, used only by the password reset flow.
 *
 * The app has never sent mail before, so this is deliberately the smallest
 * thing that works: one transport, one template. Two behaviours worth knowing:
 *
 *   - With no SMTP settings the transport is null and `isConfigured` is false.
 *     Callers check that and say so out loud rather than accepting a reset
 *     request they cannot deliver. A password reset that silently goes nowhere
 *     is worse than one that admits it is turned off.
 *   - In development with no SMTP settings the link is printed to the server
 *     console instead, so the flow is testable on a laptop.
 */
"use strict";

const nodemailer = require("nodemailer");
const config = require("../config");

const smtp = config.smtp;
const isConfigured = !!(smtp.host && smtp.user && smtp.pass);

const transport = isConfigured
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        // Port 465 is implicit TLS. Everything else (587, 25) starts in the
        // clear and upgrades via STARTTLS, which nodemailer does on its own.
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass }
    })
    : null;

function resetEmail(link) {
    const text = [
        "Someone asked to reset the password for your MindZone account.",
        "",
        "Open this link to pick a new one. It stops working in one hour:",
        link,
        "",
        "If that wasn't you, you can ignore this email. Your password stays the same.",
        "",
        "— MindZone"
    ].join("\n");

    // Kept to plain-ish HTML on purpose: no images, no tracking pixel, no
    // remote stylesheet. Nothing here needs to phone home.
    const html = [
        '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.6;color:#1c1c22">',
        "<p>Someone asked to reset the password for your MindZone account.</p>",
        "<p>Pick a new one here. The link stops working in one hour:</p>",
        '<p><a href="' + link + '" style="background:#e03131;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:700">Reset my password</a></p>',
        "<p>If that wasn't you, you can ignore this email. Your password stays the same.</p>",
        "<p>— MindZone</p>",
        "</div>"
    ].join("");

    return { text, html };
}

async function sendPasswordReset(to, link) {
    if (!transport) {
        // Dev convenience. Guarded by isProduction so a misconfigured
        // production box can never print a live reset token into its logs.
        if (!config.isProduction) {
            console.log("\n[mailer] SMTP is not configured. Reset link for " + to + ":\n" + link + "\n");
            return true;
        }
        return false;
    }

    const body = resetEmail(link);

    await transport.sendMail({
        from: smtp.from,
        to: to,
        subject: "Reset your MindZone password",
        text: body.text,
        html: body.html
    });

    return true;
}

module.exports = { isConfigured, sendPasswordReset };
