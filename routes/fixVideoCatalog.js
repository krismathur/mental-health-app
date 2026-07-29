/**
 * Short YouTube CLIPS of real in-game moments (not full tutorials).
 * Prefer shorts / sub-2-minute highlights. Longer videos use start/end seconds.
 */

const CATEGORIES = [
    "missed_shot",
    "penalty",
    "technique",
    "pressure",
    "mistake",
    "focus",
    "confidence",
    "anger",
    "bounce_back",
    "general"
];

const VIDEOS = [
    // Soccer — missed / saved penalty (short clips)
    {
        id: "SllfQUDS6UU",
        title: "Messi misses a World Cup penalty",
        athlete: "Lionel Messi",
        sports: ["soccer", "football"],
        categories: ["penalty", "missed_shot", "pressure", "mistake", "general"],
        keywords: ["penalty", "penatly", "pk", "spot kick", "missed an easy", "easy penalty", "missed penalty"],
        start: 70,
        end: 115
    },
    {
        id: "ziHTAgrzT8Q",
        title: "Messi penalty saved",
        athlete: "Lionel Messi",
        sports: ["soccer", "football"],
        categories: ["penalty", "missed_shot", "pressure", "mistake"],
        keywords: ["penalty", "saved", "keeper", "goalie", "pk"],
        start: 35,
        end: 70
    },

    // Basketball — missed free throws / easy finishes (short clips)
    {
        id: "89_3QICKB-U",
        title: "Jamal Murray misses clutch free throw",
        athlete: "Jamal Murray",
        sports: ["basketball"],
        categories: ["missed_shot", "pressure", "mistake", "general"],
        keywords: ["free throw", "ft", "foul shot", "missed free", "clutch"]
    },
    {
        id: "moQF9klGKpc",
        title: "Wembanyama misses clutch free throws",
        athlete: "Victor Wembanyama",
        sports: ["basketball"],
        categories: ["missed_shot", "pressure", "mistake"],
        keywords: ["free throw", "ft", "foul shot", "brick", "clutch"],
        start: 0,
        end: 45
    },
    {
        id: "jp1-3v9xaa0",
        title: "Missed open layup and clutch free throws",
        athlete: "NBA stars",
        sports: ["basketball"],
        categories: ["missed_shot", "mistake", "pressure"],
        keywords: ["layup", "open shot", "easy shot", "missed the", "wide open"]
    },

    // Baseball — dropped / easy play error (short clip)
    {
        id: "ZRkspG0KbtQ",
        title: "Castillo drops an easy popup",
        athlete: "Luis Castillo",
        sports: ["baseball", "softball"],
        categories: ["mistake", "missed_shot", "pressure", "general"],
        keywords: ["drop", "popup", "error", "catch", "easy", "missed catch", "boot"]
    },

    // Cross-sport short mental-moment fallbacks (still clips, not long lessons)
    {
        id: "YlSrPiSw3oE",
        title: "Reset after a mistake",
        athlete: "Elite athletes",
        sports: ["general", "basketball", "soccer", "football", "baseball", "tennis", "swimming", "volleyball", "hockey", "track", "golf"],
        categories: ["mistake", "bounce_back", "anger", "general"],
        keywords: ["mistake", "error", "messed up", "went wrong"],
        start: 0,
        end: 55
    },
    {
        id: "NCkuAPR_rP4",
        title: "Locked in under pressure",
        athlete: "Elite athletes",
        sports: ["general", "basketball", "soccer", "football", "baseball", "tennis", "swimming", "volleyball", "hockey", "track", "golf"],
        categories: ["pressure", "focus", "bounce_back"],
        keywords: ["pressure", "nervous", "choke", "anxious", "scared"],
        start: 0,
        end: 55
    },
    {
        id: "VSceuiPBpxY",
        title: "Confidence after a tough moment",
        athlete: "Elite athletes",
        sports: ["general", "basketball", "soccer", "football", "baseball", "tennis", "swimming", "volleyball", "hockey", "track", "golf"],
        categories: ["confidence", "bounce_back"],
        keywords: ["confidence", "doubt", "believe"],
        start: 0,
        end: 55
    },
    {
        id: "5JT4gUMkD-w",
        title: "Bounce-back moment",
        athlete: "Elite athletes",
        sports: ["general", "basketball", "soccer", "football", "baseball", "tennis", "swimming", "volleyball", "hockey", "track", "golf"],
        categories: ["bounce_back", "mistake", "anger"],
        keywords: ["bounce", "recover", "next play", "comeback"],
        start: 0,
        end: 55
    },
    {
        id: "vQRKPFI88PI",
        title: "Stay calm and compete",
        athlete: "Elite athletes",
        sports: ["general", "basketball", "soccer", "football", "baseball", "tennis", "swimming", "volleyball", "hockey", "track", "golf"],
        categories: ["pressure", "focus", "anger"],
        keywords: ["calm", "breathe", "panic", "stress"],
        start: 0,
        end: 55
    },
    {
        id: "T0tqqNYt0oQ",
        title: "Learn from a miss",
        athlete: "Elite athletes",
        sports: ["general", "basketball", "soccer", "football", "baseball", "tennis", "swimming", "volleyball", "hockey", "track", "golf"],
        categories: ["mistake", "missed_shot", "confidence"],
        keywords: ["fail", "failure", "miss", "error"],
        start: 0,
        end: 55
    }
];

const SPORT_ALIASES = [
    { key: "basketball", patterns: ["basketball", "bball", "hoop"] },
    { key: "soccer", patterns: ["soccer", "futbol", "football club", "fifa"] },
    { key: "football", patterns: ["american football", "nfl", "qb", "quarterback", "touchdown"] },
    { key: "baseball", patterns: ["baseball", "mlb", "softball"] },
    { key: "tennis", patterns: ["tennis"] },
    { key: "swimming", patterns: ["swim", "swimming"] },
    { key: "volleyball", patterns: ["volleyball", "vball"] },
    { key: "hockey", patterns: ["hockey"] },
    { key: "track", patterns: ["track", "running", "sprint", "cross country"] },
    { key: "golf", patterns: ["golf"] }
];

function normalizeSport(raw) {
    const text = String(raw || "").toLowerCase().trim();
    if (!text) {
        return "";
    }

    for (let i = 0; i < SPORT_ALIASES.length; i += 1) {
        const entry = SPORT_ALIASES[i];
        for (let j = 0; j < entry.patterns.length; j += 1) {
            if (text.includes(entry.patterns[j])) {
                return entry.key;
            }
        }
    }

    if (/\bfootball\b/.test(text) && !/american|nfl|qb|touchdown/.test(text)) {
        return "soccer";
    }

    return text.split(/[\s,/]+/)[0] || "";
}

function detectSportFromText(problem, profileSport) {
    const fromProblem = normalizeSport(problem);
    if (fromProblem && SPORT_ALIASES.some(function (entry) { return entry.key === fromProblem; })) {
        return fromProblem;
    }

    const fromProfile = normalizeSport(profileSport);
    if (fromProfile && SPORT_ALIASES.some(function (entry) { return entry.key === fromProfile; })) {
        return fromProfile;
    }

    return fromProfile || fromProblem || "general";
}

function textMentionsSport(problem) {
    const text = String(problem || "").toLowerCase();
    if (/\bfootball\b/.test(text)) {
        return true;
    }
    return SPORT_ALIASES.some(function (entry) {
        return entry.patterns.some(function (pattern) {
            return text.includes(pattern);
        });
    });
}

function detectCategory(problem, geminiCategory) {
    const cleaned = String(geminiCategory || "").toLowerCase().trim().replace(/\s+/g, "_");
    if (CATEGORIES.includes(cleaned)) {
        return cleaned;
    }

    const text = String(problem || "").toLowerCase();
    if (/penalt|penatly|\bpk\b|spot kick/.test(text)) {
        return "penalty";
    }
    if (/nerv|press|choke|anxious|scare|clutch|panic/.test(text)) {
        return "pressure";
    }
    if (/miss|shot|shoot|free throw|goal|kick|swing|layup|open/.test(text)) {
        return "missed_shot";
    }
    if (/form|mechan|technique|footwork|timing/.test(text)) {
        return "technique";
    }
    if (/turnover|error|mistake|fumble|fault|whiff|drop/.test(text)) {
        return "mistake";
    }
    if (/focus|distract|overthink|zone/.test(text)) {
        return "focus";
    }
    if (/confidence|doubt|believe/.test(text)) {
        return "confidence";
    }
    if (/angry|mad|frustrat|yell/.test(text)) {
        return "anger";
    }
    if (/bounce|recover|next play|comeback/.test(text)) {
        return "bounce_back";
    }
    return "general";
}

function scoreVideo(video, sport, category, problem) {
    let score = 0;
    const text = String(problem || "").toLowerCase();

    if (video.sports.includes(sport)) {
        score += 10;
    } else if (video.sports.includes("general")) {
        score += 1;
    } else {
        score -= 4;
    }

    if (video.categories.includes(category)) {
        score += 8;
    }

    video.keywords.forEach(function (keyword) {
        if (text.includes(keyword.toLowerCase())) {
            // Longer / more specific phrases weigh more
            score += keyword.includes(" ") ? 5 : 3;
        }
    });

    // Strong boost for exact moment matches (penalty miss → Messi clip)
    if (category === "penalty" && video.categories.includes("penalty") && video.sports.includes(sport)) {
        score += 12;
    }

    if (video.sports.includes(sport) && !video.sports.includes("general") && video.sports.length <= 2) {
        score += 4;
    }

    return score;
}

function buildEmbedUrl(video) {
    const params = ["autoplay=1", "rel=0", "modestbranding=1", "playsinline=1"];
    if (typeof video.start === "number") {
        params.push("start=" + video.start);
    }
    if (typeof video.end === "number") {
        params.push("end=" + video.end);
    }
    return "https://www.youtube.com/embed/" + video.id + "?" + params.join("&");
}

function pickVideo(options) {
    const sport = detectSportFromText(options.problem, options.profileSport);
    const category = detectCategory(options.problem, options.category);
    const ranked = VIDEOS
        .map(function (video) {
            return {
                video: video,
                score: scoreVideo(video, sport, category, options.problem)
            };
        })
        .sort(function (a, b) {
            return b.score - a.score;
        });

    const best = ranked[0] && ranked[0].score > 0
        ? ranked[0].video
        : VIDEOS.find(function (video) { return video.id === "YlSrPiSw3oE"; });

    return {
        youtubeId: best.id,
        title: best.title,
        athlete: best.athlete,
        sport: sport,
        category: category,
        start: best.start || 0,
        end: best.end || null,
        embedUrl: buildEmbedUrl(best),
        watchUrl: "https://www.youtube.com/watch?v=" + best.id +
            (typeof best.start === "number" ? "&t=" + best.start + "s" : "")
    };
}

module.exports = {
    CATEGORIES: CATEGORIES,
    VIDEOS: VIDEOS,
    normalizeSport: normalizeSport,
    detectSportFromText: detectSportFromText,
    textMentionsSport: textMentionsSport,
    detectCategory: detectCategory,
    pickVideo: pickVideo
};
