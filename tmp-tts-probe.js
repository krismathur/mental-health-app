require("dotenv").config();

const key = process.env.GEMINI_API_KEY;
const ttsModel = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const chatModel = process.env.GEMINI_MODEL;

async function rawTts() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${ttsModel}:generateContent?key=${key}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello there." }] }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } }
            } 
        })
    });
    const data = await response.json();
    return { status: response.status, error: JSON.stringify(data.error || {}, null, 1).slice(0, 1500) };
}

async function chat(message) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${chatModel}:generateContent?key=${key}`;
    const prompt = `You are "Chat Bot", a warm friendly mental-health chat buddy for a young athlete.
Keep replies to 2-4 short sentences. If the message is gibberish, empty, or you cannot tell what they mean, reply with EXACTLY: Sorry I didn't understand

Athlete just said: ${message}

Reply as Chat Bot with only the words you would say out loud.`;
    const started = Date.now();
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 600, thinkingConfig: { thinkingBudget: 0 } }
        })
    });
    const data = await response.json();
    return {
        status: response.status,
        ms: Date.now() - started,
        reply: (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim().replace(/\s+/g, " ").slice(0, 150),
        error: data.error?.message ? data.error.message.slice(0, 100) : null
    };
}

(async function () {
    console.log("chat model:", chatModel, "| tts model:", ttsModel);

    console.log("\n=== full TTS quota error ===");
    const t = await rawTts();
    console.log("status", t.status, t.error);

    console.log("\n=== chat endpoint with realistic speech-to-text text (no punctuation) ===");
    const samples = [
        "yeah i guess like i've been kind of nervous about my game tomorrow and i keep messing up my serve",
        "um",
        "i dont know",
        "i missed the game winning shot yesterday and everyone was looking at me",
        "hows it going"
    ];
    for (const s of samples) {
        const r = await chat(s);
        console.log(`\ninput: "${s}"\n  -> status=${r.status} ${r.ms}ms ${r.error || ""}\n  -> reply: ${r.reply}`);
    }
})();
