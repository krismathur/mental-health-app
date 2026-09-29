/**
 * Search YouTube for a short clip of a high-level athlete performing the exact
 * skill the user wants to visualize. Playback is hard-capped at one minute.
 * Matching is strict: the clip title must reflect the user's skill keywords.
 */

const MAX_CLIP_SECONDS = 60;

const STOP_WORDS = {
    a: true, an: true, the: true, and: true, or: true, but: true, to: true, of: true,
    in: true, on: true, at: true, for: true, my: true, i: true, me: true, we: true,
    it: true, was: true, were: true, is: true, are: true, be: true, been: true,
    that: true, this: true, with: true, from: true, today: true, because: true,
    just: true, really: true, very: true, so: true, too: true, when: true, then: true,
    they: true, them: true, their: true, our: true, your: true, you: true, had: true,
    have: true, has: true, did: true, do: true, doing: true, got: true, get: true
};

const ACTION_GROUPS = [
    {
        id: "penalty",
        patterns: ["penalty", "penatly", "penaly", "penalties", "pk", "spot kick"],
        titleMust: ["penalty", "penaly", "penalties", "pk"],
        searchTerms: ["perfect penalty kick goal clip", "penalty kick scored highlight"]
    },
    {
        id: "free_throw",
        patterns: ["free throw", "freethrow", "foul shot", "ft"],
        titleMust: ["free throw", "freethrow", "foul shot"],
        searchTerms: ["perfect free throw made clip", "free throw shooting highlight"]
    },
    {
        id: "layup",
        patterns: ["layup", "lay up", "lay-up"],
        titleMust: ["layup", "lay up"],
        searchTerms: ["perfect layup finish clip", "layup made highlight"]
    },
    {
        id: "three_pointer",
        patterns: ["three pointer", "3 pointer", "three-point", "3pt", "three"],
        titleMust: ["three", "3-point", "3pt", "triple"],
        searchTerms: ["three pointer made clip", "perfect 3 pointer highlight"]
    },
    {
        id: "shot",
        patterns: ["shot", "shoot", "jumper", "jump shot"],
        titleMust: ["shot", "jumper", "miss"],
        searchTerms: ["perfect shot made clip", "jump shot made highlight"]
    },
    {
        id: "goal",
        patterns: ["goal", "finish", "finishing", "open net"],
        titleMust: ["goal", "finish", "open net", "miss"],
        searchTerms: ["perfect goal finish clip", "great finishing goal highlight"]
    },
    {
        id: "catch_error",
        patterns: ["drop", "dropped", "popup", "pop up", "catch", "error"],
        titleMust: ["drop", "dropped", "error", "catch", "popup"],
        searchTerms: ["great catch clip", "perfect catch highlight"]
    },
    {
        id: "strikeout",
        patterns: ["strikeout", "struck out", "k'd", "whiff"],
        titleMust: ["strikeout", "struck out", "whiff", "k"],
        searchTerms: ["perfect baseball swing hit clip", "pro baseball hitting highlight"]
    },
    {
        id: "double_fault",
        patterns: ["double fault", "fault", "serve"],
        titleMust: ["double fault", "fault", "serve"],
        searchTerms: ["perfect tennis serve clip", "ace serve highlight"]
    },
    {
        id: "turnover",
        patterns: ["turnover", "giveaway", "fumble", "intercept"],
        titleMust: ["turnover", "fumble", "intercept", "giveaway"],
        searchTerms: ["ball security technique game clip", "clean possession highlight"]
    },
    {
        id: "pass",
        patterns: ["bad pass", "errant pass", "threw away", "pass"],
        titleMust: ["pass", "turnover", "throw"],
        searchTerms: ["perfect pass game clip", "accurate pass highlight"]
    },
    {
        id: "serve",
        patterns: ["serve", "ace", "service"],
        titleMust: ["serve", "service", "ace", "fault"],
        searchTerms: ["perfect serve clip", "ace service highlight"]
    }
];

const SPORT_ALIASES = [
    { key: "basketball", patterns: ["basketball", "bball", "hoops", "hoop"] },
    // Soccer first so phrases like "football club" / "fifa" stay soccer.
    { key: "soccer", patterns: ["soccer", "futbol", "football club", "fifa", "premier league", "la liga", "mls"] },
    // Plain "football" means American football.
    { key: "football", patterns: ["american football", "football", "nfl", "qb", "quarterback", "touchdown", "gridiron", "field goal", "fumble"] },
    { key: "baseball", patterns: ["baseball", "mlb", "softball"] },
    { key: "tennis", patterns: ["tennis"] },
    { key: "swimming", patterns: ["swim", "swimming"] },
    { key: "volleyball", patterns: ["volleyball", "vball"] },
    { key: "hockey", patterns: ["hockey"] },
    { key: "track", patterns: ["track", "running", "sprint", "cross country"] },
    { key: "golf", patterns: ["golf"] },
    { key: "lacrosse", patterns: ["lacrosse", "lax"] },
    { key: "rugby", patterns: ["rugby"] },
    { key: "wrestling", patterns: ["wrestling", "wrestle"] },
    { key: "gymnastics", patterns: ["gymnastic"] },
    { key: "cheer", patterns: ["cheer", "cheerleading"] },
    { key: "boxing", patterns: ["boxing", "boxer"] },
    { key: "mma", patterns: ["mma", "ufc"] },
    { key: "cricket", patterns: ["cricket"] }
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

    return "";
}

function freeformSportLabel(raw) {
    const text = String(raw || "").toLowerCase().trim()
        .replace(/[^\w\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!text) {
        return "";
    }

    // "Soccer - I missed..." or "In basketball I ..."
    const dashed = text.split(/\s[-–—]\s/)[0].trim();
    if (dashed && dashed.length <= 24 && dashed.split(" ").length <= 3) {
        const known = normalizeSport(dashed);
        if (known) {
            return known;
        }
        if (!/\b(i|my|the|a|an|today|missed|played)\b/.test(dashed)) {
            return dashed;
        }
    }

    return "";
}

function textMentionsSport(problem) {
    const text = String(problem || "").toLowerCase();
    if (/\bfootball\b/.test(text)) {
        return true;
    }
    if (SPORT_ALIASES.some(function (entry) {
        return entry.patterns.some(function (pattern) {
            return text.includes(pattern);
        });
    })) {
        return true;
    }
    return !!freeformSportLabel(problem);
}

function hasSportContext(problem, profileSport) {
    return textMentionsSport(problem) || !!String(profileSport || "").trim();
}

function detectSportFromText(problem, profileSport) {
    return normalizeSport(problem) ||
        freeformSportLabel(problem) ||
        normalizeSport(profileSport) ||
        String(profileSport || "").toLowerCase().trim() ||
        "sports";
}

function detectActionGroup(problem) {
    const text = String(problem || "").toLowerCase();
    for (let i = 0; i < ACTION_GROUPS.length; i += 1) {
        const group = ACTION_GROUPS[i];
        for (let j = 0; j < group.patterns.length; j += 1) {
            if (text.includes(group.patterns[j])) {
                return group;
            }
        }
    }
    return null;
}

function extractActionKeywords(problem) {
    const text = String(problem || "").toLowerCase()
        .replace(/[^\w\s'-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const words = text.split(" ").filter(function (word) {
        return word.length > 2 && !STOP_WORDS[word];
    });

    const unique = [];
    words.forEach(function (word) {
        if (unique.indexOf(word) === -1) {
            unique.push(word);
        }
    });

    return unique;
}

function titleMatchesAction(title, meta) {
    const lower = String(title || "").toLowerCase();

    if (meta.actionGroup && Array.isArray(meta.actionGroup.titleMust)) {
        // Soft match: action-group token in title is enough.
        return meta.actionGroup.titleMust.some(function (token) {
            return lower.includes(token);
        });
    }

    const keywords = meta.actionKeywords || extractActionKeywords(meta.problem || "");
    if (!keywords.length) {
        return true;
    }

    // Without a known action group, accept titles that share any meaningful word.
    return keywords.some(function (word) {
        return word.length > 2 && lower.includes(word);
    });
}

function softTitleOk(title) {
    const lower = String(title || "").toLowerCase();
    return !/tutorial|how to|form breakdown|workout|drill|podcast|full game highlights|extended highlights|reaction|reacts|narrat|voice over|explained|breaks down/.test(lower);
}

function parseClockToSeconds(label) {
    if (!label) {
        return 9999;
    }

    const cleaned = String(label).trim().toLowerCase();

    if (/second|minute|hour/.test(cleaned)) {
        let total = 0;
        const hours = cleaned.match(/(\d+)\s*hour/);
        const minutes = cleaned.match(/(\d+)\s*minute/);
        const seconds = cleaned.match(/(\d+)\s*second/);
        if (hours) total += Number(hours[1]) * 3600;
        if (minutes) total += Number(minutes[1]) * 60;
        if (seconds) total += Number(seconds[1]);
        return total || 9999;
    }

    const parts = cleaned.split(":").map(function (part) {
        return Number(part);
    });
    if (parts.some(function (n) { return Number.isNaN(n); })) {
        return 9999;
    }
    if (parts.length === 3) {
        return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }
    if (parts.length === 2) {
        return (parts[0] * 60) + parts[1];
    }
    return 9999;
}

function parseIsoDuration(value) {
    const match = String(value || "").match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!match) {
        return 0;
    }
    return (Number(match[1] || 0) * 3600)
        + (Number(match[2] || 0) * 60)
        + Number(match[3] || 0);
}

function sportSearchLabel(sport) {
    const key = String(sport || "").toLowerCase().trim();
    if (key === "football") {
        return "NFL american football";
    }
    if (key === "basketball") {
        return "NBA basketball";
    }
    if (key === "baseball") {
        return "MLB baseball";
    }
    if (key === "soccer") {
        return "Premier League soccer";
    }
    if (key === "tennis") {
        return "ATP Wimbledon tennis";
    }
    return key || "sports";
}

function buildFallbackSearchQuery(problem, sport, actionGroup) {
    const sportLabel = sportSearchLabel(sport);

    if (actionGroup) {
        return sportLabel + " " + actionGroup.searchTerms[0] + " pro game no commentary";
    }

    const cleaned = String(problem || "")
        .replace(/[^\w\s'-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return (sportLabel + " " + cleaned + " pro athlete real game clip no commentary").trim();
}

async function buildSearchMeta(problem, profileSport) {
    const sport = detectSportFromText(problem, profileSport);
    const actionGroup = detectActionGroup(problem);
    const actionKeywords = extractActionKeywords(problem);

    if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) {
        return {
            searchQuery: buildFallbackSearchQuery(problem, sport, actionGroup),
            altQueries: actionGroup ? actionGroup.searchTerms.map(function (term) {
                return sportSearchLabel(sport) + " " + term;
            }) : [],
            sport: sport,
            action: problem,
            athleteHint: "",
            actionGroup: actionGroup,
            actionKeywords: actionKeywords,
            problem: problem
        };
    }

    const prompt = `A young athlete named ONE specific sports skill they want to visualize. Create YouTube searches for a SHORT clip of a high-level athlete doing that skill correctly.

Skill: "${problem}"
Sport: "${profileSport || sport}"
Detected action type: "${actionGroup ? actionGroup.id : "unknown"}"

Important sport meanings:
- "football" means American football / NFL (NOT soccer).
- Use "soccer" only when they mean soccer/futbol.

Rules:
1. Keep the exact requested skill ("forehand with topspin" must not become a generic tennis clip).
2. Show the skill being performed successfully, not a mistake or failure.
3. Prefer famous pros in real games or high-level demonstrations.
4. Add: clip OR highlight OR slow motion.
5. Prefer footage where the movement is easy to see, with no reaction channels or talking heads.
6. Avoid long tutorials, compilations, and full matches.
7. If sport is football/American football, search NFL clips, never soccer.
8. Prefer clips under 60 seconds.

Return ONLY JSON:
{"searchQuery":"Roger Federer forehand topspin slow motion clip","altQueries":["pro tennis topspin forehand highlight","ATP forehand topspin slow motion"],"sport":"tennis","action":"forehand with topspin","athleteHint":"Roger Federer","mustHaveInTitle":["forehand","topspin"]}`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!response.ok || !rawText) {
            throw new Error("Gemini failed");
        }

        const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
        const altQueries = Array.isArray(parsed.altQueries)
            ? parsed.altQueries.map(function (q) { return String(q).trim(); }).filter(Boolean)
            : [];

        return {
            searchQuery: String(parsed.searchQuery || "").trim() || buildFallbackSearchQuery(problem, sport, actionGroup),
            altQueries: altQueries,
            sport: sport,
            action: String(parsed.action || problem).trim(),
            athleteHint: String(parsed.athleteHint || "").trim(),
            mustHaveInTitle: Array.isArray(parsed.mustHaveInTitle)
                ? parsed.mustHaveInTitle.map(function (t) { return String(t).toLowerCase(); })
                : [],
            actionGroup: actionGroup,
            actionKeywords: actionKeywords,
            problem: problem
        };
    } catch (error) {
        return {
            searchQuery: buildFallbackSearchQuery(problem, sport, actionGroup),
            altQueries: actionGroup ? actionGroup.searchTerms.map(function (term) {
                return sportSearchLabel(sport) + " " + term;
            }) : [],
            sport: sport,
            action: problem,
            athleteHint: "",
            mustHaveInTitle: actionGroup ? actionGroup.titleMust.slice() : [],
            actionGroup: actionGroup,
            actionKeywords: actionKeywords,
            problem: problem
        };
    }
}

function extractTitle(videoRenderer) {
    if (!videoRenderer || !videoRenderer.title) {
        return "Sports clip";
    }
    if (Array.isArray(videoRenderer.title.runs)) {
        return videoRenderer.title.runs.map(function (run) {
            return run.text || "";
        }).join("");
    }
    return videoRenderer.title.simpleText || "Sports clip";
}

function extractLengthLabel(videoRenderer) {
    if (!videoRenderer || !videoRenderer.lengthText) {
        return "";
    }
    if (videoRenderer.lengthText.simpleText) {
        return videoRenderer.lengthText.simpleText;
    }
    return videoRenderer.lengthText.accessibility?.accessibilityData?.label || "";
}

// Preferred path: the official YouTube Data API. Scraping the public search
// page (below) gets flagged by Google's abuse detection and redirected to a
// captcha, which made clip search fail for every query. Set YOUTUBE_API_KEY
// (and enable "YouTube Data API v3" on the Google Cloud project) to use this.
async function searchYouTubeApi(searchQuery) {
    const key = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error("No YouTube API key configured");
    }

    const url = "https://www.googleapis.com/youtube/v3/search"
        + "?part=snippet&type=video&videoEmbeddable=true&maxResults=15"
        + "&q=" + encodeURIComponent(searchQuery)
        + "&key=" + encodeURIComponent(key);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        const reason = data?.error?.message || ("HTTP " + response.status);
        throw new Error("YouTube Data API error: " + reason);
    }

    const searchItems = (data.items || [])
        .filter(function (item) {
            return item.id && item.id.videoId;
        });
    const ids = searchItems.map(function (item) { return item.id.videoId; });
    let durationById = {};

    if (ids.length) {
        const detailsUrl = "https://www.googleapis.com/youtube/v3/videos"
            + "?part=contentDetails,status&id=" + encodeURIComponent(ids.join(","))
            + "&key=" + encodeURIComponent(key);
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        if (detailsResponse.ok) {
            durationById = (detailsData.items || []).reduce(function (result, item) {
                if (item.status?.embeddable !== false) {
                    result[item.id] = parseIsoDuration(item.contentDetails?.duration);
                }
                return result;
            }, {});
        }
    }

    return searchItems
        .map(function (item) {
            return {
                videoId: item.id.videoId,
                title: item.snippet?.title || "",
                lengthSeconds: durationById[item.id.videoId] || 0,
                lengthLabel: "",
                author: item.snippet?.channelTitle || "YouTube"
            };
        });
}

// One clip lookup runs up to ~9 queries. Once the Data API has proven
// unavailable (no key, or the API not enabled on the project) there is no
// point paying a failed round-trip on each of them, so it is only retried
// after a restart.
let youtubeApiUnavailable = false;

async function searchYouTube(searchQuery) {
    if (!youtubeApiUnavailable) {
        try {
            return await searchYouTubeApi(searchQuery);
        } catch (apiError) {
            youtubeApiUnavailable = true;
            console.error("[fix-advice] Data API unavailable, using scrape fallback for this run:", apiError.message);
        }
    }

    return await searchYouTubeHtml(searchQuery);
}

async function searchYouTubeHtml(searchQuery) {
    const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(searchQuery);
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9"
        }
    });

    if (!response.ok) {
        throw new Error("YouTube search failed");
    }

    const html = await response.text();
    const marker = "var ytInitialData = ";
    const start = html.indexOf(marker);
    if (start < 0) {
        throw new Error("Could not parse YouTube search results");
    }

    const jsonStart = start + marker.length;
    const end = html.indexOf(";</script>", jsonStart);
    const data = JSON.parse(html.slice(jsonStart, end));
    const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const videos = [];

    sections.forEach(function (section) {
        const items = section?.itemSectionRenderer?.contents || [];
        items.forEach(function (item) {
            const renderer = item.videoRenderer;
            if (!renderer || !renderer.videoId) {
                return;
            }

            const lengthLabel = extractLengthLabel(renderer);
            videos.push({
                videoId: renderer.videoId,
                title: extractTitle(renderer),
                lengthSeconds: parseClockToSeconds(lengthLabel),
                lengthLabel: lengthLabel,
                author: renderer.ownerText?.runs?.[0]?.text || "YouTube"
            });
        });
    });

    return videos;
}

function scoreCandidate(item, meta) {
    const title = String(item.title || "").toLowerCase();
    const action = String(meta.action || "").toLowerCase();
    const problem = String(meta.problem || "").toLowerCase();
    const sport = String(meta.sport || "").toLowerCase();
    const duration = Number(item.lengthSeconds) || 9999;
    let score = 8;

    if (!softTitleOk(title)) {
        return -1000;
    }

    if (meta.actionGroup && !titleMatchesAction(title, meta)) {
        // Keep as weak candidate instead of hard reject
        score -= 12;
    } else if (titleMatchesAction(title, meta)) {
        score += 18;
    }

    if (Array.isArray(meta.mustHaveInTitle) && meta.mustHaveInTitle.length) {
        const hits = meta.mustHaveInTitle.filter(function (token) {
            return token && title.includes(token);
        }).length;
        if (hits === 0) {
            score -= 8;
        } else {
            score += hits * 10;
        }
    }

    if (duration <= 30) {
        score += 45;
    } else if (duration <= MAX_CLIP_SECONDS) {
        score += 22;
    } else if (duration <= 120) {
        score += 10;
    } else if (duration <= 180) {
        score += 2;
    } else {
        score -= 10;
    }

    if (sport && sport !== "sports" && title.includes(sport)) {
        score += 8;
    }

    if (sport === "football" && /(nfl|touchdown|quarterback|fumble|field goal)/.test(title)) {
        score += 10;
    }

    if (sport === "soccer" && /(soccer|fifa|premier league|goalkeeper|penalty)/.test(title)) {
        score += 8;
    }

    const keywords = meta.actionKeywords || extractActionKeywords(problem + " " + action);
    let keywordHits = 0;
    keywords.forEach(function (word) {
        if (word.length > 2 && title.includes(word)) {
            keywordHits += 1;
            score += 5;
        }
    });

    if (keywordHits < 1) {
        score -= 6;
    }

    if (/tutorial|how to|form breakdown|full game|extended|analysis|workout|drill|compilation|all \d+|narrat|commentary|reaction|explained|breaks down|voice over|podcast|reacts|tiktok|shorts funny/.test(title)) {
        score -= 45;
    }

    if (/no commentary|silent|raw footage|in[- ]game|broadcast|stadium sound|no voice|no talking| pro game|nba|nfl|mlb|premier league/.test(title)) {
        score += 28;
    }

    // Prefer real pro-league / famous athlete game clips
    if (/\b(nba|nfl|mlb|nhl|fifa|uefa|premier league|world cup|playoffs|finals|super bowl|world series)\b/.test(title)) {
        score += 16;
    }

    if (meta.athleteHint) {
        String(meta.athleteHint).toLowerCase().split(/\s+/).forEach(function (part) {
            if (part.length > 2 && title.includes(part)) {
                score += 5;
            }
        });
    }

    return score;
}

function rankCandidates(candidates, meta) {
    return candidates.map(function (item) {
        return { item: item, score: scoreCandidate(item, meta) };
    }).filter(function (entry) {
        return entry.score > 0;
    }).sort(function (a, b) {
        return b.score - a.score;
    });
}

function softRankCandidates(candidates) {
    return candidates.map(function (item) {
        const title = String(item.title || "").toLowerCase();
        const duration = Number(item.lengthSeconds) || 9999;
        let score = 5;

        if (!softTitleOk(title)) {
            score = -100;
        } else if (duration <= 30) {
            score += 40;
        } else if (duration <= MAX_CLIP_SECONDS) {
            score += 15;
        } else if (duration <= 180) {
            score += 5;
        }

        if (/perfect|made|goal|winner|ace|topspin|slow motion|technique|highlight/.test(title)) {
            score += 12;
        }

        return { item: item, score: score };
    }).filter(function (entry) {
        return entry.score > 0;
    }).sort(function (a, b) {
        return b.score - a.score;
    });
}

async function pickBestWithGemini(ranked, meta) {
    if (!ranked.length) {
        return null;
    }

    if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL || ranked.length === 1) {
        return {
            item: ranked[0].item,
            startSecond: 0
        };
    }

    const top = ranked.slice(0, 8);
    const prompt = `Pick the ONE YouTube clip that best shows the athlete's requested skill being performed correctly, then choose WHERE the action starts.

Requested skill: "${meta.problem}"
Required movement: "${meta.action}"
Sport: "${meta.sport}"

Clips:
${top.map(function (entry, index) {
    return (index + 1) + ". id=" + entry.item.videoId + " | " + entry.item.lengthSeconds + "s | " + entry.item.title;
}).join("\n")}

Rules:
- Choose the clip whose title most clearly matches the exact requested skill.
- The athlete should perform the skill successfully and with good form.
- Prefer professional game footage or a clear high-level demonstration.
- Reject mistakes, failures, reaction channels, long tutorials, and compilations.
- startSecond = the exact second the skill begins (skip intros, logos, and talking).
- We play ONLY startSecond through startSecond+60, then stop.

Return ONLY JSON: {"videoId":"...","startSecond":0,"why":"short reason"}`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!response.ok || !rawText) {
            return { item: ranked[0].item, startSecond: 0 };
        }

        const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
        const chosen = top.find(function (entry) {
            return entry.item.videoId === parsed.videoId;
        });

        if (!chosen || !titleMatchesAction(chosen.item.title, meta)) {
            return { item: ranked[0].item, startSecond: 0 };
        }

        const duration = Number(chosen.item.lengthSeconds) || MAX_CLIP_SECONDS;
        let startSecond = Number(parsed.startSecond);
        if (!Number.isFinite(startSecond) || startSecond < 0) {
            startSecond = 0;
        }
        // Keep a playable window inside the video
        if (startSecond > Math.max(0, duration - 5)) {
            startSecond = Math.max(0, duration - Math.min(MAX_CLIP_SECONDS, duration));
        }

        return {
            item: chosen.item,
            startSecond: Math.floor(startSecond)
        };
    } catch (error) {
        return { item: ranked[0].item, startSecond: 0 };
    }
}

function buildEmbedUrl(youtubeId, start, end) {
    const params = [
        "autoplay=1",
        "mute=0",
        "rel=0",
        "modestbranding=1",
        "playsinline=1",
        "controls=0",
        "disablekb=1",
        "fs=0",
        "iv_load_policy=3",
        "cc_load_policy=0",
        "showinfo=0",
        "start=" + start,
        "end=" + end
    ];
    // Autoplay with sound after user click; no controls / captions / keyboard.
    return "https://www.youtube-nocookie.com/embed/" + youtubeId + "?" + params.join("&");
}

function uniqueById(list) {
    const seen = {};
    const out = [];
    list.forEach(function (item) {
        if (!item || !item.videoId || seen[item.videoId]) {
            return;
        }
        seen[item.videoId] = true;
        out.push(item);
    });
    return out;
}

async function findClipForProblem(problem, profileSport) {
    const meta = await buildSearchMeta(problem, profileSport);
    const sportLabel = sportSearchLabel(meta.sport);
    const actionWords = (meta.actionKeywords || []).slice(0, 6).join(" ");
    const queries = [meta.searchQuery]
        .concat(meta.altQueries || [])
        .concat([
            sportLabel + " " + meta.action + " real game clip no commentary",
            sportLabel + " " + meta.action + " broadcast highlight",
            meta.actionGroup ? (sportLabel + " " + meta.actionGroup.searchTerms[0] + " pro game") : "",
            meta.actionGroup ? (sportLabel + " " + meta.actionGroup.searchTerms[0] + " no commentary") : "",
            (sportLabel + " " + actionWords + " in game clip no commentary").trim(),
            (sportLabel + " " + actionWords + " professional game highlight").trim()
        ])
        .filter(Boolean);

    let candidates = [];
    for (let i = 0; i < queries.length; i += 1) {
        try {
            const found = await searchYouTube(queries[i]);
            candidates = candidates.concat(found);
        } catch (error) {
            console.error("[fix-advice] YouTube search failed for query \"" + queries[i] + "\":", error.message);
        }

        const rankedSoFar = rankCandidates(uniqueById(candidates), meta);
        if (rankedSoFar.length >= 2 && rankedSoFar[0].score >= 30) {
            break;
        }
    }

    candidates = uniqueById(candidates);
    let ranked = rankCandidates(candidates, meta);

    if (!ranked.length && meta.actionGroup) {
        for (let i = 0; i < meta.actionGroup.searchTerms.length; i += 1) {
            const forcedQuery = sportLabel + " " + meta.actionGroup.searchTerms[i];
            try {
                candidates = uniqueById(candidates.concat(await searchYouTube(forcedQuery)));
            } catch (error) {
                // continue
            }
        }
        ranked = rankCandidates(candidates, meta);
    }

    if (!ranked.length) {
        ranked = softRankCandidates(candidates);
    }

    const picked = await pickBestWithGemini(ranked, meta);
    if (!picked || !picked.item) {
        return null;
    }

    const best = picked.item;
    const duration = Math.max(1, Number(best.lengthSeconds) || MAX_CLIP_SECONDS);
    const start = Math.max(0, Number(picked.startSecond) || 0);
    const end = Math.min(start + MAX_CLIP_SECONDS, duration === 9999 ? start + MAX_CLIP_SECONDS : duration);

    return {
        youtubeId: best.videoId,
        title: best.title,
        athlete: best.author || meta.athleteHint || "Pro athlete",
        sport: meta.sport,
        action: meta.action,
        start: start,
        end: end,
        lengthSeconds: best.lengthSeconds,
        embedUrl: buildEmbedUrl(best.videoId, start, end),
        watchUrl: "https://www.youtube.com/watch?v=" + best.videoId + "&t=" + start + "s",
        searchQuery: meta.searchQuery,
        reason: "Watch how the athlete performs this skill with control and confidence."
    };
}

module.exports = {
    MAX_CLIP_SECONDS: MAX_CLIP_SECONDS,
    textMentionsSport: textMentionsSport,
    hasSportContext: hasSportContext,
    detectSportFromText: detectSportFromText,
    findClipForProblem: findClipForProblem
};
