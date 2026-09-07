const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sqlite3 = require("sqlite3").verbose();
const config = require("./config");
const limits = require("./routes/limits");
const createPlanRoutes = require("./routes/planRoutes");
const mailer = require("./routes/mailer");

const SQLiteStore = require("connect-sqlite3")(session);

const app = express();
const PORT = config.port;
const publicPath = path.join(__dirname, "public");
const dataPath = config.dataDir
    ? path.resolve(config.dataDir)
    : path.join(__dirname, "data");
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

    // One row per chat message so the coach conversation survives a page refresh.
    db.run(`
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Crisis screening hits. Intentionally stores no message text - the message
    // itself already lives in `conversations`, and duplicating a child's
    // disclosure into a second table only widens the blast radius.
    db.run(`
        CREATE TABLE IF NOT EXISTS safety_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS password_resets (
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            used_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    db.run("CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id)");

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

        // Parent/guardian attestation, captured at onboarding. Stored with a
        // timestamp because "they ticked a box at some point" is not a record.
        if (!columnNames.includes("parent_consent")) {
            db.run("ALTER TABLE profiles ADD COLUMN parent_consent INTEGER NOT NULL DEFAULT 0");
        }

        if (!columnNames.includes("parent_consent_at")) {
            db.run("ALTER TABLE profiles ADD COLUMN parent_consent_at TEXT");
        }
    });

    db.run(
        "UPDATE plans SET status = 'approved', reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP) WHERE status != 'approved'"
    );
});

// Managed hosts (Hostinger included) terminate TLS at a proxy, so without this
// req.protocol is always "http" and req.ip is always the proxy's address --
// which would silently break both the HTTPS redirect and every rate limit.
app.set("trust proxy", config.trustProxy);
app.disable("x-powered-by");

// All inline script and inline style has been removed from the pages, so the
// policy can forbid both outright instead of weakening itself with
// 'unsafe-inline'. See public/js/auth-tabs.js for the one block that moved.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            // data: covers the base64 audio the meditation voice returns.
            mediaSrc: ["'self'", "data:", "blob:"],
            imgSrc: ["'self'", "data:", "blob:", "https://i.ytimg.com"],
            frameSrc: ["https://www.youtube-nocookie.com", "https://www.youtube.com"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: config.isProduction ? [] : null
        }
    },
    // The YouTube iframes need to be embeddable, so the stricter default here
    // would break the video library.
    // Helmet defaults this to "no-referrer", which breaks YouTube embeds:
    // the player reads the Referer header to check which site is embedding it,
    // and with no referrer at all it refuses to play (Error 153). This policy
    // sends only the origin cross-site -- YouTube learns the domain, never the
    // page path a kid was on -- and sends nothing at all when downgrading to
    // plain HTTP.
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: config.isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false
}));

if (config.isProduction) {
    app.use(function (req, res, next) {
        // Host monitoring probes /health over plain HTTP from inside the
        // network; redirecting it would read as the app being down.
        if (req.secure || req.path === "/health") {
            return next();
        }

        res.redirect(308, "https://" + req.headers.host + req.originalUrl);
    });
}

app.use(limits.globalLimiter);

// A body limit so a large POST cannot be used to exhaust memory.
app.use(express.json({ limit: "64kb" }));

app.use(function (req, res, next) {
    if (req.path.startsWith("/data") || req.path.startsWith("/node_modules")) {
        return res.status(404).send("Not found");
    }

    next();
});

// While developing, a cached page makes it look like an edit did nothing. In
// production that same header makes every visit re-download the whole app.
app.use(function (req, res, next) {
    // Stylesheets belong here too: a cached .css made layout edits look like
    // they had not applied at all.
    if (!/\.html$|\.js$|\.css$/.test(req.path)) {
        return next();
    }

    res.setHeader(
        "Cache-Control",
        config.isProduction ? "public, max-age=300, must-revalidate" : "no-store, no-cache, must-revalidate"
    );

    next();
});

app.use(express.static(publicPath, {
    maxAge: config.isProduction ? "7d" : 0
}));

// Sessions live in SQLite, not in memory. The old MemoryStore logged every
// player out on each restart and leaked memory under load; managed hosts
// restart the process regularly, so that was going to be constant.
app.use(session({
    store: new SQLiteStore({ db: "sessions.db", dir: dataPath, concurrentDB: true }),
    name: "mindzone.sid",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

app.get("/health", function (req, res) {
    res.json({ status: "ok", env: config.NODE_ENV });
});

// The handful of passwords that show up first in every credential-stuffing
// list. Not a substitute for the length rule, just a cheap floor.
const COMMON_PASSWORDS = new Set([
    "password", "password1", "password123", "12345678", "123456789", "1234567890",
    "qwertyuiop", "iloveyou", "football", "baseball", "basketball", "sunshine",
    "princess", "superman", "michael", "jennifer", "letmein1", "welcome1",
    "abc12345", "monkey12", "trustno1", "dragon12", "starwars", "computer"
]);

// Same rule for signup and for reset. Split out so the two can never drift
// apart and leave reset as the weaker way in.
function passwordProblem(password) {
    if (password.length < 8) {
        return "Password must be at least 8 characters.";
    }

    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        return "That password is too easy to guess. Please pick another one.";
    }

    return "";
}

app.post("/api/signup", limits.authLimiter, async function (req, res) {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
        return res.status(400).json({ message: "Please fill out every field." });
    }

    const problem = passwordProblem(password);

    if (problem) {
        return res.status(400).json({ message: problem });
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

app.post("/api/login", limits.authLimiter, function (req, res) {
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

/*
 * Password reset.
 *
 * Shape of the flow, and why each piece is the way it is:
 *
 *   - The token is 32 random bytes. Only its SHA-256 is stored, so a stolen
 *     database does not hand over working reset links. It is a random secret
 *     rather than a password, so a fast hash is the right tool: there is
 *     nothing to brute-force.
 *   - /api/forgot-password answers the same way whether or not the address has
 *     an account. Otherwise it becomes a free tool for checking which kids at a
 *     school are on the app.
 *   - Using a token deletes every other outstanding token for that user and
 *     logs out every existing session. If someone is resetting because their
 *     account was taken, leaving the intruder's session alive makes the reset
 *     pointless.
 */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

// Sessions live in their own file, written by connect-sqlite3, so clearing a
// user's sessions means reaching into that store directly.
const sessionDbPath = path.join(dataPath, "sessions.db");

function destroySessionsForUser(userId, done) {
    const sessionDb = new sqlite3.Database(sessionDbPath, function (openError) {
        if (openError) {
            return done();
        }

        // json_extract keeps this exact. A LIKE on the serialized session would
        // match user 1 inside user 12 and log out the wrong person.
        sessionDb.run(
            "DELETE FROM sessions WHERE json_extract(sess, '$.userId') = ?",
            [userId],
            function () {
                sessionDb.close();
                done();
            }
        );
    });
}

// The page hides its "Forgot password?" link when mail is turned off, so a kid
// is never sent down a flow that cannot finish.
app.get("/api/auth-options", function (req, res) {
    res.json({ passwordResetEnabled: mailer.isConfigured || !config.isProduction });
});

app.post("/api/forgot-password", limits.resetRequestLimiter, function (req, res) {
    const email = (req.body.email || "").trim().toLowerCase();

    if (!mailer.isConfigured && config.isProduction) {
        return res.status(503).json({
            message: "Password reset isn't set up yet, so we can't send a reset link right now."
        });
    }

    // Deliberately identical to the success reply below.
    const genericReply = {
        message: "If that email has an account, a reset link is on its way. Check your inbox and your spam folder."
    };

    if (!email) {
        return res.status(400).json({ message: "Please enter your email." });
    }

    db.get("SELECT id, email FROM users WHERE email = ?", [email], function (error, user) {
        if (error || !user) {
            return res.json(genericReply);
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;

        db.run("DELETE FROM password_resets WHERE user_id = ?", [user.id], function () {
            db.run(
                "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
                [hashToken(token), user.id, expiresAt],
                async function (insertError) {
                    if (insertError) {
                        return res.status(500).json({ message: "Something went wrong. Please try again." });
                    }

                    // Built from configured APP_URL, never from the Host header,
                    // which the caller controls.
                    const base = config.appUrl || "http://localhost:" + PORT;
                    const link = base + "/reset-password.html?token=" + token;

                    try {
                        await mailer.sendPasswordReset(user.email, link);
                    } catch (sendError) {
                        console.error("[reset] could not send email:", sendError.message);
                    }

                    res.json(genericReply);
                }
            );
        });
    });
});

app.post("/api/reset-password", limits.authLimiter, function (req, res) {
    const token = (req.body.token || "").trim();
    const password = req.body.password || "";

    if (!token) {
        return res.status(400).json({ message: "That reset link is not valid. Please request a new one." });
    }

    const problem = passwordProblem(password);

    if (problem) {
        return res.status(400).json({ message: problem });
    }

    db.get(
        "SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?",
        [hashToken(token)],
        async function (error, row) {
            // One message for missing, used, and expired. Telling them apart
            // only helps someone probing tokens.
            if (error || !row || row.used_at || row.expires_at < Date.now()) {
                return res.status(400).json({
                    message: "That reset link has expired or already been used. Please request a new one."
                });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            db.run(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                [passwordHash, row.user_id],
                function (updateError) {
                    if (updateError) {
                        return res.status(500).json({ message: "Could not update your password. Please try again." });
                    }

                    db.run("DELETE FROM password_resets WHERE user_id = ?", [row.user_id]);

                    destroySessionsForUser(row.user_id, function () {
                        res.json({ message: "Your password is updated. You can log in now." });
                    });
                }
            );
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
        "SELECT name, age, sport, goal, challenge, days, confidence, stress, focus, bounce, mental_skill, goal_commitment, parent_consent, parent_consent_at FROM profiles WHERE user_id = ?",
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

    const ageNumber = parseInt(age, 10);

    if (!Number.isInteger(ageNumber) || ageNumber < 10 || ageNumber > 18) {
        return res.status(400).json({ message: "MindZone is for athletes aged 10 to 18." });
    }

    db.get(
        "SELECT parent_consent FROM profiles WHERE user_id = ?",
        [req.session.userId],
        function (consentError, existing) {
            if (consentError) {
                return res.status(500).json({ message: "Could not save profile." });
            }

            const alreadyConsented = !!(existing && existing.parent_consent);
            const consentGiven = alreadyConsented || req.body.parentConsent === true;

            if (!consentGiven) {
                return res.status(400).json({
                    message: "Please confirm a parent or guardian said it's okay before saving."
                });
            }

            saveProfile(consentGiven);
        }
    );

    function saveProfile(consentGiven) {
        db.run(
            `INSERT INTO profiles (user_id, name, age, sport, goal, challenge, days, confidence, stress, focus, bounce, mental_skill, goal_commitment, parent_consent, parent_consent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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
                -- Consent, once given, is never revoked by a later profile edit,
                -- and the original timestamp is the one that matters.
                parent_consent = MAX(profiles.parent_consent, excluded.parent_consent),
                parent_consent_at = COALESCE(profiles.parent_consent_at, excluded.parent_consent_at),
                updated_at = CURRENT_TIMESTAMP`,
            [req.session.userId, name, age, sport, goal, challenge, days, confidence, stress, focus, bounce, mentalSkill, goalCommitment, consentGiven ? 1 : 0],
            function (error) {
                if (error) {
                    return res.status(500).json({ message: "Could not save profile." });
                }

                req.session.name = name;
                db.run("UPDATE users SET name = ? WHERE id = ?", [name, req.session.userId]);
                res.json({ message: "Profile saved." });
            }
        );
    }
});

// Promised in the Privacy Policy, so it has to actually erase everything rather
// than just flagging the row as inactive.
app.delete("/api/account", function (req, res) {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Not logged in." });
    }

    const userId = req.session.userId;

    db.serialize(function () {
        db.run("DELETE FROM conversations WHERE user_id = ?", [userId]);
        db.run("DELETE FROM safety_events WHERE user_id = ?", [userId]);
        db.run("DELETE FROM password_resets WHERE user_id = ?", [userId]);
        db.run("DELETE FROM plans WHERE user_id = ?", [userId]);
        db.run("DELETE FROM profiles WHERE user_id = ?", [userId]);
        db.run("DELETE FROM users WHERE id = ?", [userId], function (error) {
            if (error) {
                return res.status(500).json({ message: "Could not delete your account. Please try again." });
            }

            req.session.destroy(function () {
                res.clearCookie("mindzone.sid");
                res.json({ message: "Your account and all of your data have been deleted." });
            });
        });
    });
});

// Applied by path so routes/planRoutes.js stays focused on what it does.
app.use(["/api/generate-plan", "/api/coach-chat", "/api/fix-advice"], limits.aiLimiter);
app.use("/api/meditation-speech", limits.speechLimiter);

app.use(createPlanRoutes(db));

// Unknown /api/* paths should answer as JSON, not with the HTML 404 page.
app.use("/api", function (req, res) {
    res.status(404).json({ message: "Not found." });
});

// Last line of defence. Without this an unhandled throw returns a stack trace
// to the browser, which is both a leak and confusing for a kid.
app.use(function (error, req, res, next) {
    console.error("Unhandled error on " + req.method + " " + req.path, error);

    if (res.headersSent) {
        return next(error);
    }

    if (req.path.startsWith("/api")) {
        return res.status(500).json({ message: "Something went wrong on our side. Please try again." });
    }

    res.status(500).send("Something went wrong on our side. Please try again.");
});

app.listen(PORT, function () {
    console.log(`MindZone is running at http://localhost:${PORT}`);

});
