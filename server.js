require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const createPlanRoutes = require("./routes/planRoutes");

const app = express();
const PORT = process.env.PORT || 3000;
const publicPath = path.join(__dirname, "public");
const dataPath = path.join(__dirname, "data");
const dbPath = path.join(dataPath, "database.db");

fs.mkdirSync(dataPath, { recursive: true });

const db = new sqlite3.Database(dbPath);

db.serialize(function () {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
            user_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            age TEXT NOT NULL,
            sport TEXT NOT NULL,
            goal TEXT NOT NULL,
            challenge TEXT NOT NULL,
            days INTEGER NOT NULL,
            confidence INTEGER NOT NULL,
            stress INTEGER NOT NULL,
            focus INTEGER NOT NULL,
            bounce INTEGER NOT NULL,
            mental_skill INTEGER,
            goal_commitment INTEGER,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            plan_text TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'approved',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    db.all("PRAGMA table_info(profiles)", function (pragmaError, columns) {
        if (pragmaError) {
            return;
        }

        const columnNames = columns.map(function (column) {
            return column.name;
        });

        if (!columnNames.includes("mental_skill")) {
            db.run("ALTER TABLE profiles ADD COLUMN mental_skill INTEGER");
        }

        if (!columnNames.includes("goal_commitment")) {
            db.run("ALTER TABLE profiles ADD COLUMN goal_commitment INTEGER");
        }
    });

    db.run(
        "UPDATE plans SET status = 'approved', reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP) WHERE status != 'approved'"
    );
});

app.use(express.json());
app.use(function (req, res, next) {
    if (req.path.startsWith("/data") || req.path.startsWith("/node_modules")) {
        return res.status(404).send("Not found");
    }

    next();
});

app.use(express.static(publicPath));
app.use(session({
    secret: "mindzone-local-secret",
    resave: false,
    saveUninitialized: false
}));

app.post("/api/signup", async function (req, res) {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
        return res.status(400).json({ message: "Please fill out every field." });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    db.run(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        ["", email, passwordHash],
        function (error) {
            if (error) {
                return res.status(400).json({ message: "That email is already signed up." });
            }

            req.session.userId = this.lastID;
            res.json({ message: "Signup worked." });
        }
    );
});

app.post("/api/login", function (req, res) {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
        return res.status(400).json({ message: "Please enter your email and password." });
    }

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async function (error, user) {
            if (error || !user) {
                return res.status(401).json({ message: "Email or password is wrong." });
            }

            const passwordMatches = await bcrypt.compare(password, user.password_hash);

            if (!passwordMatches) {
                return res.status(401).json({ message: "Email or password is wrong." });
            }

            req.session.userId = user.id;
            req.session.name = user.name;
            res.json({ message: "Login worked." });
        }
    );
});

app.get("/api/me", function (req, res) {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Not logged in." });
    }

    res.json({
        id: req.session.userId,
        name: req.session.name
    });
});

app.post("/api/logout", function (req, res) {
    req.session.destroy(function () {
        res.json({ message: "Logged out." });
    });
});

app.get("/api/profile", function (req, res) {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Not logged in." });
    }

    db.get(
        "SELECT name, age, sport, goal, challenge, days, confidence, stress, focus, bounce, mental_skill, goal_commitment FROM profiles WHERE user_id = ?",
        [req.session.userId],
        function (error, profile) {
            if (error) {
                return res.status(500).json({ message: "Could not load profile." });
            }

            if (!profile) {
                return res.status(404).json({ message: "No profile found." });
            }

            res.json({ profile });
        }
    );
});

app.post("/api/profile", function (req, res) {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Not logged in." });
    }

    const name = (req.body.name || "").trim();
    const age = (req.body.age || "").trim();
    const sport = (req.body.sport || "").trim();
    const goal = (req.body.goal || "").trim();
    const challenge = (req.body.challenge || "").trim();
    const days = parseInt(req.body.days, 10);
    const confidence = parseInt(req.body.confidence, 10);
    const stress = parseInt(req.body.stress, 10);
    const focus = parseInt(req.body.focus, 10);
    const bounce = parseInt(req.body.bounce, 10);
    const mentalSkill = parseInt(req.body.mentalSkill, 10);
    const goalCommitment = parseInt(req.body.goalCommitment, 10);

    if (!name || !age || !sport || !goal || !challenge || !days || !confidence || !stress || !focus || !bounce || !mentalSkill || !goalCommitment) {
        return res.status(400).json({ message: "Please fill out every profile field." });
    }

    if (mentalSkill < 1 || mentalSkill > 10 || goalCommitment < 1 || goalCommitment > 10) {
        return res.status(400).json({ message: "Ratings must be between 1 and 10." });
    }

    db.run(
        `INSERT INTO profiles (user_id, name, age, sport, goal, challenge, days, confidence, stress, focus, bounce, mental_skill, goal_commitment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            name = excluded.name,
            age = excluded.age,
            sport = excluded.sport,
            goal = excluded.goal,
            challenge = excluded.challenge,
            days = excluded.days,
            confidence = excluded.confidence,
            stress = excluded.stress,
            focus = excluded.focus,
            bounce = excluded.bounce,
            mental_skill = excluded.mental_skill,
            goal_commitment = excluded.goal_commitment,
            updated_at = CURRENT_TIMESTAMP`,
        [req.session.userId, name, age, sport, goal, challenge, days, confidence, stress, focus, bounce, mentalSkill, goalCommitment],
        function (error) {
            if (error) {
                return res.status(500).json({ message: "Could not save profile." });
            }

            req.session.name = name;
            db.run("UPDATE users SET name = ? WHERE id = ?", [name, req.session.userId]);
            res.json({ message: "Profile saved." });
        }
    );
});

app.use(createPlanRoutes(db));

app.listen(PORT, function () {
    console.log(`MindZone is running at http://localhost:${PORT}`);

});
