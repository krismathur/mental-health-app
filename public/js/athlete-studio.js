const AVATAR_STORAGE_KEY = "selectedAthleteAvatar";
const LOOK_KEY = "mindzone_athlete_look";

function bodyPath(id) {
    return "images/studio/bodies/body-" + id + ".png?v=23";
}

const PLAYERS = [
    { id: "curry", name: "Curry", league: "NBA", image: "images/nba/curry.jpg", body: bodyPath("curry"), alt: "Stephen Curry" },
    { id: "durant", name: "Durant", league: "NBA", image: "images/nba/durant.jpg", body: bodyPath("durant"), alt: "Kevin Durant" },
    { id: "giannis", name: "Antetokounmpo", league: "NBA", image: "images/nba/antetokounmpo.jpg", body: bodyPath("giannis"), alt: "Giannis Antetokounmpo" },
    { id: "jokic", name: "Jokic", league: "NBA", image: "images/nba/jokic.jpg", body: bodyPath("jokic"), alt: "Nikola Jokic" },
    { id: "doncic", name: "Doncic", league: "NBA", image: "images/nba/doncic.jpg", body: bodyPath("doncic"), alt: "Luka Doncic" },
    { id: "embiid", name: "Embiid", league: "NBA", image: "images/nba/embiid.jpg", body: bodyPath("embiid"), alt: "Joel Embiid" },
    { id: "tatum", name: "Tatum", league: "NBA", image: "images/nba/tatum.jpg", body: bodyPath("tatum"), alt: "Jayson Tatum" },
    { id: "edwards", name: "Edwards", league: "NBA", image: "images/nba/edwards.jpg", body: bodyPath("edwards"), alt: "Anthony Edwards" },
    { id: "booker", name: "Booker", league: "NBA", image: "images/nba/booker.jpg", body: bodyPath("booker"), alt: "Devin Booker" },
    { id: "ohtani", name: "Ohtani", league: "MLB", image: "images/mlb/ohtani.jpg", body: bodyPath("ohtani"), alt: "Shohei Ohtani" },
    { id: "judge", name: "Judge", league: "MLB", image: "images/mlb/judge.jpg", body: bodyPath("judge"), alt: "Aaron Judge" },
    { id: "trout", name: "Trout", league: "MLB", image: "images/mlb/trout.jpg", body: bodyPath("trout"), alt: "Mike Trout" },
    { id: "acuna", name: "Acuña", league: "MLB", image: "images/mlb/acuna.jpg", body: bodyPath("acuna"), alt: "Ronald Acuña Jr." },
    { id: "betts", name: "Betts", league: "MLB", image: "images/mlb/betts.jpg", body: bodyPath("betts"), alt: "Mookie Betts" },
    { id: "soto", name: "Soto", league: "MLB", image: "images/mlb/soto.jpg", body: bodyPath("soto"), alt: "Juan Soto" },
    { id: "ronaldo", name: "Ronaldo", league: "MLS", image: "images/mls/ronaldo.jpg", body: bodyPath("ronaldo"), alt: "Cristiano Ronaldo" },
    { id: "mbappe", name: "Mbappe", league: "MLS", image: "images/mls/mbappe.jpg", body: bodyPath("mbappe"), alt: "Kylian Mbappé" },
    { id: "haaland", name: "Haaland", league: "MLS", image: "images/mls/haaland.jpg", body: bodyPath("haaland"), alt: "Erling Haaland" },
    { id: "neymar", name: "Neymar", league: "MLS", image: "images/mls/neymar.jpg", body: bodyPath("neymar"), alt: "Neymar" },
    { id: "beckham", name: "Beckham", league: "MLS", image: "images/mls/beckham.jpg", body: bodyPath("beckham"), alt: "David Beckham" },
    { id: "mahomes", name: "Mahomes", league: "NFL", image: "images/nfl/mahomes.jpg", body: bodyPath("mahomes"), alt: "Patrick Mahomes" },
    { id: "brady", name: "Brady", league: "NFL", image: "images/nfl/brady.jpg", body: bodyPath("brady"), alt: "Tom Brady" },
    { id: "jackson", name: "Jackson", league: "NFL", image: "images/nfl/jackson.jpg", body: bodyPath("jackson"), alt: "Lamar Jackson" },
    { id: "kelce", name: "Kelce", league: "NFL", image: "images/nfl/kelce.jpg", body: bodyPath("kelce"), alt: "Travis Kelce" },
    { id: "alcaraz", name: "Alcaraz", league: "ATP", image: "images/alcaraz.jpg", body: bodyPath("alcaraz"), alt: "Carlos Alcaraz" }
];

const SKINS = [
    { id: "fair", name: "Fair", color: "#f3d2c2", photo: "images/studio/skins/skin-fair.png" },
    { id: "light", name: "Light", color: "#e0ac86", photo: "images/studio/skins/skin-light.png" },
    { id: "tan", name: "Tan", color: "#c68642", photo: "images/studio/skins/skin-tan.png" },
    { id: "brown", name: "Brown", color: "#8d5524", photo: "images/studio/skins/skin-brown.png" },
    { id: "deep", name: "Deep", color: "#5c3317", photo: "images/studio/skins/skin-deep.png" },
    { id: "rich", name: "Rich", color: "#3b2214", photo: "images/studio/skins/skin-rich.png" }
];

const TOPS = [
    { id: "none", name: "None" },
    { id: "tee", name: "White tee", color: "#f4f4f4", sleeves: true, photo: "images/studio/gear/gear-top-tee.png?v=12" },
    { id: "hoodie", name: "Navy hoodie", color: "#1b3658", wide: true, sleeves: true, photo: "images/studio/gear/gear-top-hoodie.png?v=4" },
    { id: "ziphoodie", name: "Blue zip hoodie", color: "#2e5aa8", wide: true, sleeves: true, photo: "images/studio/gear/gear-top-ziphoodie.png?v=1" },
    { id: "bomber", name: "Bomber jacket", color: "#1a1a1a", wide: true, sleeves: true, photo: "images/studio/gear/gear-top-bomber.png?v=1" },
    { id: "puffer", name: "Puffer vest", color: "#222222", wide: true, photo: "images/studio/gear/gear-top-puffer.png?v=1" },
    { id: "polo", name: "Red polo", color: "#c4122f", sleeves: true, photo: "images/studio/gear/gear-top-polo.png?v=1" },
    { id: "jersey", name: "Gold jersey", color: "#e5a400", photo: "images/studio/gear/gear-top-jersey.png?v=9" },
    { id: "mesh", name: "Lime mesh", color: "#8fd14f", photo: "images/studio/gear/gear-top-mesh.png?v=1" },
    { id: "kit", name: "Home kit", color: "#f2f6fa", sleeves: true, photo: "images/studio/gear/gear-top-kit.png?v=4" },
    { id: "compression", name: "Compression", color: "#1a1a1a", photo: "images/studio/gear/gear-top-compression.png?v=4" },
    { id: "longsleeve", name: "White long sleeve", color: "#f4f4f4", wide: true, sleeves: true, photo: "images/studio/gear/gear-top-longsleeve.png?v=1" },
    { id: "sleeveless", name: "Sleeveless", color: "#2a2a2a", photo: "images/studio/gear/gear-top-sleeveless.png?v=4" },
    { id: "warmup", name: "Warm-up", color: "#2e4d8a", wide: true, sleeves: true, photo: "images/studio/gear/gear-top-warmup.png?v=4" },
    { id: "baseball", name: "Baseball jersey", color: "#c41e3a", wide: true, sleeves: true, photo: "images/studio/gear/gear-top-baseball.png?v=4" },
    { id: "football", name: "Football jersey", color: "#8b1e2d", wide: true, sleeves: true, photo: "images/studio/gear/gear-top-football.png?v=4" }
];

const BOTTOMS = [
    { id: "none", name: "None" },
    { id: "shorts", name: "Navy shorts", color: "#1c1c1c", photo: "images/studio/gear/gear-bottom-shorts.png?v=4" },
    { id: "hoops", name: "Red hoops shorts", color: "#d01018", photo: "images/studio/gear/gear-bottom-hoops.png?v=9" },
    { id: "white", name: "White stripe shorts", color: "#f4f4f4", photo: "images/studio/gear/gear-bottom-white.png?v=4" },
    { id: "cargo", name: "Cargo shorts", color: "#c5b07a", photo: "images/studio/gear/gear-bottom-cargo.png?v=1" },
    { id: "soccer", name: "Green soccer shorts", color: "#141414", photo: "images/studio/gear/gear-bottom-soccer.png?v=4" },
    { id: "joggers", name: "Joggers", color: "#2a3544", long: true, photo: "images/studio/gear/gear-bottom-joggers.png?v=4" },
    { id: "tights", name: "Tights", color: "#111111", long: true, photo: "images/studio/gear/gear-bottom-tights.png?v=4" },
    { id: "jeans", name: "Jeans", color: "#2c4a6e", long: true, photo: "images/studio/gear/gear-bottom-jeans.png?v=1" }
];

const HATS = [
    { id: "none", name: "None" },
    { id: "cap", name: "Black cap", color: "#1a1a1a", slot: "hat", photo: "images/studio/gear/gear-hat-cap.png?v=4" },
    { id: "dad", name: "Orange dad hat", color: "#e07a2f", slot: "hat", photo: "images/studio/gear/gear-hat-dad.png?v=1" },
    { id: "snapback", name: "White snapback", color: "#f4f4f4", slot: "hat", photo: "images/studio/gear/gear-hat-snapback.png?v=4" },
    { id: "trucker", name: "Trucker hat", color: "#f4f4f4", slot: "hat", photo: "images/studio/gear/gear-hat-trucker.png?v=1" },
    { id: "beanie", name: "Navy beanie", color: "#1e4a8c", slot: "beanie", photo: "images/studio/gear/gear-hat-beanie.png?v=4" },
    { id: "pom", name: "Pom beanie", color: "#d4a017", slot: "pom", photo: "images/studio/gear/gear-hat-pombeanie.png?v=1" },
    { id: "durag", name: "Durag", color: "#1b3658", slot: "durag", photo: "images/studio/gear/gear-hat-durag.png?v=1" },
    { id: "wavecap", name: "Wave cap", color: "#f4f4f4", slot: "wave", photo: "images/studio/gear/gear-hat-wavecap.png?v=1" },
    { id: "bucket", name: "Bucket hat", color: "#c4a35a", slot: "bucket", photo: "images/studio/gear/gear-hat-bucket.png?v=4" },
    { id: "cowboy", name: "Cowboy hat", color: "#c4a35a", slot: "cowboy", photo: "images/studio/gear/gear-hat-cowboy.png?v=1" },
    { id: "visor", name: "Visor", color: "#1a1a1a", slot: "visor", photo: "images/studio/gear/gear-hat-visor.png?v=4" },
    { id: "headband", name: "Headband", color: "#f4f4f4", slot: "band", photo: "images/studio/gear/gear-hat-headband.png?v=4" },
    { id: "bandana", name: "Bandana", color: "#c4122f", slot: "bandana", photo: "images/studio/gear/gear-hat-bandana.png?v=1" },
    { id: "shades", name: "Sunglasses", color: "#111111", slot: "shades", photo: "images/studio/gear/gear-hat-shades.png?v=9" },
    { id: "aviators", name: "Aviators", color: "#2b2118", slot: "shades", photo: "images/studio/gear/gear-hat-aviators.png?v=4" },
    { id: "goggles", name: "Goggles", color: "#e07a2f", slot: "goggles", photo: "images/studio/gear/gear-hat-goggles.png?v=1" }
];

const SHOES = [
    { id: "none", name: "None" },
    { id: "sneakers", name: "Sneakers", color: "#f4f4f4", photo: "images/studio/gear/gear-shoe-sneakers.png?v=4" },
    { id: "highs", name: "High tops", color: "#222222", photo: "images/studio/gear/gear-shoe-highs.png?v=4" },
    { id: "cleats", name: "Cleats", color: "#111111", photo: "images/studio/gear/gear-shoe-cleats.png?v=4" },
    { id: "gold", name: "Gold kicks", color: "#d4a017", photo: "images/studio/gear/gear-shoe-gold.png?v=4" },
    { id: "red", name: "Red kicks", color: "#c4122f", photo: "images/studio/gear/gear-shoe-red.png?v=4" },
    { id: "runners", name: "Runners", color: "#e8e8e8", photo: "images/studio/gear/gear-shoe-runners.png?v=4" },
    { id: "baseball", name: "Baseball cleats", color: "#eeeeee", photo: "images/studio/gear/gear-shoe-baseball.png?v=4" }
];

const TAB_COPY = {
    player: ["Players", ""],
    skin: ["Skin", ""],
    tops: ["Tops", ""],
    bottoms: ["Bottoms", ""],
    hats: ["Hats", ""],
    shoes: ["Shoes", ""]
};

const studio = document.getElementById("athleteStudio");
const grid = document.getElementById("studioGrid");
const stage = document.getElementById("studioStage");
const rig = document.getElementById("studioRig");
const dress = document.getElementById("studioDress");
const unequipBtn = document.getElementById("studioUnequipBtn");
const pickerLabel = document.getElementById("studioPickerLabel");
const pickerHint = document.getElementById("studioPickerHint");
const wearTag = null;

if (!studio || !rig || !dress || !grid || !stage || !unequipBtn) {
    throw new Error("Athlete studio markup is missing.");
}

document.querySelectorAll(".studio-side, .studio-back").forEach(function (el) {
    el.remove();
});

const look = loadLook();
let activeTab = "player";
let rotY = 0;
let rotX = 0;
let dragging = false;
let lastX = 0;
let lastY = 0;
let paintToken = 0;
const imageCache = {};

function loadLook() {
    const savedAvatar = JSON.parse(localStorage.getItem(AVATAR_STORAGE_KEY) || "null");
    const savedLook = JSON.parse(localStorage.getItem(LOOK_KEY) || "null") || {};
    const player = PLAYERS.find(function (item) {
        return item.id === savedLook.player || (savedAvatar && item.name === savedAvatar.name);
    }) || PLAYERS[0];

    return {
        player: player.id,
        skin: savedLook.skin || "tan",
        top: savedLook.top || "none",
        bottom: savedLook.bottom || "none",
        hat: savedLook.hat || "none",
        shoes: savedLook.shoes || "none"
    };
}

function persist() {
    const player = PLAYERS.find(function (item) { return item.id === look.player; }) || PLAYERS[0];
    localStorage.setItem(LOOK_KEY, JSON.stringify(look));
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify({
        league: player.league,
        name: player.name,
        image: player.image,
        alt: player.alt
    }));
}

function findItem(list, id) {
    return list.find(function (item) { return item.id === id; }) || list[0];
}

function loadImage(src) {
    if (!src) {
        return Promise.resolve(null);
    }
    if (imageCache[src]) {
        return imageCache[src];
    }
    imageCache[src] = new Promise(function (resolve) {
        const image = new Image();
        image.onload = function () { resolve(image); };
        image.onerror = function () { resolve(null); };
        image.src = src;
    });
    return imageCache[src];
}

function parseColor(item, gear) {
    if (item && item.color && item.color[0] === "#") {
        const hex = item.color.slice(1);
        return [
            parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16)
        ];
    }
    return sampleGearColor(gear, [168, 168, 168]);
}

function sampleGearColor(img, fallback) {
    if (!img) {
        return fallback;
    }
    const c = document.createElement("canvas");
    c.width = 48;
    c.height = 48;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0, 48, 48);
    const d = x.getImageData(0, 0, 48, 48).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 80) {
            continue;
        }
        if (d[i + 1] > d[i] + 28 && d[i + 1] > d[i + 2] + 28) {
            continue;
        }
        const mx = Math.max(d[i], d[i + 1], d[i + 2]);
        const mn = Math.min(d[i], d[i + 1], d[i + 2]);
        if (mx - mn < 18 && d[i] > 70 && d[i] < 175) {
            continue;
        }
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
        n += 1;
    }
    if (!n) {
        return fallback;
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

function isSkinPixel(r, g, b, a) {
    if (a < 24 || r < 45 || g < 18 || b < 8) {
        return false;
    }
    if (r < g - 2 || r - b < 8) {
        return false;
    }
    if (r > 190 && g > 150 && b < 70) {
        return false;
    }
    return Math.max(r, g, b) - Math.min(r, g, b) >= 10;
}

function isBodyPixel(r, g, b, a) {
    if (a < 36) {
        return false;
    }
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const luma = (r + g + b) / 3;
    if (chroma < 28 && luma > 198) {
        return false;
    }
    return true;
}

function measureBody(body, box, width, height) {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(body, box.x, box.y, box.w, box.h);
    const data = ctx.getImageData(0, 0, width, height).data;
    const rows = new Array(height);
    const x0 = Math.max(0, Math.floor(box.x));
    const x1 = Math.min(width, Math.ceil(box.x + box.w));
    let y;
    for (y = 0; y < height; y += 1) {
        const row = y * width * 4;
        const runs = [];
        let runStart = -1;
        let minX = width;
        let maxX = -1;
        let x;
        for (x = x0; x < x1; x += 1) {
            const i = row + x * 4;
            if (!isBodyPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
                if (runStart >= 0) {
                    runs.push({ min: runStart, max: x - 1 });
                    runStart = -1;
                }
                continue;
            }
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (runStart < 0) runStart = x;
        }
        if (runStart >= 0) {
            runs.push({ min: runStart, max: x1 - 1 });
        }
        rows[y] = maxX >= minX ? { minX: minX, maxX: maxX, runs: runs } : null;
    }
    return { data: data, rows: rows, canvas: c };
}

function isolateGear(img) {
    if (!img || !img.width) {
        return null;
    }
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imgd = ctx.getImageData(0, 0, c.width, c.height);
    const d = imgd.data;
    const w = c.width;
    const h = c.height;
    const seen = new Uint8Array(w * h);
    const stack = [];

    function isBg(r, g, b, a) {
        if (a < 28) {
            return true;
        }
        if (g > 70 && g > r + 18 && g > b + 18) {
            return true;
        }
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        const luma = r * 0.3 + g * 0.54 + b * 0.16;
        if (chroma < 28 && luma < 62) {
            return true;
        }
        return chroma < 14 && luma > 178 && luma < 196;
    }

    function push(x, y) {
        if (x < 0 || y < 0 || x >= w || y >= h) {
            return;
        }
        const i = y * w + x;
        if (seen[i]) {
            return;
        }
        const p = i * 4;
        if (!isBg(d[p], d[p + 1], d[p + 2], d[p + 3])) {
            return;
        }
        seen[i] = 1;
        stack.push(i);
    }

    let x;
    let y;
    for (x = 0; x < w; x += 1) {
        push(x, 0);
        push(x, h - 1);
    }
    for (y = 0; y < h; y += 1) {
        push(0, y);
        push(w - 1, y);
    }
    while (stack.length) {
        const i = stack.pop();
        d[i * 4 + 3] = 0;
        x = i % w;
        y = (i / w) | 0;
        push(x + 1, y);
        push(x - 1, y);
        push(x, y + 1);
        push(x, y - 1);
    }

    let kept = 0;
    for (x = 3; x < d.length; x += 4) {
        if (d[x] > 24) {
            kept += 1;
        }
    }
    if (kept < Math.max(80, w * h * 0.015)) {
        return null;
    }
    ctx.putImageData(imgd, 0, 0);
    return cropAlpha(c);
}

function cropAlpha(src) {
    const w = src.width;
    const h = src.height;
    const ctx = src.getContext("2d");
    const d = ctx.getImageData(0, 0, w, h).data;
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let y;
    let x;
    for (y = 0; y < h; y += 1) {
        for (x = 0; x < w; x += 1) {
            if (d[(y * w + x) * 4 + 3] < 28) {
                continue;
            }
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    if (maxX < minX) {
        return null;
    }
    const pad = 2;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);
    const c = document.createElement("canvas");
    c.width = maxX - minX + 1;
    c.height = maxY - minY + 1;
    c.getContext("2d").drawImage(src, minX, minY, c.width, c.height, 0, 0, c.width, c.height);
    return c;
}

function cutoutLooksLikePerson(cut) {
    const ctx = cut.getContext("2d");
    const d = ctx.getImageData(0, 0, cut.width, cut.height).data;
    let skin = 0;
    let op = 0;
    let i;
    for (i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 40) {
            continue;
        }
        op += 1;
        if (isSkinPixel(d[i], d[i + 1], d[i + 2], d[i + 3])) {
            skin += 1;
        }
    }
    return op > 0 && skin / op > 0.22;
}

function isFringePixel(r, g, b, a) {
    if (a < 18) {
        return false;
    }
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const luma = (r + g + b) / 3;
    return chroma < 26 && luma > 188;
}

function isPersonCore(r, g, b, a) {
    if (a < 36) {
        return false;
    }
    if (isFringePixel(r, g, b, a)) {
        return false;
    }
    return true;
}

function stripHalo(ctx) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const img = ctx.getImageData(0, 0, width, height);
    const d = img.data;
    const keep = new Uint8Array(width * height);
    let x;
    let y;
    let minY = height;
    let maxY = 0;

    for (y = 0; y < height; y += 1) {
        for (x = 0; x < width; x += 1) {
            const i = (y * width + x) * 4;
            if (isPersonCore(d[i], d[i + 1], d[i + 2], d[i + 3])) {
                keep[y * width + x] = 1;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxY <= minY) {
        return;
    }

    const bodyH = Math.max(1, maxY - minY);
    const shoeY = minY + Math.floor(bodyH * 0.86);
    const shoeBot = Math.min(height, maxY + Math.floor(bodyH * 0.12));
    const ankleY = Math.max(minY, shoeY - 10);
    const legs = [];
    for (x = 0; x < width; x += 1) {
        if (keep[ankleY * width + x]) {
            if (!legs.length || x > legs[legs.length - 1][1] + 6) {
                legs.push([x, x]);
            } else {
                legs[legs.length - 1][1] = x;
            }
        }
    }
    for (y = shoeY; y < shoeBot; y += 1) {
        let L;
        for (L = 0; L < legs.length; L += 1) {
            const x0 = Math.max(0, legs[L][0] - 6);
            const x1 = Math.min(width - 1, legs[L][1] + 6);
            for (x = x0; x <= x1; x += 1) {
                const i = (y * width + x) * 4;
                if (d[i + 3] > 40) {
                    keep[y * width + x] = 1;
                }
            }
        }
    }

    const grown = new Uint8Array(keep);
    for (y = 1; y < height - 1; y += 1) {
        for (x = 1; x < width - 1; x += 1) {
            const i = (y * width + x) * 4;
            if (!keep[y * width + x] || isFringePixel(d[i], d[i + 1], d[i + 2], d[i + 3])) {
                continue;
            }
            grown[y * width + x - 1] = 1;
            grown[y * width + x + 1] = 1;
            grown[(y - 1) * width + x] = 1;
            grown[(y + 1) * width + x] = 1;
        }
    }

    for (y = 0; y < height; y += 1) {
        for (x = 0; x < width; x += 1) {
            const p = y * width + x;
            if (grown[p]) {
                continue;
            }
            d[p * 4 + 3] = 0;
        }
    }
    ctx.putImageData(img, 0, 0);
}

function applySkinTone(ctx, box, target) {
    if (!target) {
        return;
    }
    const x0 = Math.max(0, Math.floor(box.x));
    const y0 = Math.max(0, Math.floor(box.y));
    const w = Math.min(ctx.canvas.width - x0, Math.ceil(box.w));
    const h = Math.min(ctx.canvas.height - y0, Math.ceil(box.h));
    if (w < 2 || h < 2) {
        return;
    }
    const img = ctx.getImageData(x0, y0, w, h);
    const d = img.data;
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let n = 0;
    let i;
    for (i = 0; i < d.length; i += 4) {
        if (!isSkinPixel(d[i], d[i + 1], d[i + 2], d[i + 3])) {
            continue;
        }
        sr += d[i];
        sg += d[i + 1];
        sb += d[i + 2];
        n += 1;
    }
    if (n < 40) {
        return;
    }
    for (i = 0; i < d.length; i += 4) {
        if (!isSkinPixel(d[i], d[i + 1], d[i + 2], d[i + 3])) {
            continue;
        }
        const lit = (d[i] * 0.3 + d[i + 1] * 0.54 + d[i + 2] * 0.16) / 255;
        const shade = 0.42 + 0.72 * lit;
        const mix = 0.58;
        d[i] = Math.max(0, Math.min(255, Math.round(d[i] * (1 - mix) + target[0] * shade * mix)));
        d[i + 1] = Math.max(0, Math.min(255, Math.round(d[i + 1] * (1 - mix) + target[1] * shade * mix)));
        d[i + 2] = Math.max(0, Math.min(255, Math.round(d[i + 2] * (1 - mix) + target[2] * shade * mix)));
    }
    ctx.putImageData(img, x0, y0);
}

function measureSpans(body, box, width, height) {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(body, box.x, box.y, box.w, box.h);
    const data = ctx.getImageData(0, 0, width, height).data;
    const rows = new Array(height);
    const x0 = Math.max(0, Math.floor(box.x));
    const x1 = Math.min(width, Math.ceil(box.x + box.w));
    for (let y = 0; y < height; y += 1) {
        const row = y * width * 4;
        const runs = [];
        let runStart = -1;
        let minX = width;
        let maxX = -1;
        for (let x = x0; x < x1; x += 1) {
            const i = row + x * 4;
            if (!isSkinPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
                if (runStart >= 0) {
                    runs.push({ min: runStart, max: x - 1 });
                    runStart = -1;
                }
                continue;
            }
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (runStart < 0) runStart = x;
        }
        if (runStart >= 0) {
            runs.push({ min: runStart, max: x1 - 1 });
        }
        rows[y] = maxX >= minX ? { minX: minX, maxX: maxX, runs: runs } : null;
    }
    return { data: data, rows: rows };
}

function torsoX(rows, y, mode) {
    for (let dy = 0; dy <= 28; dy += 1) {
        const span = rows[y + dy] || (y - dy >= 0 ? rows[y - dy] : null);
        if (!span || !span.runs.length) {
            continue;
        }
        if (span.runs.length >= 2) {
            if (mode === "outer") {
                const left = span.runs[0].min;
                const right = span.runs[span.runs.length - 1].max;
                const pad = Math.max(4, (right - left) * 0.06);
                return { xL: left - pad, xR: right + pad, cx: (left + right) / 2 };
            }
            const left = span.runs[0].max;
            const right = span.runs[span.runs.length - 1].min;
            const pad = Math.max(6, (right - left) * 0.1);
            return { xL: left - pad, xR: right + pad, cx: (left + right) / 2 };
        }
        const inset = mode === "outer" ? 0.04 : 0.22;
        const w = span.maxX - span.minX;
        return {
            xL: span.minX + w * inset,
            xR: span.maxX - w * inset,
            cx: (span.minX + span.maxX) / 2
        };
    }
    return null;
}

function regionRange(kind, item, box, face) {
    const neck = face && face.bot
        ? face.bot + Math.max(6, face.h * 0.28)
        : box.y + box.h * 0.28;
    if (kind === "top") {
        return {
            y0: Math.max(neck, box.y + box.h * 0.24),
            y1: box.y + box.h * (item.wide ? 0.62 : 0.55)
        };
    }
    if (kind === "bottom") {
        return {
            y0: box.y + box.h * 0.52,
            y1: box.y + box.h * (item.long ? 0.9 : 0.72)
        };
    }
    return {
        y0: box.y + box.h * (item.id === "highs" ? 0.82 : 0.855),
        y1: box.y + box.h * 0.985
    };
}

function extractAccents(gear) {
    if (!gear) {
        return null;
    }
    const c = document.createElement("canvas");
    c.width = gear.width;
    c.height = gear.height;
    const x = c.getContext("2d");
    x.drawImage(gear, 0, 0);
    const img = x.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    let kept = 0;
    for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 80) {
            d[i + 3] = 0;
            continue;
        }
        if (d[i + 1] > d[i] + 28 && d[i + 1] > d[i + 2] + 28) {
            d[i + 3] = 0;
            continue;
        }
        const chroma = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
        const luma = d[i] * 0.3 + d[i + 1] * 0.54 + d[i + 2] * 0.16;
        if (luma < 205 || chroma > 48) {
            d[i + 3] = 0;
            continue;
        }
        kept += 1;
    }
    if (kept < 60 || kept > c.width * c.height * 0.12) {
        return null;
    }
    x.putImageData(img, 0, 0);
    return c;
}

function drawContained(ctx, img, x, y, w, h) {
    const ir = img.width / img.height;
    const br = w / h;
    let dw = w;
    let dh = h;
    let dx = x;
    let dy = y;
    if (ir > br) {
        dh = w / ir;
        dy = y + (h - dh) / 2;
    } else {
        dw = h * ir;
        dx = x + (w - dw) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
}

function isTankPixel(r, g, b, a) {
    if (a < 40 || isSkinPixel(r, g, b, a)) {
        return false;
    }
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const luma = (r + g + b) / 3;
    return chroma < 48 && luma > 40 && luma < 195;
}

function isBaseShorts(r, g, b, a) {
    if (a < 40 || isSkinPixel(r, g, b, a)) {
        return false;
    }
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const luma = (r + g + b) / 3;
    return luma < 95 && chroma < 42;
}

function pickTorsoRun(span, face) {
    if (!span.runs || !span.runs.length) {
        return { min: span.minX, max: span.maxX };
    }
    const cx = face && face.cx != null ? face.cx : (span.minX + span.maxX) / 2;
    let best = span.runs[0];
    let bestScore = -1;
    let r;
    for (r = 0; r < span.runs.length; r += 1) {
        const run = span.runs[r];
        const mid = (run.min + run.max) / 2;
        const score = (run.max - run.min) - Math.abs(mid - cx) * 0.35;
        if (score > bestScore) {
            bestScore = score;
            best = run;
        }
    }
    return best;
}

function sampleArmSkin(src, width, box) {
    const y0 = Math.max(0, Math.floor(box.y + box.h * 0.28));
    const y1 = Math.min(src.length / (width * 4), Math.floor(box.y + box.h * 0.48));
    const x0 = Math.max(0, Math.floor(box.x));
    const x1 = Math.min(width, Math.ceil(box.x + box.w));
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    let y;
    let x;
    for (y = y0; y < y1; y += 1) {
        for (x = x0; x < x1; x += 1) {
            const i = (y * width + x) * 4;
            if (!isSkinPixel(src[i], src[i + 1], src[i + 2], src[i + 3])) {
                continue;
            }
            r += src[i];
            g += src[i + 1];
            b += src[i + 2];
            n += 1;
        }
    }
    if (n < 20) {
        return [198, 146, 108];
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

function paintWorn(ctx, body, box, gear, item, kind) {
    if (!item || item.id === "none") {
        return;
    }
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const bodyInfo = measureBody(body, box, width, height);
    const face = faceCenter(bodyInfo.rows, box);
    const range = regionRange(kind, item, box, face);
    const color = parseColor(item, gear);
    const y0 = Math.max(0, Math.floor(range.y0));
    const y1 = Math.min(height, Math.ceil(range.y1));
    const tmp = document.createElement("canvas");
    tmp.width = width;
    tmp.height = height;
    const layer = tmp.getContext("2d");
    const out = layer.createImageData(width, height);
    const pix = out.data;
    const src = ctx.getImageData(0, 0, width, height).data;
    const skinTone = sampleArmSkin(src, width, box);
    const cut = gear ? isolateGear(gear) : null;
    let tex = null;
    let texW = 0;
    let texH = 0;
    if (cut) {
        tex = cut.getContext("2d").getImageData(0, 0, cut.width, cut.height).data;
        texW = cut.width;
        texH = cut.height;
    }
    const garmentLuma = (color[0] + color[1] + color[2]) / 765;
    const floor = garmentLuma > 0.55 ? 0.5 : 0.38;
    const hull = kind === "bottom";
    let mapL = width;
    let mapR = 0;
    let y;
    for (y = y0; y < y1; y += 2) {
        const span = bodyInfo.rows[y];
        if (!span) {
            continue;
        }
        const run = hull ? { min: span.minX, max: span.maxX } : pickTorsoRun(span, face);
        if (run.min < mapL) mapL = run.min;
        if (run.max > mapR) mapR = run.max;
    }
    const mapW = Math.max(1, mapR - mapL);
    const mapH = Math.max(1, y1 - y0);
    let x;
    let painted = 0;
    let minGX = width;
    let maxGX = 0;
    let minGY = height;
    let maxGY = 0;

    function garmentRuns(span) {
        if (!span.runs || !span.runs.length) {
            return [{ min: span.minX, max: span.maxX }];
        }
        if (kind === "bottom" && item.long) {
            return span.runs.filter(function (run) {
                return run.max - run.min > 8;
            });
        }
        if (kind === "bottom") {
            const hips = span.runs.filter(function (run) {
                return run.max - run.min > 10;
            });
            return hips.length ? hips : span.runs;
        }
        if (kind === "shoes") {
            return span.runs.filter(function (run) {
                return run.max - run.min > 6;
            });
        }
        if (hull) {
            return [{ min: span.minX, max: span.maxX }];
        }
        return [pickTorsoRun(span, face)];
    }

    function sampleTex(u, v) {
        if (!tex) {
            return [color[0], color[1], color[2], 255];
        }
        const sx = Math.max(0, Math.min(texW - 1, Math.round(u * (texW - 1))));
        const sy = Math.max(0, Math.min(texH - 1, Math.round(v * (texH - 1))));
        const ti = (sy * texW + sx) * 4;
        return [tex[ti], tex[ti + 1], tex[ti + 2], tex[ti + 3]];
    }

    for (y = y0; y < y1; y += 1) {
        const span = bodyInfo.rows[y];
        if (!span) {
            continue;
        }
        const inset = kind === "shoes" ? 0.06 : kind === "top" && item.wide ? 0.02 : kind === "top" ? 0.03 : 0.04;
        const segments = garmentRuns(span);
        let s;
        for (s = 0; s < segments.length; s += 1) {
            const segW = Math.max(1, segments[s].max - segments[s].min);
            const xL = Math.floor(segments[s].min + segW * inset);
            const xR = Math.ceil(segments[s].max - segW * inset);
            for (x = xL; x <= xR; x += 1) {
                const i = (y * width + x) * 4;
                const a = src[i + 3];
                if (a < 40) {
                    continue;
                }
                const chroma = Math.max(src[i], src[i + 1], src[i + 2]) - Math.min(src[i], src[i + 1], src[i + 2]);
                const rawLuma = (src[i] + src[i + 1] + src[i + 2]) / 3;
                if (chroma < 28 && rawLuma > 198) {
                    continue;
                }
                const skin = isSkinPixel(src[i], src[i + 1], src[i + 2], a);
                const tank = isTankPixel(src[i], src[i + 1], src[i + 2], a);
        const u = 0.1 + 0.8 * (x - mapL) / mapW;
        const v = 0.08 + 0.84 * (y - y0) / mapH;
                const sample = sampleTex(u, v);
                if (kind === "shoes") {
                    if (!isShoePixel(src[i], src[i + 1], src[i + 2], a)) {
                        continue;
                    }
                } else if (kind === "top") {
                    if (!tank || sample[3] < 40) {
                        continue;
                    }
                } else if (kind === "bottom" && !item.long) {
                    if (sample[3] < 40) {
                        continue;
                    }
                    if (skin && sample[3] < 80) {
                        continue;
                    }
                } else if (skin && !(kind === "bottom" && item.long) && sample[3] < 80) {
                    continue;
                }
                const luma = (src[i] * 0.3 + src[i + 1] * 0.54 + src[i + 2] * 0.16) / 255;
                const wrap = 0.5 + 0.5 * Math.sin(Math.PI * (x - xL) / Math.max(1, xR - xL));
                const lit = luma < 0.22 ? Math.max(0.28, wrap * 0.82) : luma;
                const shade = (tex ? 0.58 : floor) + (1 - (tex ? 0.58 : floor)) * Math.min(1.15, Math.max(0.2, lit) / 0.58);
                pix[i] = Math.min(255, Math.round(sample[0] * shade));
                pix[i + 1] = Math.min(255, Math.round(sample[1] * shade));
                pix[i + 2] = Math.min(255, Math.round(sample[2] * shade));
                pix[i + 3] = 255;
                painted += 1;
                if (x < minGX) minGX = x;
                if (x > maxGX) maxGX = x;
                if (y < minGY) minGY = y;
                if (y > maxGY) maxGY = y;
            }
        }
    }
    if (!painted) {
        return;
    }
    layer.putImageData(out, 0, 0);
    ctx.drawImage(tmp, 0, 0);

    if (item.id === "jersey" && !tex) {
        const num = document.createElement("canvas");
        num.width = width;
        num.height = height;
        const nx = num.getContext("2d");
        nx.fillStyle = "#fff";
        nx.font = "900 " + Math.round(Math.max(18, (maxGX - minGX) * 0.28)) + "px Nunito, Arial, sans-serif";
        nx.textAlign = "center";
        nx.textBaseline = "middle";
        nx.fillText("30", (minGX + maxGX) / 2, minGY + (maxGY - minGY) * 0.42);
        nx.globalCompositeOperation = "destination-in";
        nx.drawImage(tmp, 0, 0);
        ctx.drawImage(num, 0, 0);
    }
}

function drapeGarment(ctx, body, box, gear, item, kind) {
    if (!gear || !gear.width) {
        return false;
    }
    const cut = isolateGear(gear);
    if (!cut || cutoutLooksLikePerson(cut)) {
        return false;
    }
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const bodyInfo = measureBody(body, box, width, height);
    const face = faceCenter(bodyInfo.rows, box);
    const range = regionRange(kind, item, box, face);
    const y0 = Math.max(0, Math.floor(range.y0));
    let y1 = Math.min(height, Math.ceil(range.y1));
    if (kind === "top" && (item.sleeves || item.wide)) {
        y1 = Math.min(height, Math.ceil(box.y + box.h * (item.wide ? 0.68 : 0.5)));
    }
    let sumW = 0;
    let n = 0;
    let hullL = width;
    let hullR = 0;
    let y;
    for (y = y0; y < y1; y += 2) {
        const span = bodyInfo.rows[y];
        if (!span) {
            continue;
        }
        const run = pickTorsoRun(span, face);
        sumW += Math.max(1, run.max - run.min);
        n += 1;
        if (span.minX < hullL) hullL = span.minX;
        if (span.maxX > hullR) hullR = span.maxX;
    }
    if (n < 4 || hullR <= hullL) {
        return false;
    }
    const torsoW = sumW / n;
    const hull = kind === "bottom" || (kind === "top" && (item.sleeves || item.wide));
    const targetW = kind === "shoes"
        ? (hullR - hullL) * 1.05
        : hull
            ? Math.max(torsoW * 1.34, (hullR - hullL) * 0.9)
            : torsoW * 1.1;
    const dx = face.cx - targetW / 2;
    const dh = y1 - y0;
    const scale = targetW / Math.max(1, cut.width);
    const drawH = Math.min(cut.height * scale, dh * 1.15);

    const layer = document.createElement("canvas");
    layer.width = width;
    layer.height = height;
    const lctx = layer.getContext("2d");
    lctx.drawImage(cut, dx, y0, targetW, drawH);

    const band = document.createElement("canvas");
    band.width = width;
    band.height = height;
    const bctx = band.getContext("2d");
    const mask = bctx.createImageData(width, height);
    const md = mask.data;
    for (y = y0; y < y1; y += 1) {
        const span = bodyInfo.rows[y];
        if (!span) {
            continue;
        }
        let xL;
        let xR;
        let x;
        if (kind === "shoes" && span.runs) {
            let r;
            for (r = 0; r < span.runs.length; r += 1) {
                for (x = span.runs[r].min; x <= span.runs[r].max; x += 1) {
                    const i = (y * width + x) * 4;
                    md[i] = 255;
                    md[i + 1] = 255;
                    md[i + 2] = 255;
                    md[i + 3] = 255;
                }
            }
            continue;
        }
        if (hull) {
            xL = span.minX;
            xR = span.maxX;
        } else {
            const run = pickTorsoRun(span, face);
            xL = run.min;
            xR = run.max;
        }
        for (x = xL; x <= xR; x += 1) {
            const i = (y * width + x) * 4;
            md[i] = 255;
            md[i + 1] = 255;
            md[i + 2] = 255;
            md[i + 3] = 255;
        }
    }
    bctx.putImageData(mask, 0, 0);
    lctx.globalCompositeOperation = "destination-in";
    lctx.drawImage(band, 0, 0);
    hideUncoveredBase(ctx, layer, box, kind);
    ctx.drawImage(layer, 0, 0);
    return true;
}

function wearHatPhoto(ctx, body, box, gear, item) {
    const cut = isolateGear(gear);
    if (!cut || cutoutLooksLikePerson(cut)) {
        return false;
    }
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const face = faceCenter(measureSpans(body, box, width, height).rows, box);
    const scale = item.slot === "cowboy" || item.slot === "bucket" ? 2.35 : item.slot === "shades" || item.slot === "goggles" ? 1.55 : 1.9;
    const hatW = Math.max(face.w * scale, box.w * 0.2);
    const hatH = hatW * (cut.height / Math.max(1, cut.width));
    let y = face.cy - face.h * 0.85 - hatH * 0.35;
    if (item.slot === "shades" || item.slot === "goggles" || item.slot === "band") {
        y = face.cy - hatH * 0.42;
    }
    if (item.slot === "beanie" || item.slot === "pom" || item.slot === "durag" || item.slot === "wave") {
        y = face.top - hatH * 0.2;
    }
    ctx.drawImage(cut, face.cx - hatW / 2, y, hatW, hatH);
    return true;
}

function faceCenter(rows, box) {
    const y0 = Math.max(0, Math.floor(box.y));
    const yLimit = Math.floor(box.y + box.h * 0.34);
    let top = -1;
    let y;
    for (y = y0; y < yLimit; y += 1) {
        const span = rows[y];
        if (!span) {
            continue;
        }
        const w = span.maxX - span.minX;
        if (w > 10 && w < box.w * 0.45) {
            top = y;
            break;
        }
    }
    if (top < 0) {
        return {
            cx: box.x + box.w * 0.5,
            cy: box.y + box.h * 0.12,
            w: box.w * 0.18,
            h: box.h * 0.14,
            top: box.y + box.h * 0.06,
            bot: box.y + box.h * 0.2
        };
    }
    const startW = rows[top].maxX - rows[top].minX;
    let bot = top;
    for (y = top; y < yLimit; y += 1) {
        const span = rows[y];
        if (!span) {
            break;
        }
        const w = span.maxX - span.minX;
        if (y > top + 10 && w > startW * 1.55) {
            break;
        }
        bot = y;
        if (y > top + box.h * 0.17) {
            break;
        }
    }
    const widths = [];
    let sumCx = 0;
    for (y = top; y <= bot; y += 1) {
        const span = rows[y];
        if (!span) {
            continue;
        }
        widths.push(span.maxX - span.minX);
        sumCx += (span.minX + span.maxX) / 2;
    }
    widths.sort(function (a, b) { return a - b; });
    const w = widths[Math.floor(widths.length / 2)] || startW;
    return {
        cx: sumCx / Math.max(1, widths.length),
        cy: (top + bot) / 2,
        w: w,
        h: Math.max(12, bot - top),
        top: top,
        bot: bot
    };
}

function wearHat(ctx, box, item, body) {
    if (!item || item.id === "none") {
        return;
    }
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const spans = body ? measureBody(body, box, width, height) : { rows: [] };
    const face = faceCenter(spans.rows, box);
    const rgb = parseColor(item, null);
    const col = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
    const hi = "rgb(" + Math.min(255, rgb[0] + 48) + "," + Math.min(255, rgb[1] + 48) + "," + Math.min(255, rgb[2] + 48) + ")";
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (item.slot === "shades") {
        const y = face.cy + face.h * 0.08;
        const lensW = Math.max(6, face.w * 0.16);
        const lensH = Math.max(4, face.h * 0.12);
        const gap = Math.max(3, face.w * 0.08);
        ctx.fillStyle = "rgba(12,12,12,0.9)";
        ctx.strokeStyle = item.id === "aviators" ? "#c9a227" : "#333";
        ctx.lineWidth = Math.max(1.4, face.w * 0.03);
        ctx.beginPath();
        ctx.ellipse(face.cx - gap - lensW, y, lensW, lensH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(face.cx + gap + lensW, y, lensW, lensH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(face.cx - gap, y);
        ctx.quadraticCurveTo(face.cx, y - lensH * 0.45, face.cx + gap, y);
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (item.slot === "band") {
        ctx.fillStyle = col;
        const by = face.cy - face.h * 0.08;
        ctx.fillRect(face.cx - face.w * 0.55, by, face.w * 1.1, Math.max(5, face.h * 0.16));
        ctx.restore();
        return;
    }

    if (item.slot === "goggles") {
        const y = face.cy + face.h * 0.04;
        const lensW = Math.max(8, face.w * 0.26);
        const lensH = Math.max(6, face.h * 0.18);
        ctx.fillStyle = "rgba(30, 80, 140, 0.55)";
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(2, face.w * 0.045);
        ctx.beginPath();
        ctx.ellipse(face.cx, y, lensW * 2.05, lensH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (item.slot === "bandana") {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(face.cx, face.top - face.h * 0.06);
        ctx.lineTo(face.cx + face.w * 0.62, face.cy + face.h * 0.12);
        ctx.lineTo(face.cx - face.w * 0.62, face.cy + face.h * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
    }

    const slot = item.slot;
    const crownY = face.cy - face.h * (slot === "beanie" || slot === "pom" ? 0.28 : 0.18);
    const crownW = Math.max(box.w * 0.12, face.w * (slot === "cowboy" ? 0.86 : slot === "bucket" ? 0.8 : 0.74));
    const crownH = Math.max(box.h * 0.04, face.h * (slot === "beanie" || slot === "pom" || slot === "durag" ? 0.5 : 0.4));
    const grad = ctx.createLinearGradient(face.cx, crownY - crownH, face.cx, crownY + crownH);
    grad.addColorStop(0, hi);
    grad.addColorStop(1, col);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(face.cx, crownY, crownW, crownH, 0, 0, Math.PI * 2);
    ctx.fill();

    if (item.slot === "durag") {
        ctx.beginPath();
        ctx.moveTo(face.cx + crownW * 0.2, crownY);
        ctx.quadraticCurveTo(face.cx + crownW * 1.6, crownY + crownH * 2.2, face.cx + crownW * 0.4, crownY + crownH * 3.2);
        ctx.quadraticCurveTo(face.cx + crownW * 0.9, crownY + crownH * 1.6, face.cx + crownW * 0.15, crownY + crownH * 0.4);
        ctx.fill();
    }

    if (item.slot === "pom") {
        ctx.beginPath();
        ctx.arc(face.cx, crownY - crownH * 0.95, Math.max(5, crownW * 0.22), 0, Math.PI * 2);
        ctx.fill();
    }

    if (item.slot !== "beanie" && item.slot !== "pom" && item.slot !== "wave" && item.slot !== "durag") {
        ctx.fillStyle = hi;
        ctx.beginPath();
        ctx.ellipse(face.cx, face.cy - face.h * 0.02, crownW * (item.slot === "cowboy" ? 1.55 : 1.28), crownH * (item.slot === "cowboy" ? 0.3 : 0.4), 0, Math.PI * 1.05, -0.05, true);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = Math.max(1.5, face.w * 0.025);
        ctx.stroke();
    }
    if (item.slot === "bucket") {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(face.cx, crownY + crownH * 0.7, crownW * 1.4, crownH * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function hideUncoveredBase(ctx, layer, box, kind) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const cover = layer.getContext("2d").getImageData(0, 0, width, height).data;
    const img = ctx.getImageData(0, 0, width, height);
    const d = img.data;
    const skin = sampleArmSkin(d, width, box);
    const y0 = Math.max(0, Math.floor(box.y + box.h * (kind === "shoes" ? 0.82 : kind === "bottom" ? 0.5 : 0.22)));
    const y1 = Math.min(height, Math.ceil(box.y + box.h * (kind === "shoes" ? 0.99 : kind === "bottom" ? 0.8 : 0.62)));
    let y;
    let x;
    for (y = y0; y < y1; y += 1) {
        for (x = Math.max(0, Math.floor(box.x)); x < Math.min(width, Math.ceil(box.x + box.w)); x += 1) {
            const i = (y * width + x) * 4;
            if (cover[i + 3] > 48) {
                continue;
            }
            const a = d[i + 3];
            let hide = false;
            if (kind === "top") {
                hide = isTankPixel(d[i], d[i + 1], d[i + 2], a);
            } else if (kind === "bottom") {
                hide = isBaseShorts(d[i], d[i + 1], d[i + 2], a);
            } else if (kind === "shoes") {
                hide = isShoePixel(d[i], d[i + 1], d[i + 2], a);
            }
            if (!hide) {
                continue;
            }
            const lit = (d[i] * 0.3 + d[i + 1] * 0.54 + d[i + 2] * 0.16) / 255;
            const shade = 0.5 + 0.65 * Math.min(1, Math.max(0.18, lit) / 0.55);
            d[i] = Math.max(0, Math.min(255, Math.round(skin[0] * shade)));
            d[i + 1] = Math.max(0, Math.min(255, Math.round(skin[1] * shade)));
            d[i + 2] = Math.max(0, Math.min(255, Math.round(skin[2] * shade)));
        }
    }
    ctx.putImageData(img, 0, 0);
}

function stampWear(ctx, body, box, gear, item, kind) {
    if (!item || item.id === "none") {
        return;
    }
    if (kind === "hat") {
        wearHat(ctx, box, item, body);
        return;
    }
    paintWorn(ctx, body, box, gear, item, kind);
}

function isShoePixel(r, g, b, a) {
    return a > 20 && Math.min(r, g, b) > 140 && Math.max(r, g, b) - Math.min(r, g, b) < 65;
}

const figureCache = {};

function cleanedBody(body) {
    const key = body.src || String(body.width) + "x" + String(body.height);
    if (figureCache[key]) {
        return figureCache[key];
    }
    const w = body.width;
    const h = body.height;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(body, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;

    function chromaOf(i) {
        return Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
    }
    function lumaOf(i) {
        return (d[i] + d[i + 1] + d[i + 2]) / 3;
    }

    let p;
    for (p = 0; p < w * h; p += 1) {
        const i = p * 4;
        if (d[i + 3] < 14) {
            d[i + 3] = 0;
        }
    }

    const keep = new Uint8Array(w * h);
    let seed = -1;
    const cx = (w / 2) | 0;
    const cy = (h * 0.32) | 0;
    let rad;
    outer: for (rad = 0; rad < Math.max(w, h); rad += 1) {
        let dy;
        for (dy = -rad; dy <= rad; dy += 1) {
            let dx;
            for (dx = -rad; dx <= rad; dx += 1) {
                const x = cx + dx;
                const y = cy + dy;
                if (x < 0 || y < 0 || x >= w || y >= h) {
                    continue;
                }
                if (d[(y * w + x) * 4 + 3] > 40) {
                    seed = y * w + x;
                    break outer;
                }
            }
        }
    }
    if (seed < 0) {
        ctx.putImageData(img, 0, 0);
        figureCache[key] = c;
        return c;
    }

    const stack = [seed];
    keep[seed] = 1;
    while (stack.length) {
        const idx = stack.pop();
        const x = idx % w;
        const y = (idx / w) | 0;
        const nbs = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
        let n;
        for (n = 0; n < 4; n += 1) {
            const nx = nbs[n][0];
            const ny = nbs[n][1];
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
                continue;
            }
            const ni = ny * w + nx;
            if (keep[ni]) {
                continue;
            }
            if (d[ni * 4 + 3] < 18) {
                continue;
            }
            keep[ni] = 1;
            stack.push(ni);
        }
    }

    for (p = 0; p < keep.length; p += 1) {
        if (!keep[p]) {
            d[p * 4 + 3] = 0;
        }
    }

    const colCount = new Uint16Array(w);
    let y;
    let x;
    for (y = 0; y < h; y += 1) {
        for (x = 0; x < w; x += 1) {
            if (d[(y * w + x) * 4 + 3] > 20) {
                colCount[x] += 1;
            }
        }
    }
    for (x = 0; x < w; x += 1) {
        if (colCount[x] === 0 || colCount[x] > 70) {
            continue;
        }
        const nearFat = (x > 0 && colCount[x - 1] > 180) || (x + 1 < w && colCount[x + 1] > 180);
        if (nearFat) {
            continue;
        }
        for (y = 0; y < h; y += 1) {
            d[(y * w + x) * 4 + 3] = 0;
        }
    }

    let pass;
    for (pass = 0; pass < 2; pass += 1) {
        const copy = new Uint8ClampedArray(d);
        let y;
        for (y = 1; y < h - 1; y += 1) {
            let x;
            for (x = 1; x < w - 1; x += 1) {
                const i = (y * w + x) * 4;
                if (copy[i + 3] < 18) {
                    continue;
                }
                const ch = Math.max(copy[i], copy[i + 1], copy[i + 2]) - Math.min(copy[i], copy[i + 1], copy[i + 2]);
                const lu = (copy[i] + copy[i + 1] + copy[i + 2]) / 3;
                if (ch > 28 || lu < 150) {
                    continue;
                }
                const edge = copy[i - 1] < 16 || copy[i + 7] < 16 || copy[i - w * 4 + 3] < 16 || copy[i + w * 4 + 3] < 16;
                if (!edge) {
                    continue;
                }
                const inward = [
                    [copy[i - 4], copy[i - 3], copy[i - 2], copy[i - 1]],
                    [copy[i + 4], copy[i + 5], copy[i + 6], copy[i + 7]],
                    [copy[i - w * 4], copy[i - w * 4 + 1], copy[i - w * 4 + 2], copy[i - w * 4 + 3]],
                    [copy[i + w * 4], copy[i + w * 4 + 1], copy[i + w * 4 + 2], copy[i + w * 4 + 3]]
                ];
                let real = false;
                let k;
                for (k = 0; k < 4; k += 1) {
                    const p = inward[k];
                    if (p[3] > 16 && (Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) > 28 || (p[0] + p[1] + p[2]) / 3 < 150)) {
                        real = true;
                    }
                }
                if (real) {
                    d[i + 3] = 0;
                }
            }
        }
    }

    ctx.putImageData(img, 0, 0);
    figureCache[key] = c;
    return c;
}

function paintAthlete() {
    const token = ++paintToken;
    const player = findItem(PLAYERS, look.player);
    const skin = findItem(SKINS, look.skin);
    const top = findItem(TOPS, look.top);
    const bottom = findItem(BOTTOMS, look.bottom);
    const hat = findItem(HATS, look.hat);
    const shoes = findItem(SHOES, look.shoes);

    return loadImage(player.body || player.image).then(function (body) {
        if (token !== paintToken || !body) {
            return;
        }
        const width = Math.max(1, rig.clientWidth);
        const height = Math.max(1, rig.clientHeight);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        dress.width = Math.round(width * ratio);
        dress.height = Math.round(height * ratio);
        dress.style.width = width + "px";
        dress.style.height = height + "px";
        const ctx = dress.getContext("2d");
        ctx.clearRect(0, 0, dress.width, dress.height);

        const figure = cleanedBody(body);
        const padX = dress.width * 0.1;
        const padTop = dress.height * 0.08;
        const padBot = dress.height * 0.11;
        const scale = Math.min(
            (dress.width - padX * 2) / figure.width,
            (dress.height - padTop - padBot) / figure.height
        );
        const bw = figure.width * scale;
        const bh = figure.height * scale;
        const box = {
            x: (dress.width - bw) / 2,
            y: padTop,
            w: bw,
            h: bh
        };

        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
        ctx.beginPath();
        ctx.ellipse(box.x + box.w * 0.5, box.y + box.h * 0.97, box.w * 0.2, Math.max(6, box.h * 0.018), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.drawImage(figure, box.x, box.y, box.w, box.h);
        stripHalo(ctx);
        if (look.skin !== "tan") {
            applySkinTone(ctx, box, parseColor(skin, null));
        }

        return Promise.all([
            loadImage(top.photo),
            loadImage(bottom.photo),
            loadImage(hat.photo),
            loadImage(shoes.photo)
        ]).then(function (images) {
            if (token !== paintToken) {
                return;
            }
            stampWear(ctx, figure, box, images[0], top, "top");
            stampWear(ctx, figure, box, images[1], bottom, "bottom");
            stampWear(ctx, figure, box, images[2], hat, "hat");
            stampWear(ctx, figure, box, images[3], shoes, "shoes");
            updateWearTag();
        });
    });
}

function applyLook() {
    paintAthlete();
    updateWearTag();
}

function updateWearTag() {
    if (!wearTag) {
        return;
    }
    const parts = [];
    if (look.top !== "none") parts.push(findItem(TOPS, look.top).name);
    if (look.bottom !== "none") parts.push(findItem(BOTTOMS, look.bottom).name);
    if (look.hat !== "none") parts.push(findItem(HATS, look.hat).name);
    if (look.shoes !== "none") parts.push(findItem(SHOES, look.shoes).name);
    wearTag.textContent = parts.length
        ? "On the player now: " + parts.join(" · ")
        : "Tap an item on the left — it goes on the player";
}

function paintRig() {
    rotY = Math.max(-180, Math.min(180, rotY));
    rotX = Math.max(-16, Math.min(16, rotX));
    dress.style.opacity = "1";
    dress.style.transform = "none";
    rig.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";
}

function itemsForTab(tab) {
    if (tab === "player") return PLAYERS;
    if (tab === "skin") return SKINS;
    if (tab === "tops") return TOPS;
    if (tab === "bottoms") return BOTTOMS;
    if (tab === "hats") return HATS;
    return SHOES;
}

function selectedId(tab) {
    if (tab === "player") return look.player;
    if (tab === "skin") return look.skin;
    if (tab === "tops") return look.top;
    if (tab === "bottoms") return look.bottom;
    if (tab === "hats") return look.hat;
    return look.shoes;
}

function setSelected(tab, id) {
    if (tab === "player") look.player = id;
    if (tab === "skin") look.skin = id;
    if (tab === "tops") look.top = id;
    if (tab === "bottoms") look.bottom = id;
    if (tab === "hats") look.hat = id;
    if (tab === "shoes") look.shoes = id;
    persist();
    applyLook();
    renderGrid();
    if (tab !== "player") {
        dress.classList.remove("is-dressing");
        void dress.offsetWidth;
        dress.classList.add("is-dressing");
    }
}

function thumbSrc(item) {
    if (!item.photo) {
        return "";
    }
    const version = (item.photo.match(/\?v=\d+$/) || [""])[0];
    return item.photo
        .replace("images/studio/gear/", "images/studio/thumbs/")
        .replace("images/studio/skins/", "images/studio/thumbs/")
        .replace(/\?v=\d+$/, "") + version;
}

function gearThumb(item, tab) {
    if (tab === "player") {
        return "<img src=\"" + item.image + "\" alt=\"" + item.alt + "\">";
    }
    const src = thumbSrc(item);
    const dot = item.color
        ? "<i class=\"studio-color-dot\" style=\"background:" + item.color + "\"></i>"
        : "";
    if (src) {
        return dot + "<img src=\"" + src + "\" alt=\"" + item.name + "\">";
    }
    return "<span class=\"studio-swatch\" style=\"background:" + (item.color || "rgba(255,255,255,0.12)") + "\"></span>";
}

function renderGrid() {
    const copy = TAB_COPY[activeTab];
    pickerLabel.textContent = copy[0];
    pickerHint.textContent = copy[1];
    unequipBtn.hidden = activeTab === "player" || activeTab === "skin" || selectedId(activeTab) === "none";

    grid.innerHTML = itemsForTab(activeTab).filter(function (item) {
        return item.id !== "none";
    }).map(function (item) {
        const on = selectedId(activeTab) === item.id;
        const label = item.league ? item.league + " · " + item.name : item.name;
        const badge = on && item.id !== "none" && activeTab !== "player" && activeTab !== "skin"
            ? "<em>ON</em>"
            : "";
        return "<button type=\"button\" class=\"studio-item" + (on ? " is-on" : "") + "\" data-id=\"" + item.id + "\">" +
            gearThumb(item, activeTab) + badge + "<span>" + label + "</span></button>";
    }).join("");
}

function setTab(tab) {
    activeTab = tab;
    document.querySelectorAll(".studio-tab").forEach(function (button) {
        const selected = button.dataset.tab === tab;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    renderGrid();
}

function openStudio() {
    studio.hidden = false;
    studio.classList.remove("overlay-hidden");
    document.body.classList.add("overlay-open");
    setTab("player");
    paintRig();
    requestAnimationFrame(function () {
        applyLook();
    });
}

function closeStudio() {
    persist();
    studio.classList.add("overlay-hidden");
    studio.hidden = true;
    document.body.classList.remove("overlay-open");
    if (window.loadSelectedAvatar) {
        window.loadSelectedAvatar();
    }
}

function stopDrag() {
    dragging = false;
}

document.addEventListener("click", function (event) {
    const opener = event.target.closest("[data-open-studio]");
    if (!opener) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    openStudio();
}, true);

document.querySelectorAll(".studio-tab").forEach(function (button) {
    button.addEventListener("click", function () {
        setTab(button.dataset.tab);
    });
});

grid.addEventListener("click", function (event) {
    const item = event.target.closest(".studio-item");
    if (!item) {
        return;
    }
    setSelected(activeTab, item.dataset.id);
});

unequipBtn.addEventListener("click", function () {
    if (activeTab === "tops" || activeTab === "bottoms" || activeTab === "hats" || activeTab === "shoes") {
        setSelected(activeTab, "none");
    }
});

document.getElementById("studioCloseBtn").addEventListener("click", closeStudio);
document.getElementById("studioSaveBtn").addEventListener("click", closeStudio);

stage.addEventListener("pointerdown", function (event) {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    stage.setPointerCapture(event.pointerId);
});
stage.addEventListener("pointerup", stopDrag);
stage.addEventListener("pointercancel", stopDrag);
stage.addEventListener("pointermove", function (event) {
    if (!dragging) {
        return;
    }
    rotY = Math.max(-180, Math.min(180, rotY + (event.clientX - lastX) * 0.55));
    rotX = Math.max(-16, Math.min(16, rotX + (event.clientY - lastY) * 0.22));
    lastX = event.clientX;
    lastY = event.clientY;
    paintRig();
});

window.addEventListener("resize", function () {
    if (!studio.hidden) {
        applyLook();
    }
});

window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !studio.hidden) {
        closeStudio();
    }
});

window.openAthleteStudio = openStudio;
window.__studioSetRot = function (y, x) {
    rotY = y;
    rotX = x || 0;
    paintRig();
    return { rotY: rotY, rotX: rotX };
};
