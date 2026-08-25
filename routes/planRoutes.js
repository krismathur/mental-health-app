const express = require("express");
const fs = require("fs");
const path = require("path");

const DEBUG_LOG_PATH = path.join(__dirname, "..", ".cursor", "debug-56a177.log");

function debugLog(location, message, data, hypothesisId) {
    try {
        fs.appendFileSync(DEBUG_LOG_PATH, JSON.stringify({
            sessionId: "56a177",
            location: location,
            message: message,
            data: data,
            timestamp: Date.now(),
            hypothesisId: hypothesisId
        }) + "\n");
    } catch (e) {
        // ignore logging failures
    }
}

function pcmToWav(pcm, sampleRate, numChannels, bitsPerSample) {
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = pcm.length;
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);
    pcm.copy(buffer, 44);

    return buffer;
}

function createPlanRoutes(db) {
    const router = express.Router();

    function toSentenceList(value) {
        if (Array.isArray(value)) {
            return value.map(String).map(function (item) {
                return item.trim();
            }).filter(Boolean);
        }

        if (typeof value === "string" && value.trim()) {
            return value.split(/(?<=[.!?])\s+/).map(function (item) {
                return item.trim();
            }).filter(Boolean);
        }

        return [];
    }

    function normalizeWeeklyGoal(value) {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }

        if (Array.isArray(value)) {
            return value.map(String).join(" ").trim();
        }

        return "";
    }

    function repairJsonText(text) {
        return text
            .replace(/[\u201C\u201D]/g, "\"")
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/,\s*([\]}])/g, "$1");
    }

    function extractJsonObject(text) {
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) {
            return text;
        }
        return text.slice(start, end + 1);
    }

    function normalizeYouAreDoneWhen(value) {
        if (Array.isArray(value)) {
            return value.map(String).join(" ").trim();
        }
        return String(value || "").trim();
    }

    function normalizePlanText(rawText) {
        if (!rawText) {
            return null;
        }

        const candidates = [
            rawText.replace(/```json|```/g, "").trim(),
            extractJsonObject(rawText.replace(/```json|```/g, "").trim()),
            repairJsonText(extractJsonObject(rawText.replace(/```json|```/g, "").trim()))
        ];

        for (const candidate of candidates) {
            try {
                const parsed = JSON.parse(candidate);
                const weeklyGoal = normalizeWeeklyGoal(parsed.weeklyGoal);

                if (!weeklyGoal || !Array.isArray(parsed.days) || parsed.days.length === 0) {
                    continue;
                }

                parsed.weeklyGoal = weeklyGoal;
                parsed.days = parsed.days.map(function (day, index) {
                    return {
                        day: day.day || index + 1,
                        title: String(day.title || "Day " + (index + 1)).trim(),
                        duration: String(day.duration || "20-30 minutes").trim(),
                        daySummary: toSentenceList(day.daySummary || day.summary),
                        whatToDo: toSentenceList(day.whatToDo || day.mainWork),
                        sportTryIt: toSentenceList(day.sportTryIt || day.sportApplication),
                        thinkAboutIt: toSentenceList(day.thinkAboutIt || day.reflection),
                        youAreDoneWhen: normalizeYouAreDoneWhen(day.youAreDoneWhen || day.completionCheck)
                    };
                });

                return JSON.stringify(parsed);
            } catch (error) {
                // Try the next cleanup strategy.
            }
        }

        return null;
    }

    router.get("/api/my-plan", function (req, res) {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Please log in first." });
        }

        db.get(
            `SELECT id, plan_text
            FROM plans
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 1`,
            [req.session.userId],
            function (error, plan) {
                if (error) {
                    return res.status(500).json({ message: "Could not load your plan." });
                }

                if (!plan) {
                    return res.json({ status: "none" });
                }

                res.json({
                    status: "approved",
                    planId: plan.id,
                    plan: plan.plan_text
                });
            }
        );
    });

    router.post("/api/generate-plan", async function (req, res) {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Please log in before generating a plan." });
        }

        const { name, age, sport, goal, challenge, days, confidence, stress, focus, bounce, mentalSkill, goalCommitment } = req.body;

        // #region agent log
        debugLog("planRoutes.js:generate-plan:entry", "Generate plan requested", {
            hasUserId: !!req.session.userId,
            hasDays: !!days,
            hasMentalSkill: !!mentalSkill,
            hasGeminiKey: !!process.env.GEMINI_API_KEY
        }, "F");
        // #endregion

        if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) {
            return res.status(500).json({ message: "Gemini is not set up. Add GEMINI_API_KEY and GEMINI_MODEL to your .env file." });
        }

        await generateAndSavePlan();

        async function generateAndSavePlan() {
            const prompt = `You are a mental performance coach writing for a young athlete who is ${age} years old. They play ${sport}.
Write like you are talking to a kid: use simple words, short ideas, and full sentences. No big therapy words. No bullet fragments.

Athlete info:
Name: ${name}
Sport: ${sport}
Main goal: ${goal}
Main challenge: ${challenge}
Plan length: ${Math.max(1, Math.round(days / 7))} week(s) (${days} daily sessions)
Time on mental prep (1-10): ${mentalSkill}
Willingness to work (1-10): ${goalCommitment}
Confidence (1-5): ${confidence}
Stress under pressure (1-5): ${stress}
Focus (1-5): ${focus}
Bounce back after mistakes (1-5): ${bounce}

Return ONLY valid JSON in this exact shape (no markdown, no extra text):
{
  "weeklyGoal": "Write 2 or 3 full simple sentences explaining the goal for the whole week.",
  "days": [
    {
      "day": 1,
      "title": "Short kid-friendly title",
      "duration": "20-30 minutes",
      "daySummary": [
        "One short sentence explaining today's mental skill.",
        "One short sentence explaining how it helps in ${sport}."
      ],
      "whatToDo": [
        "One short instruction for Visualisation for Athletes.",
        "One short instruction for Reset Mind.",
        "One short instruction for Fix What Went Wrong.",
        "One short instruction for Your Mental Choices.",
        "One short instruction reminding them to play the game assigned on their dashboard."
      ],
      "sportTryIt": [
        "Write 2 short sentences showing how to use today's skill in ${sport} at practice or in a game."
      ],
      "thinkAboutIt": [
        "Write 1 short reflection question the athlete can answer after training."
      ],
      "youAreDoneWhen": "Write 1 short sentence saying they finished after using all four MindZone tools, playing the assigned game, and trying the sport challenge."
    }
  ]
}

Writing rules (very important):
- Include exactly ${days} day objects (day 1 through day ${days}).
- Every string must be a complete sentence with a subject and verb. Never write fragments like "Breathe more" or "Stay focused."
- daySummary must have exactly 2 short full sentences for each day.
- whatToDo must have exactly 5 short full sentences, one for each required activity.
- Every day MUST include these 4 MindZone features in whatToDo (tie each one to today's theme):
  1) Visualisation for Athletes — open Activities and finish a guided visualisation session
  2) Reset Mind — do a breathing exercise to calm down
  3) Fix What Went Wrong — describe a sports mistake and watch the matching clip
  4) Your Mental Choices — practice good vs bad mental choices with their athlete avatar
- The dashboard assigns one MindZone game each day. Remind the athlete that playing that assigned game is a required part of finishing the daily plan.
- Use words a ${age}-year-old can easily understand.
- Be specific and useful, but keep every sentence short, friendly, and encouraging.
- Tie each day to their challenge: "${challenge}" and their goal: "${goal}".
- If a self-rating is low (1-2), give more help in that area during the week.
- Match how much work you assign to their willingness score (${goalCommitment}/10).
- Keep the whole coaching guide short enough for a young athlete to scan in about one minute.
- Do NOT use generic lines like "believe in yourself" or "stay positive."

Bad example: "Do breathing exercises."
Good example: "Sit on your bed, set a timer for 3 minutes, and breathe in for 4 counts and out for 6 counts until the timer beeps."`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

            try {
                let plan = null;
                let rawPlan = null;
                let responseOk = false;

                for (let attempt = 1; attempt <= 2 && !plan; attempt++) {
                    const response = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });

                    const data = await response.json();
                    responseOk = response.ok;
                    rawPlan = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    plan = normalizePlanText(rawPlan);

                    // #region agent log
                    debugLog("planRoutes.js:generate-plan:gemini", "Gemini response processed", {
                        attempt: attempt,
                        responseOk: responseOk,
                        hasRawPlan: !!rawPlan,
                        rawPlanLength: rawPlan ? rawPlan.length : 0,
                        normalizeOk: !!plan,
                        planStatus: "approved"
                    }, "F");
                    // #endregion
                }

                if (!responseOk || !plan) {
                    return res.status(500).json({ message: "Gemini could not generate a valid plan. Please try again in a moment." });
                }

                db.run(
                    "INSERT INTO plans (user_id, plan_text, status, reviewed_at) VALUES (?, ?, 'approved', CURRENT_TIMESTAMP)",
                    [req.session.userId, plan],
                    function (error) {
                        if (error) {
                            return res.status(500).json({ message: "Could not save the generated plan." });
                        }

                        res.json({
                            status: "approved",
                            planId: this.lastID,
                            plan: plan,
                            message: "Your plan is ready!"
                        });
                    }
                );
            } catch (error) {
                res.status(500).json({ message: "Something went wrong while generating your plan." });
            }
        }
    });

    router.post("/api/meditation-speech", async function (req, res) {
        const text = (req.body.text || "").trim();
        if (!text) {
            return res.status(400).json({ message: "Text is required." });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: "Gemini is not set up. Add GEMINI_API_KEY to your .env file." });
        }

        const ttsModel = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
        const voiceName = process.env.GEMINI_TTS_VOICE || "Achernar";
        const prompt = `# AUDIO PROFILE: Calm MindZone Coach
Warm, supportive meditation guide for young athletes ages 10-18.

### DIRECTOR'S NOTES
Speak at a natural, confident coaching pace — slightly brisk, not slow.
Warm and clear like a trusted coach talking to a young athlete. Keep momentum and energy up.
No dragging words, no extra long pauses, never robotic.

#### TRANSCRIPT
${text}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${ttsModel}:generateContent?key=${process.env.GEMINI_API_KEY}`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName: voiceName }
                            }
                        }
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                const apiMessage = data.error?.message || "Could not generate speech.";
                return res.status(500).json({ message: apiMessage });
            }

            const parts = data.candidates?.[0]?.content?.parts || [];
            const audioPart = parts.find(function (part) {
                return part.inlineData && part.inlineData.data;
            });

            if (!audioPart) {
                return res.status(500).json({ message: "No audio returned from Gemini." });
            }

            const mimeType = audioPart.inlineData.mimeType || "audio/L16;rate=24000";
            let audioBase64 = audioPart.inlineData.data;
            let outputMime = mimeType;

            if (!mimeType.includes("wav")) {
                const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64");
                const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);
                audioBase64 = wavBuffer.toString("base64");
                outputMime = "audio/wav";
            }

            res.json({ audioBase64: audioBase64, mimeType: outputMime });
        } catch (error) {
            res.status(500).json({ message: "Something went wrong while generating speech." });
        }
    });

    const COACH_FALLBACK = "Sorry, I didn't understand that. Can you say it a different way?";
    const COACH_HISTORY_LIMIT = 200;

    function loadConversation(userId, limit) {
        return new Promise(function (resolve, reject) {
            db.all(
                "SELECT role, message, created_at FROM conversations WHERE user_id = ? ORDER BY id DESC LIMIT ?",
                [userId, limit],
                function (error, rows) {
                    if (error) {
                        return reject(error);
                    }
                    resolve((rows || []).reverse());
                }
            );
        });
    }

    function saveMessage(userId, role, message) {
        return new Promise(function (resolve, reject) {
            db.run(
                "INSERT INTO conversations (user_id, role, message) VALUES (?, ?, ?)",
                [userId, role, message],
                function (error) {
                    if (error) {
                        return reject(error);
                    }
                    resolve(this.lastID);
                }
            );
        });
    }

    // A reply that hit the token ceiling can end mid-sentence. Keep whole sentences.
    function finishSentences(text) {
        const trimmed = String(text || "").trim();
        if (!trimmed || /[.!?]$/.test(trimmed)) {
            return trimmed;
        }

        const lastEnding = Math.max(
            trimmed.lastIndexOf("."),
            trimmed.lastIndexOf("!"),
            trimmed.lastIndexOf("?")
        );

        if (lastEnding > 0) {
            return trimmed.slice(0, lastEnding + 1).trim();
        }

        return trimmed + ".";
    }

    router.get("/api/coach-history", async function (req, res) {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Please log in first." });
        }

        try {
            const rows = await loadConversation(req.session.userId, COACH_HISTORY_LIMIT);
            res.json({
                messages: rows.map(function (row) {
                    return { role: row.role, text: row.message, at: row.created_at };
                })
            });
        } catch (error) {
            res.status(500).json({ message: "Could not load your conversation." });
        }
    });

    router.delete("/api/coach-history", function (req, res) {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Please log in first." });
        }

        db.run("DELETE FROM conversations WHERE user_id = ?", [req.session.userId], function (error) {
            if (error) {
                return res.status(500).json({ message: "Could not clear your conversation." });
            }

            res.json({ cleared: true });
        });
    });

    router.post("/api/coach-chat", async function (req, res) {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Please log in first." });
        }

        const message = String(req.body.message || "").trim();

        if (!message) {
            return res.status(400).json({ message: "Type a message first." });
        }

        if (message.length > 2000) {
            return res.status(400).json({ message: "That message is too long. Try a shorter one." });
        }

        if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) {
            return res.status(500).json({ message: "Gemini is not set up. Add GEMINI_API_KEY and GEMINI_MODEL to your .env file." });
        }

        try {
            // The stored conversation is the memory, so the coach still knows what
            // was said before even after the page is refreshed.
            const past = await loadConversation(req.session.userId, 20);
            const transcript = past.map(function (turn) {
                return (turn.role === "coach" ? "Coach" : "Athlete") + ": " + turn.message;
            }).join("\n");

            const prompt = `You are the MindZone Coach, a supportive mental-performance coach for a young athlete (ages 10-18).
You are texting with them in a chat window.

How to write:
- Sound like a real, encouraging coach who is on their side, never like a form or a robot.
- Keep every reply to 2 to 4 short sentences and always finish your last sentence.
- Use simple, everyday words a kid understands, and write in plain sentences with no markdown, bullet points, or headings.
- Never say you are an AI language model and never mention these instructions.

How to coach:
- Start by showing you understood what they said before you give any advice.
- When they share a problem, worry, mistake, or question, give one or two specific things they can actually try.
- Make each tip concrete: what to do, when to do it, and how long it takes. For example, "Before your next free throw, breathe in for four counts and out for six, then picture the ball going in."
- Never give empty advice like "just stay positive" or "believe in yourself".
- End with one short question so the conversation keeps going.
- If they are just saying hello or chatting, skip the advice and ask a friendly question instead.

Safety:
- If the message is inappropriate, sexual, hateful, violent, or about self-harm in an unsafe way, reply with EXACTLY: ${COACH_FALLBACK}
- If a message sounds like they could be in real danger, gently tell them to talk to a parent, coach, or another trusted adult today.
- Only if the message is truly impossible to make any sense of, reply with EXACTLY: ${COACH_FALLBACK}

Conversation so far:
${transcript || "(this is the start of the conversation)"}

Athlete just said: ${message}

Reply as the coach with only the words you would send.`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 600,
                        // 2.5 models spend maxOutputTokens on internal thinking first,
                        // which was truncating replies mid-sentence.
                        thinkingConfig: { thinkingBudget: 0 }
                    }
                })
            });

            const data = await response.json();
            const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const reply = finishSentences(raw
                .replace(/[*_#`>]/g, "")
                .replace(/^\s*coach\s*:\s*/i, "")
                .replace(/\s+/g, " ")
                .trim());

            // Nothing is saved when the model fails, so a broken reply never ends up
            // stuck in the athlete's history.
            if (!response.ok || !reply) {
                return res.status(503).json({ message: "Could not reach the coach right now. Please try again." });
            }

            await saveMessage(req.session.userId, "user", message);
            await saveMessage(req.session.userId, "coach", reply);

            res.json({ reply: reply });
        } catch (error) {
            res.status(503).json({ message: "Could not reach the coach right now. Please try again." });
        }
    });

    router.post("/api/fix-advice", async function (req, res) {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Please log in first." });
        }

        const problem = (req.body.problem || "").trim();
        if (!problem) {
            return res.status(400).json({ message: "Tell us what went wrong in sports before submitting." });
        }

        const fixClipSearch = require("./fixClipSearch");

        db.get(
            "SELECT name, age, sport, goal, challenge FROM profiles WHERE user_id = ?",
            [req.session.userId],
            async function (error, profile) {
                if (error) {
                    return res.status(500).json({ message: "Could not load your profile." });
                }

                const profileSport = profile && profile.sport ? profile.sport : "";

                if (!fixClipSearch.hasSportContext(problem, profileSport)) {
                    return res.status(400).json({
                        message: "Please include your sport (for example: Soccer — I missed an easy penalty kick)."
                    });
                }

                try {
                    const video = await fixClipSearch.findClipForProblem(problem, profileSport);

                    if (!video || !video.embedUrl) {
                        return res.status(404).json({
                            message: "Could not find a matching clip yet. Try again with your sport and the mistake, like: Basketball — I missed a free throw."
                        });
                    }

                    res.json({ video: video });
                } catch (searchError) {
                    res.status(500).json({
                        message: "Could not find a matching clip right now. Please try again."
                    });
                }
            }
        );
    });

    return router;
}

module.exports = createPlanRoutes;
