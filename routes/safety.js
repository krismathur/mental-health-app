/*
 * Crisis screening for anything a young athlete types into MindZone.
 *
 * Why this exists: the coach prompt used to be the only safety net, which meant
 * a kid in real trouble was relying on the model choosing to follow an
 * instruction. This module runs first, in our own code, and can bypass the
 * model entirely.
 *
 * Design bias: false positives are cheap (a kid sees a help card they did not
 * need) and false negatives are not. Patterns are deliberately broad.
 */

// Phrases that mean we stop talking to the model and show help instead.
// Grouped by category so the response can be tailored.
const PATTERNS = [
    {
        category: "self_harm",
        tests: [
            /\bkill(ing)?\s+(my\s?self|me)\b/i,
            /\bsuicid(e|al)\b/i,
            /\b(want|wanna|going)\s+to\s+die\b/i,
            /\bwish(ed)?\s+(i\s+)?(was|were|i'?m)\s+dead\b/i,
            /\bbetter\s+off\s+dead\b/i,
            /\bend\s+(my\s+life|it\s+all|things)\b/i,
            /\btake\s+my\s+own\s+life\b/i,
            /\b(hurt|hurting|harm|harming|cut|cutting)\s+my\s?self\b/i,
            /\bself[\s-]?harm/i,
            /\bcut\s+my\s+(wrist|arm)/i,
            /\bno\s+(reason|point)\s+(to|in)\s+liv/i,
            /\bnothing\s+to\s+live\s+for\b/i,
            /\bdon'?t\s+(want|wanna)\s+to\s+be\s+(here|alive)\s+any\s?more\b/i,
            /\bdon'?t\s+(want|wanna)\s+to\s+(live|exist)\b/i,
            /\boverdos(e|ing)\b/i,
            /\bdisappear\s+forever\b/i
        ]
    },
    {
        category: "abuse",
        tests: [
            /\b(is|are|was|were|been)\s+(abus|beat|hitt?)(ing|ed)?\s+me\b/i,
            /\b(hits|beats|punches)\s+me\b/i,
            /\btouch(ed|ing)\s+me\s+(there|inappropriate|weird|wrong)/i,
            /\bscared\s+to\s+go\s+home\b/i,
            /\bafraid\s+of\s+my\s+(dad|mom|mother|father|coach|stepdad|stepmom)\b/i,
            /\bmy\s+\w+\s+(hits|beats|hurts)\s+me\b/i
        ]
    },
    {
        category: "violence",
        tests: [
            /\b(kill|shoot|stab|hurt)\s+(him|her|them|everyone|someone|people)\b/i,
            /\bbring\s+a\s+(gun|knife|weapon)\b/i,
            /\bshoot\s+up\s+(the|my)\s+school\b/i
        ]
    }
];

// Written by a person, not a model. Never generated, never varied.
const REPLIES = {
    self_harm:
        "I'm really glad you told me that, and I want you to know it matters. " +
        "What you're feeling is bigger than anything I can help with in a chat, " +
        "and you deserve to talk to someone who can really be there with you. " +
        "Please reach out to one of the people below right now, and tell a parent, " +
        "guardian, or another adult you trust today. You are not in trouble for feeling this way.",
    abuse:
        "Thank you for telling me. What you described is not okay, and it is not your fault. " +
        "I'm not able to help with something this serious on my own, but the people below " +
        "can, and they talk to kids about this every single day. Please reach out to them, " +
        "and find an adult you trust — a teacher, a school counselor, a relative — and tell them too.",
    violence:
        "That sounds like a lot to be carrying, and I want to make sure you get real help with it. " +
        "This isn't something I can work through with you in a chat. Please talk to one of the " +
        "people below, and tell a parent, guardian, counselor, or another trusted adult today."
};

// US resources. If MindZone ever ships outside the US these need to be
// localised — a wrong hotline number is worse than none.
const RESOURCES = [
    {
        name: "988 Suicide & Crisis Lifeline",
        contact: "Call or text 988",
        detail: "Free, confidential, 24/7. For anything that feels like too much.",
        url: "https://988lifeline.org"
    },
    {
        name: "Crisis Text Line",
        contact: "Text HOME to 741741",
        detail: "Text with a trained crisis counselor, 24/7.",
        url: "https://www.crisistextline.org"
    },
    {
        name: "Childhelp National Child Abuse Hotline",
        contact: "Call or text 1-800-422-4453",
        detail: "For anyone who is being hurt or is scared at home.",
        url: "https://www.childhelphotline.org"
    },
    {
        name: "Emergency services",
        contact: "Call 911",
        detail: "If you or someone else is in danger right now.",
        url: null
    }
];

/**
 * Screen a message. Returns { flagged, category } — category is null when clean.
 */
function screen(text) {
    const value = String(text || "");

    if (!value.trim()) {
        return { flagged: false, category: null };
    }

    for (const group of PATTERNS) {
        for (const test of group.tests) {
            if (test.test(value)) {
                return { flagged: true, category: group.category };
            }
        }
    }

    return { flagged: false, category: null };
}

/**
 * The fixed reply for a flagged category, with resources attached.
 */
function crisisResponse(category) {
    return {
        reply: REPLIES[category] || REPLIES.self_harm,
        crisis: true,
        category: category,
        resources: RESOURCES
    };
}

module.exports = { screen, crisisResponse, RESOURCES, REPLIES };
