require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();

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


app.post("/api/generate-plan", async function (req, res) {
    const { name, age, sport, goal, challenge, days, confidence, stress, focus, bounce } = req.body;

    const prompt = `You are a mental health coach for athletes. Make a ${days} day mental wellness plan for this athlete:
Name: ${name}, Age: ${age}, Sport: ${sport}, Goal: ${goal}, Challenge: ${challenge}.
Self-ratings (1-5): Confidence before games: ${confidence}, Stress under pressure: ${stress}, Focus during practice/games: ${focus}, Bounce back after mistakes: ${bounce}.
Use lower scores to focus more on that area. Format the answer exactly like this, one line per day: "Day 1: <one short thing to do>" then "Day 2: <one short thing to do>" up to Day ${days}. Keep each day to one short activity. Do not add any extra text before or after.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const plan = data.candidates[0].content.parts[0].text;

    res.json({plan});

});

app.listen(PORT, function () {
    console.log(`MindZone is running at http://localhost:${PORT}`);

});
