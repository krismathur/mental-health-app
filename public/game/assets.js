/**
 * Image loading for The Impossible Mountain.
 *
 * Every draw path in render.js has a flat-colour fallback, so a missing or slow
 * image never blocks the game from starting.
 */

const IMAGE_SOURCES = {
    sky: "images/mountain-sky.png",
    rock: "images/rock-tile.png",
    ice: "images/ice-tile.png",
    crystal: "images/crystal.png",
    "climber-red": "images/climber-red.png",
    "climber-teal": "images/climber-teal.png",
    "climber-orange": "images/climber-orange.png"
};

export const images = {};

function loadImage(key, src) {
    return new Promise(function (resolve) {
        const image = new Image();

        image.addEventListener("load", function () {
            images[key] = image;
            resolve();
        });

        image.addEventListener("error", function () {
            console.warn("Could not load game asset:", src);
            resolve();
        });

        image.src = src;
    });
}

export function loadAssets() {
    const jobs = Object.keys(IMAGE_SOURCES).map(function (key) {
        return loadImage(key, IMAGE_SOURCES[key]);
    });

    return Promise.all(jobs);
}
