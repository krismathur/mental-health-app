const button = document.getElementById("generatePlanButton");
const planText = document.getElementById("planText");
const planGrid = document.getElementById("planGrid");
const card = document.querySelector(".card");

button.addEventListener("click", async function () {
    const name = localStorage.getItem("mindzone_name");
    const age = localStorage.getItem("mindzone_age");
    const sport = localStorage.getItem("mindzone_sport");
    const goal = localStorage.getItem("mindzone_goal");
    const challenge = localStorage.getItem("mindzone_challenge");
    const days = parseInt(localStorage.getItem("mindzone_days"), 10) || 0;

    planText.textContent = "Generating your plan...";
    planGrid.hidden = true;
    planGrid.innerHTML = "";
    button.disabled = true;

    const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, age, sport, goal, challenge, days })
    });

    const data = await response.json();
    if (data.message && !data.plan) {
        planText.textContent = data.message;
        button.disabled = false;
        return;
    }

    const entries = parsePlan(data.plan);

    if (entries.length === 0) {
        planText.textContent = data.plan || "Could not parse the plan.";
        button.disabled = false;
        return;
    }

    card.classList.add("compact");
    button.textContent = "Regenerate";

    planGrid.classList.toggle("two-col", entries.length > 10);

    for (const entry of entries) {
        const row = document.createElement("div");
        row.className = "plan-row";

        const dayEl = document.createElement("div");
        dayEl.className = "plan-day";
        dayEl.textContent = "Day " + entry.day;

        const recEl = document.createElement("div");
        recEl.className = "plan-rec";
        recEl.textContent = entry.text;

        row.appendChild(dayEl);
        row.appendChild(recEl);
        planGrid.appendChild(row);
    }

    planGrid.hidden = false;
    button.disabled = false;
});

function parsePlan(raw) {
    if (!raw) return [];
    const lines = raw.split(/\r?\n/);
    const out = [];
    for (const line of lines) {
        const cleaned = line.replace(/[“”"]/g, "").trim();
        const match = cleaned.match(/^Day\s+(\d+)\s*[:\-]\s*(.+)$/i);
        if (match) {
            out.push({ day: parseInt(match[1], 10), text: match[2].trim() });
        }
    }
    return out;
}
