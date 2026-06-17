const express = require("express");

function createAdminRoutes(db) {
    const router = express.Router();

    function requireAdmin(req, res, next) {
        if (!req.session.isAdmin) {
            return res.status(401).json({ message: "Admin login required." });
        }

        next();
    }

    router.get("/api/admin/me", function (req, res) {
        if (!req.session.isAdmin) {
            return res.status(401).json({ message: "Admin login required." });
        }

        res.json({ isAdmin: true });
    });

    router.post("/api/admin/login", function (req, res) {
        const email = (req.body.email || "").trim().toLowerCase();
        const password = req.body.password || "";
        const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD || "";

        if (!adminEmail || !adminPassword) {
            return res.status(500).json({ message: "Admin login is not set up in .env." });
        }

        if (email !== adminEmail || password !== adminPassword) {
            return res.status(401).json({ message: "Admin email or password is wrong." });
        }

        req.session.isAdmin = true;
        res.json({ message: "Admin login worked." });
    });

    router.post("/api/admin/logout", function (req, res) {
        req.session.isAdmin = false;
        res.json({ message: "Admin logged out." });
    });

    router.get("/api/admin/plans", requireAdmin, function (req, res) {
        db.all(
            `SELECT
                plans.id,
                plans.plan_text,
                plans.status,
                plans.created_at,
                users.email,
                profiles.name,
                profiles.age,
                profiles.sport,
                profiles.goal,
                profiles.challenge,
                profiles.days,
                profiles.confidence,
                profiles.stress,
                profiles.focus,
                profiles.bounce
            FROM plans
            JOIN users ON users.id = plans.user_id
            LEFT JOIN profiles ON profiles.user_id = plans.user_id
            WHERE plans.status = 'pending'
            ORDER BY plans.created_at ASC`,
            [],
            function (error, plans) {
                if (error) {
                    return res.status(500).json({ message: "Could not load pending plans." });
                }

                res.json({ plans });
            }
        );
    });

    router.post("/api/admin/plans/:id/approve", requireAdmin, function (req, res) {
        updatePlanStatus(req, res, "approved");
    });

    router.post("/api/admin/plans/:id/reject", requireAdmin, function (req, res) {
        updatePlanStatus(req, res, "rejected");
    });

    function updatePlanStatus(req, res, status) {
        const planId = parseInt(req.params.id, 10);
        const planText = (req.body.planText || "").trim();

        if (!planId) {
            return res.status(400).json({ message: "Plan id is required." });
        }

        if (status === "approved" && !planText) {
            return res.status(400).json({ message: "Plan text is required before approval." });
        }

        const sql = status === "approved"
            ? "UPDATE plans SET plan_text = ?, status = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'"
            : "UPDATE plans SET status = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'";

        const params = status === "approved"
            ? [planText, status, planId]
            : [status, planId];

        db.run(
            sql,
            params,
            function (error) {
                if (error) {
                    return res.status(500).json({ message: "Could not update plan." });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ message: "Pending plan not found." });
                }

                res.json({ message: `Plan ${status}.` });
            }
        );
    }

    return router;
}

module.exports = createAdminRoutes;
