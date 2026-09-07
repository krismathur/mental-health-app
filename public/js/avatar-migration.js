/*
 * One-time migration from the retired real-athlete roster to MindZone's own
 * characters.
 *
 * The old build stored the picked avatar as {league, name, image, alt} — the
 * image *path*, not an id — so a returning player's saved avatar points at a
 * file that no longer exists. Left alone that renders a broken image rather
 * than falling back, so rewrite it before anything reads it.
 *
 * Must load after roster.js and before any script that reads the avatar keys.
 */
(function (global) {
    "use strict";

    var AVATAR_KEY = "selectedAthleteAvatar";
    var LOOK_KEY = "mindzone_athlete_look";
    var MIGRATION_KEY = "mindzone_roster_migrated";
    var MIGRATION_VERSION = "1";

    var roster = global.MindZoneRoster;

    if (!roster) {
        return;
    }

    if (localStorage.getItem(MIGRATION_KEY) === MIGRATION_VERSION) {
        return;
    }

    // Retired studio ids -> closest character in the new roster, matched on
    // sport so a returning player lands somewhere familiar.
    var ID_MAP = {
        curry: "amara", durant: "theo", giannis: "theo", jokic: "theo",
        doncic: "theo", embiid: "theo", tatum: "amara", edwards: "amara",
        booker: "amara", james: "theo",
        ohtani: "nora", judge: "nora", trout: "nora", acuna: "elena",
        betts: "elena", soto: "elena",
        ronaldo: "kofi", mbappe: "rafa", haaland: "kofi", neymar: "rafa",
        beckham: "rafa", messi: "rafa",
        mahomes: "malik", brady: "malik", jackson: "malik", kelce: "sione",
        alcaraz: "yuki"
    };

    // Retired league labels -> a sensible default character, used when the
    // saved value predates ids (meditation.html wrote surnames only).
    var LEAGUE_MAP = {
        NBA: "amara",
        MLB: "nora",
        MLS: "rafa",
        NFL: "malik",
        ATP: "yuki"
    };

    function readJSON(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || "null");
        } catch (error) {
            return null;
        }
    }

    function resolveCharacter(savedAvatar, savedLook) {
        var candidate = null;

        if (savedLook && savedLook.player) {
            candidate = ID_MAP[savedLook.player];
        }

        if (!candidate && savedAvatar) {
            if (savedAvatar.name) {
                candidate = ID_MAP[String(savedAvatar.name).toLowerCase()];
            }

            if (!candidate && savedAvatar.league) {
                candidate = LEAGUE_MAP[String(savedAvatar.league).toUpperCase()];
            }
        }

        return candidate ? roster.byId(candidate) : null;
    }

    var savedAvatar = readJSON(AVATAR_KEY);
    var savedLook = readJSON(LOOK_KEY);

    // Nothing saved: nothing to migrate, just stamp so this never runs again.
    if (!savedAvatar && !savedLook) {
        localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
        return;
    }

    // Already on the new roster (e.g. a second tab migrated first).
    if (savedLook && savedLook.player && roster.byId(savedLook.player)) {
        localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
        return;
    }

    var character = resolveCharacter(savedAvatar, savedLook);

    if (!character) {
        // Unrecognisable saved state — clear it so the player is prompted to
        // pick again rather than staring at a broken card.
        localStorage.removeItem(AVATAR_KEY);
        localStorage.removeItem(LOOK_KEY);
        localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
        return;
    }

    localStorage.setItem(AVATAR_KEY, JSON.stringify({
        id: character.id,
        league: character.league,
        name: character.name,
        image: character.image,
        alt: character.alt
    }));

    // Gear choices survive the swap; only the player identity and skin change.
    localStorage.setItem(LOOK_KEY, JSON.stringify({
        player: character.id,
        skin: (savedLook && savedLook.skin) || character.skin,
        top: (savedLook && savedLook.top) || "none",
        bottom: (savedLook && savedLook.bottom) || "none",
        hat: (savedLook && savedLook.hat) || "none",
        shoes: (savedLook && savedLook.shoes) || "none"
    }));

    localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
}(window));
