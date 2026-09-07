/*
 * Crisis screening is the highest-stakes logic in the app, so it is tested
 * directly rather than only through the HTTP route.
 *
 * The bias these tests encode: a missed crisis is a serious failure, an
 * unnecessary help card is a minor annoyance. Where the two conflict, the
 * assertions favour catching it.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const safety = require("../routes/safety");

test("catches direct statements of self-harm", function () {
    const messages = [
        "i want to kill myself",
        "I've been thinking about killing myself",
        "im suicidal",
        "I want to die",
        "i wish i was dead",
        "everyone would be better off dead without me",
        "I want to end my life",
        "sometimes I hurt myself after a bad game",
        "I have been cutting myself",
        "there is no reason to live",
        "I don't want to be alive anymore"
    ];

    for (const message of messages) {
        const result = safety.screen(message);
        assert.strictEqual(result.flagged, true, "should flag: " + message);
        assert.strictEqual(result.category, "self_harm");
    }
});

test("catches disclosures of abuse", function () {
    for (const message of ["my dad hits me", "my stepdad beats me", "im scared to go home"]) {
        assert.strictEqual(safety.screen(message).flagged, true, "should flag: " + message);
    }
});

test("catches threats toward other people", function () {
    for (const message of ["i want to hurt someone", "im going to bring a knife to school"]) {
        assert.strictEqual(safety.screen(message).flagged, true, "should flag: " + message);
    }
});

test("leaves ordinary sports frustration alone", function () {
    const messages = [
        "I killed it at practice today",
        "my shoulder hurts after practice",
        "I want to beat my personal best",
        "I am dead tired after that run",
        "coach benched me and I'm so mad",
        "I choked in the final and felt awful",
        "we got destroyed 5-0",
        "I'm nervous about tryouts tomorrow",
        "I hate losing so much"
    ];

    for (const message of messages) {
        assert.strictEqual(safety.screen(message).flagged, false, "should NOT flag: " + message);
    }
});

test("ignores empty and malformed input", function () {
    for (const value of ["", "   ", null, undefined, 12345, {}]) {
        assert.strictEqual(safety.screen(value).flagged, false);
    }
});

test("every category returns a reply and real resources", function () {
    for (const category of ["self_harm", "abuse", "violence"]) {
        const response = safety.crisisResponse(category);

        assert.strictEqual(response.crisis, true);
        assert.ok(response.reply.length > 80, "reply should be substantial");
        assert.ok(response.resources.length >= 3, "should offer several options");

        for (const resource of response.resources) {
            assert.ok(resource.name && resource.contact && resource.detail);
        }
    }
});

test("the 988 lifeline is always offered", function () {
    const contacts = safety.RESOURCES.map(function (r) { return r.contact; }).join(" ");
    assert.match(contacts, /988/);
    assert.match(contacts, /741741/);
});
