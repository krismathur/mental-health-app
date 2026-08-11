(function () {
    const startBtn = document.getElementById("startCoachChatBtn");
    const overlay = document.getElementById("coachOverlay");
    const backdrop = document.getElementById("coachOverlayBackdrop");
    const closeBtn = document.getElementById("closeCoachBtn");
    const clearBtn = document.getElementById("clearChatBtn");
    const messagesBox = document.getElementById("coachMessages");
    const form = document.getElementById("coachForm");
    const input = document.getElementById("coachInput");
    const sendBtn = document.getElementById("coachSendBtn");
    const notice = document.getElementById("coachNotice");

    if (!startBtn || !overlay || !form || !input || !messagesBox) {
        return;
    }

    const WELCOME_MESSAGE = "Hey! I'm your MindZone coach. Tell me what's going on with your training, your last game, or anything on your mind.";

    let historyLoaded = false;
    let sending = false;

    function showNotice(message) {
        if (!notice) {
            return;
        }

        notice.textContent = message;
        notice.hidden = !message;
    }

    function scrollToLatest() {
        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    function addMessage(role, text) {
        const row = document.createElement("div");
        row.className = "coach-msg coach-msg-" + role;

        const bubble = document.createElement("div");
        bubble.className = "coach-bubble";
        bubble.textContent = text;

        row.appendChild(bubble);
        messagesBox.appendChild(row);
        scrollToLatest();

        return row;
    }

    function showTyping() {
        const row = document.createElement("div");
        row.className = "coach-msg coach-msg-coach coach-typing-row";
        row.innerHTML =
            '<div class="coach-bubble coach-typing">' +
                '<span></span><span></span><span></span>' +
            "</div>";

        messagesBox.appendChild(row);
        scrollToLatest();

        return row;
    }

    function setSending(isSending) {
        sending = isSending;
        sendBtn.disabled = isSending;
        sendBtn.textContent = isSending ? "Sending..." : "Send";
    }

    function autoGrowInput() {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 140) + "px";
    }

    async function loadHistory() {
        if (historyLoaded) {
            return;
        }

        try {
            const response = await fetch("/api/coach-history");

            if (response.status === 401) {
                showNotice("Log in to chat with your coach.");
                return;
            }

            const data = await response.json();
            const messages = (data && data.messages) || [];

            messagesBox.innerHTML = "";

            if (!messages.length) {
                addMessage("coach", WELCOME_MESSAGE);
            } else {
                messages.forEach(function (entry) {
                    addMessage(entry.role === "coach" ? "coach" : "user", entry.text);
                });
            }

            historyLoaded = true;
            showNotice("");
        } catch (error) {
            showNotice("Could not load your past messages.");
        }
    }

    async function sendMessage(text) {
        addMessage("user", text);
        setSending(true);
        showNotice("");

        const typingRow = showTyping();

        try {
            const response = await fetch("/api/coach-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            typingRow.remove();

            if (!response.ok || !data.reply) {
                showNotice(data.message || "Could not reach the coach right now. Please try again.");
                return;
            }

            addMessage("coach", data.reply);
        } catch (error) {
            typingRow.remove();
            showNotice("Could not reach the coach right now. Please try again.");
        } finally {
            setSending(false);
        }
    }

    function openChat() {
        overlay.classList.remove("overlay-hidden");
        document.body.classList.add("overlay-open");
        loadHistory().then(function () {
            input.focus();
        });
    }

    function closeChat() {
        overlay.classList.add("overlay-hidden");
        document.body.classList.remove("overlay-open");
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const text = input.value.trim();
        if (!text || sending) {
            return;
        }

        input.value = "";
        autoGrowInput();
        sendMessage(text);
    });

    // Enter sends the message, Shift+Enter starts a new line.
    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            form.requestSubmit();
        }
    });

    input.addEventListener("input", autoGrowInput);

    if (clearBtn) {
        clearBtn.addEventListener("click", async function () {
            if (!window.confirm("Delete this whole conversation?")) {
                return;
            }

            try {
                const response = await fetch("/api/coach-history", { method: "DELETE" });
                if (!response.ok) {
                    showNotice("Could not clear the chat.");
                    return;
                }

                messagesBox.innerHTML = "";
                addMessage("coach", WELCOME_MESSAGE);
                showNotice("");
            } catch (error) {
                showNotice("Could not clear the chat.");
            }
        });
    }

    startBtn.addEventListener("click", openChat);

    if (closeBtn) {
        closeBtn.addEventListener("click", closeChat);
    }

    if (backdrop) {
        backdrop.addEventListener("click", closeChat);
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !overlay.classList.contains("overlay-hidden")) {
            closeChat();
        }
    });
})();
