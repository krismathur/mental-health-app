const express = require("express");

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
            const prompt = `You are a mental health coach for athletes. Make a ${days} day mental wellness plan for this athlete:
Name: ${name}, Age: ${age}, Sport: ${sport}, Goal: ${goal}, Challenge: ${challenge}.
Time spent on mental preparation (1-10): ${mentalSkill}. Willingness to work on goal (1-10): ${goalCommitment}.
Self-ratings (1-5): Confidence before games: ${confidence}, Stress under pressure: ${stress}, Focus during practice/games: ${focus}, Bounce back after mistakes: ${bounce}.
Use lower scores to focus more on that area. Match plan intensity to their willingness to work (${goalCommitment}/10). Format the answer exactly like this, one line per day: "Day 1: <one short thing to do>" then "Day 2: <one short thing to do>" up to Day ${days}. Keep each day to one short activity. Do not add any extra text before or after.`;

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

    return router;
}

module.exports = createPlanRoutes;
