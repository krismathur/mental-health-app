const express = require("express");

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

    router.get("/api/my-plan", function (req, res) {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Please log in first." });
        }

        db.get(
            `SELECT id, plan_text, status, created_at, reviewed_at
            FROM plans
            WHERE user_id = ?
            ORDER BY
                CASE status
                    WHEN 'pending' THEN 1
                    WHEN 'approved' THEN 2
                    WHEN 'rejected' THEN 3
                    ELSE 4
                END,
                id DESC
            LIMIT 1`,
            [req.session.userId],
            function (error, plan) {
                if (error) {
                    return res.status(500).json({ message: "Could not load your plan." });
                }

                if (!plan) {
                    return res.json({ status: "none" });
                }

                if (plan.status === "approved") {
                    return res.json({ status: "approved", plan: plan.plan_text });
                }

                if (plan.status === "rejected") {
                    return res.json({ status: "rejected", message: "Your plan needs to be regenerated. Please update anything you want and try again." });
                }

                res.json({ status: "pending", message: "Your plan is waiting for admin approval. You will have it within 24 hours or sooner." });
            }
        );
    });

    router.post("/api/generate-plan", async function (req, res) {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Please log in before generating a plan." });
        }

        const { name, age, sport, goal, challenge, days, confidence, stress, focus, bounce, mentalSkill, goalCommitment } = req.body;

        if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) {
            return res.status(500).json({ message: "Gemini is not set up. Add GEMINI_API_KEY and GEMINI_MODEL to your .env file." });
        }

        db.get(
            "SELECT id FROM plans WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
            [req.session.userId],
            async function (error, pendingPlan) {
                if (error) {
                    return res.status(500).json({ message: "Could not check your current plan status." });
                }

                if (pendingPlan) {
                    return res.json({ status: "pending", message: "Your plan is already waiting for admin approval. You will have it within 24 hours or sooner." });
                }

                await generateAndSavePlan();
            }
        );

        async function generateAndSavePlan() {
            const prompt = `You are a mental performance coach for young athletes ages 10-18. Make a ${days} day mental training plan for this athlete:
Name: ${name}, Age: ${age}, Sport: ${sport}, Goal: ${goal}, Challenge: ${challenge}.
Time spent on mental preparation (1-10): ${mentalSkill}. Willingness to work on goal (1-10): ${goalCommitment}.
Self-ratings (1-5): Confidence before games: ${confidence}, Stress under pressure: ${stress}, Focus during practice/games: ${focus}, Bounce back after mistakes: ${bounce}.

Create daily actions the athlete can actually do, not generic advice or motivational tips.
Each day must include:
1. A specific mental skill activity
2. How long it should take
3. 2-3 clear steps
4. A simple way to know they completed it

Good example:
Day 1: 6-minute pressure reset: Sit quietly for 1 minute, breathe in for 4 and out for 6 for 3 minutes, then say your pressure phrase 5 times: "I can handle this." Complete it by writing one sentence about how your body feels after.

Bad examples:
Day 1: Stay confident.
Day 1: Work on focus.
Day 1: Try to be calm.

Use lower scores to focus more on that area. Match plan intensity to their willingness to work (${goalCommitment}/10).
Format the answer exactly like this, one line per day: "Day 1: <detailed activity>" then "Day 2: <detailed activity>" up to Day ${days}.
Keep every day on one line so the app can read it. Do not add any extra text before or after.`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                const data = await response.json();
                const plan = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!response.ok || !plan) {
                    return res.status(500).json({ message: "Gemini could not generate a plan. Check your API key and model name." });
                }

                db.run(
                    "INSERT INTO plans (user_id, plan_text, status) VALUES (?, ?, ?)",
                    [req.session.userId, plan, "pending"],
                    function (error) {
                        if (error) {
                            return res.status(500).json({ message: "Could not save the generated plan." });
                        }

                        res.json({ status: "pending", message: "Your plan was generated and is waiting for admin approval. You will have it within 24 hours or sooner." });
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

    router.post("/api/fix-advice", async function (req, res) {
        if (!req.session.userId) {
            return res.status(401).json({ message: "Please log in first." });
        }

        const problem = (req.body.problem || "").trim();
        if (!problem) {
            return res.status(400).json({ message: "Tell us what went wrong before submitting." });
        }

        if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) {
            return res.status(500).json({ message: "Gemini is not set up. Add GEMINI_API_KEY and GEMINI_MODEL to your .env file." });
        }

        db.get(
            "SELECT name, age, sport, goal, challenge FROM profiles WHERE user_id = ?",
            [req.session.userId],
            async function (error, profile) {
                if (error) {
                    return res.status(500).json({ message: "Could not load your profile." });
                }

                const athleteInfo = profile
                    ? `Athlete: ${profile.name}, Age: ${profile.age}, Sport: ${profile.sport}, Goal: ${profile.goal}, Main challenge: ${profile.challenge}.`
                    : "Athlete profile not available.";

                const prompt = `You are a mental performance coach for young athletes ages 10-18.

${athleteInfo}

The athlete wrote what mentally went wrong today:
"${problem}"

Give exactly 7 very helpful, specific, actionable responses that will help this athlete avoid the same mental mistake again. Each response should be practical enough to use before or during their next game or practice.

Good examples:
- Before your next free throw, take 3 slow breaths, pick one cue word like "smooth," and only think about that word.
- Write your mistake on paper, then write one thing you will do differently next time. Read it once before practice.

Bad examples:
- Stay positive.
- Don't worry about it.
- Believe in yourself.

Return ONLY valid JSON in this exact shape with no extra text:
{"advice":["response 1","response 2","response 3","response 4","response 5","response 6","response 7"]}`;

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

                try {
                    const response = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });

                    const data = await response.json();
                    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (!response.ok || !rawText) {
                        return res.status(500).json({ message: "Gemini could not generate advice. Check your API key and model name." });
                    }

                    const cleanedText = rawText.replace(/```json|```/g, "").trim();
                    const parsed = JSON.parse(cleanedText);
                    const advice = Array.isArray(parsed.advice) ? parsed.advice.map(function (item) {
                        return String(item).trim();
                    }).filter(Boolean) : [];

                    if (advice.length !== 7) {
                        return res.status(500).json({ message: "Gemini did not return 7 responses. Please try again." });
                    }

                    res.json({ advice: advice });
                } catch (parseError) {
                    res.status(500).json({ message: "Something went wrong while generating your advice." });
                }
            }
        );
    });

    return router;
}

module.exports = createPlanRoutes;
