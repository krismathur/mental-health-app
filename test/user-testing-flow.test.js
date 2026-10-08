"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("the primary daily practice has three guided tap-first steps", function () {
    const html = read("public/daily-session.html");
    const css = read("public/css/daily-session.css");
    const script = read("public/js/daily-session.js");

    assert.match(html, /STEP 1 OF 3 · PICTURE IT/);
    assert.match(html, /STEP 2 OF 3 · BREATHE/);
    assert.match(html, /STEP 3 OF 3 · LET IT GO/);
    assert.doesNotMatch(html, /<textarea|type="text"/);
    assert.match(html, /id="visualizeProgressFill"/);
    assert.match(html, /id="visualizeReadAlong"/);
    assert.match(html, /id="dailyRoutineName"/);
    assert.match(script, /const DAILY_ROUTINES = \[/);
    assert.match(script, /getDailyRoutineIndex\(todayKey\(\)\)/);
    assert.match(css, /linear-gradient\(145deg, #071525, #0b213b/);
    assert.match(css, /min-height: 530px/);
});

test("the dashboard leads with one daily practice", function () {
    const html = read("public/welcome.html");
    const rewards = read("public/js/rewards.js");
    const dashboard = read("public/js/welcome.js");
    const navigation = read("public/js/nav.js");

    assert.match(html, /href="daily-session\.html"/);
    assert.match(html, /Three simple steps/);
    assert.match(html, /<section class="plan-details tool-plan tool-card">/);
    assert.doesNotMatch(html, /plan-details-toggle/);
    assert.match(html, /A simple focus matched to you/);
    assert.match(rewards, /NEXT WIN/);
    assert.match(rewards, /simple-reward-progress-track/);
    assert.match(rewards, /levelProgressFill\.style\.width/);
    assert.doesNotMatch(rewards, /<span style="width: \$\{levelProgress\}%"><\/span>/);
    assert.match(html, /data-settings-tab="profile"/);
    assert.match(html, /data-settings-tab="checkin"/);
    assert.match(html, /data-settings-tab="account"/);
    assert.match(dashboard, /function setSettingsTab\(tabName\)/);
    assert.match(html, /id="deleteAccountBtn"/);
    assert.match(navigation, /fetch\("\/api\/account", \{ method: "DELETE" \}\)/);
    assert.doesNotMatch(html, /Five simple activities/);
});

test("landing athlete cards use licensed real sports photography", function () {
    const html = read("public/index.html");

    assert.match(html, /images\/athletes\/tennis-player\.jpg/);
    assert.match(html, /images\/athletes\/basketball-player\.jpg/);
    assert.match(html, /images\/athletes\/soccer-player\.jpg/);
    assert.match(html, /No endorsement or affiliation is implied/);
    assert.match(html, /Pexels/);
    assert.doesNotMatch(html, /fictional MindZone/);
});

test("optional skill zones still present only one clear daily choice", function () {
    const meditation = read("public/js/meditation.js");
    const filmRoom = read("public/js/video-library.js");
    const meditationCss = read("public/css/meditation.css");
    const filmRoomCss = read("public/css/video-library.css");

    assert.match(meditation, /Try this today/);
    assert.match(meditation, /One short session is enough for today/);
    assert.match(filmRoom, /new Set\(\["video-tennis", "video-focus", "video-reset"\]\)/);
    assert.match(filmRoom, /\.mental-tags a/);
    assert.match(meditationCss, /\.med-panel\.reset-panel \{[\s\S]*width: min\(900px/);
    assert.match(filmRoomCss, /\.video-item \{[\s\S]*min-height: 134px/);
});
