/*
 * MindZone character roster — the single source of truth for playable athletes.
 *
 * Every character here is fictional. Names, likenesses, and league labels are
 * original to MindZone and must stay that way: do not add real athletes, real
 * league names (NBA/NFL/MLB/MLS/ATP), or photographs of real people. See
 * docs/character-art-spec.md before adding or regenerating art.
 *
 * Shape note: `name` is the short display name the studio grid and profile card
 * render, and `league` is the display label — the retired roster used those two
 * fields the same way, so downstream code did not have to change.
 */
(function (global) {
    "use strict";

    var LEAGUES = [
        { id: "hoops", label: "HOOPS", sport: "basketball" },
        { id: "pitch", label: "PITCH", sport: "soccer" },
        { id: "diamond", label: "DIAMOND", sport: "baseball" },
        { id: "gridiron", label: "GRIDIRON", sport: "football" },
        { id: "court", label: "COURT", sport: "tennis" }
    ];

    // `skin` is the tone the studio starts a character on; players can change
    // it. `build` drives nothing in code — it documents the intent of the art
    // so regenerated assets stay consistent with each other.
    var CHARACTERS = [
        {
            id: "amara",
            name: "Osei",
            fullName: "Amara Osei",
            leagueId: "hoops",
            position: "Guard",
            skin: "deep",
            build: "lean, average height"
        },
        {
            id: "theo",
            name: "Marchetti",
            fullName: "Theo Marchetti",
            leagueId: "hoops",
            position: "Forward",
            skin: "fair",
            build: "tall, long-limbed"
        },
        {
            id: "rafa",
            name: "Quintero",
            fullName: "Rafa Quintero",
            leagueId: "pitch",
            position: "Winger",
            skin: "tan",
            build: "compact, low centre of gravity"
        },
        {
            id: "kofi",
            name: "Mensah",
            fullName: "Kofi Mensah",
            leagueId: "pitch",
            position: "Striker",
            skin: "rich",
            build: "athletic, broad shoulders"
        },
        {
            id: "nora",
            name: "Beck",
            fullName: "Nora Beck",
            leagueId: "diamond",
            position: "Pitcher",
            skin: "light",
            build: "tall, lanky"
        },
        {
            id: "elena",
            name: "Duarte",
            fullName: "Elena Duarte",
            leagueId: "diamond",
            position: "Infielder",
            skin: "tan",
            build: "compact, strong through the hips"
        },
        {
            id: "malik",
            name: "Turner",
            fullName: "Malik Turner",
            leagueId: "gridiron",
            position: "Quarterback",
            skin: "brown",
            build: "upright, square shoulders"
        },
        {
            id: "sione",
            name: "Faletau",
            fullName: "Sione Faletau",
            leagueId: "gridiron",
            position: "Linebacker",
            skin: "tan",
            build: "heavy, thick through the chest"
        },
        {
            id: "yuki",
            name: "Tanaka",
            fullName: "Yuki Tanaka",
            leagueId: "court",
            position: "Baseline",
            skin: "light",
            build: "lean, wiry"
        },
        {
            id: "priya",
            name: "Raman",
            fullName: "Priya Raman",
            leagueId: "court",
            position: "All-court",
            skin: "brown",
            build: "lean, long reach"
        }
    ];

    // Bump when art is regenerated so browsers drop the cached files.
    var ART_VERSION = 1;

    function labelFor(leagueId) {
        var league = LEAGUES.find(function (item) {
            return item.id === leagueId;
        });
        return league ? league.label : "";
    }

    function sportFor(leagueId) {
        var league = LEAGUES.find(function (item) {
            return item.id === leagueId;
        });
        return league ? league.sport : "";
    }

    CHARACTERS.forEach(function (character) {
        character.league = labelFor(character.leagueId);
        character.sport = sportFor(character.leagueId);
        character.image = "images/characters/" + character.id + ".jpg?v=" + ART_VERSION;
        character.body = "images/characters/bodies/body-" + character.id + ".png?v=" + ART_VERSION;
        character.alt = character.fullName + ", MindZone " + character.sport + " character";
    });

    function byId(id) {
        return CHARACTERS.find(function (character) {
            return character.id === id;
        }) || null;
    }

    function byLeague(leagueId) {
        return CHARACTERS.filter(function (character) {
            return character.leagueId === leagueId;
        });
    }

    global.MindZoneRoster = {
        LEAGUES: LEAGUES,
        CHARACTERS: CHARACTERS,
        ART_VERSION: ART_VERSION,
        byId: byId,
        byLeague: byLeague,
        labelFor: labelFor,
        first: function () {
            return CHARACTERS[0];
        }
    };
}(window));
