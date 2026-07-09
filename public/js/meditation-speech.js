(function (global) {
    let meditationVoiceCache = null;
    let meditationUseGeminiVoice = true;
    let meditationAudio = null;
    const meditationAudioCache = new Map();
    const MEDITATION_AUDIO_PLAYBACK_RATE = 1.12;

    const PREFERRED_MEDITATION_VOICES = [
        "Samantha",
        "Karen",
        "Victoria",
        "Serena",
        "Flo",
        "Moira",
        "Google UK English Female",
        "Google US English",
        "Microsoft Zira",
        "Microsoft Jenny",
        "Microsoft Aria",
        "Alex",
        "Daniel",
        "Tessa"
    ];

    function scoreMeditationVoice(voice) {
        if (!voice.lang.startsWith("en")) {
            return -1;
        }

        let score = 0;
        const name = voice.name;

        if (voice.localService) {
            score += 4;
        }

        PREFERRED_MEDITATION_VOICES.forEach(function (preferredName, index) {
            if (name.includes(preferredName)) {
                score += 24 - index;
            }
        });

        if (name.includes("Premium") || name.includes("Enhanced") || name.includes("Natural")) {
            score += 6;
        }

        if (name.includes("Female")) {
            score += 2;
        }

        if (name.includes("Compact")) {
            score -= 4;
        }

        return score;
    }

    function loadMeditationVoices() {
        if (!global.speechSynthesis) {
            return;
        }

        const voices = global.speechSynthesis.getVoices();
        if (!voices.length) {
            return;
        }

        let bestVoice = null;
        let bestScore = -1;

        voices.forEach(function (voice) {
            const score = scoreMeditationVoice(voice);
            if (score > bestScore) {
                bestScore = score;
                bestVoice = voice;
            }
        });

        meditationVoiceCache = bestVoice || voices.find(function (voice) {
            return voice.lang.startsWith("en");
        }) || null;
    }

    function getMeditationVoice() {
        if (meditationVoiceCache) {
            return meditationVoiceCache;
        }

        loadMeditationVoices();
        return meditationVoiceCache;
    }

    function prepareMeditationSpeech() {
        if (!global.speechSynthesis) {
            return;
        }

        loadMeditationVoices();
        global.speechSynthesis.cancel();
        global.speechSynthesis.resume();
    }

    function softenMeditationText(text) {
        return String(text || "")
            .replace(/\. /g, ".  ")
            .replace(/, /g, ",  ");
    }

    function cancelMeditationSpeech() {
        if (meditationAudio) {
            meditationAudio.pause();
            meditationAudio.onended = null;
            meditationAudio.onerror = null;
            meditationAudio.src = "";
            meditationAudio = null;
        }

        if (global.speechSynthesis) {
            global.speechSynthesis.cancel();
        }
    }

    async function fetchMeditationAudio(text) {
        if (meditationAudioCache.has(text)) {
            return meditationAudioCache.get(text);
        }

        const response = await fetch("/api/meditation-speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) {
            throw new Error("TTS request failed");
        }

        const data = await response.json();
        if (!data.audioBase64) {
            throw new Error("No audio returned");
        }

        meditationAudioCache.set(text, data);
        return data;
    }

    function speakWithBrowser(text, callbacks) {
        if (!global.speechSynthesis) {
            if (callbacks.onError) {
                callbacks.onError();
            }
            return;
        }

        prepareMeditationSpeech();

        const utterance = new SpeechSynthesisUtterance(softenMeditationText(text));
        const voice = getMeditationVoice();
        utterance.rate = 1.1;
        utterance.pitch = 0.96;
        utterance.volume = 1;
        if (voice) {
            utterance.voice = voice;
        }

        if (callbacks.onStart) {
            callbacks.onStart();
        }

        utterance.onend = function () {
            if (callbacks.onEnd) {
                callbacks.onEnd();
            }
        };

        utterance.onerror = function () {
            if (callbacks.onError) {
                callbacks.onError();
            }
        };

        global.speechSynthesis.speak(utterance);
    }

    async function speakWithGemini(text, callbacks) {
        const data = await fetchMeditationAudio(text);

        if (meditationAudio) {
            meditationAudio.pause();
            meditationAudio.onended = null;
            meditationAudio.onerror = null;
            meditationAudio.src = "";
            meditationAudio = null;
        }

        if (callbacks.onStart) {
            callbacks.onStart();
        }

        meditationAudio = new Audio("data:" + data.mimeType + ";base64," + data.audioBase64);
        meditationAudio.playbackRate = MEDITATION_AUDIO_PLAYBACK_RATE;

        meditationAudio.onended = function () {
            meditationAudio = null;
            if (callbacks.onEnd) {
                callbacks.onEnd();
            }
        };

        meditationAudio.onerror = function () {
            meditationAudio = null;
            meditationUseGeminiVoice = false;
            speakWithBrowser(text, callbacks);
        };

        await meditationAudio.play();
    }

    async function speakMeditationText(text, callbacks) {
        callbacks = callbacks || {};
        const trimmedText = String(text || "").trim();
        if (!trimmedText) {
            return;
        }

        cancelMeditationSpeech();

        if (meditationUseGeminiVoice) {
            try {
                await speakWithGemini(trimmedText, callbacks);
                return;
            } catch (error) {
                meditationUseGeminiVoice = false;
            }
        }

        speakWithBrowser(trimmedText, callbacks);
    }

    if (global.speechSynthesis) {
        loadMeditationVoices();
        global.speechSynthesis.onvoiceschanged = function () {
            loadMeditationVoices();
        };
    }

    global.MeditationSpeech = {
        speak: speakMeditationText,
        cancel: cancelMeditationSpeech,
        prepare: prepareMeditationSpeech
    };
})(window);
