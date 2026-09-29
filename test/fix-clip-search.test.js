"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fixClipSearch = require("../routes/fixClipSearch");

test("visualization clips are capped at one minute", function () {
    assert.strictEqual(fixClipSearch.MAX_CLIP_SECONDS, 60);
});
