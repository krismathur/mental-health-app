const button = document.getElementById("generatePlanButton");
const planText = document.getElementById("planText");

button.addEventListener("click", async function () {
    const name = localStorage.getItem("mindzone_name");
    const age= localStorage.getItem("mindzone_age");
    const sport = localStorage.getItem("mindzone_sport");
    const goal = localStorage.getItem("mindzone_goal");
    const challenge = localStorage.getItem("mindzone_challenge");
    const days = localStorage.getItem("mindzone_days");

    planText.textContent = "Generating your plan...";

    const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, age, sport, goal, challenge, days }) 
    });

    const data = await response.json();
    planText.textContent = data.plan;

})