const loginCard = document.getElementById("loginCard");
const adminPanel = document.getElementById("adminPanel");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const loginMessage = document.getElementById("loginMessage");
const panelMessage = document.getElementById("panelMessage");
const plansList = document.getElementById("plansList");
const refreshBtn = document.getElementById("refreshBtn");

checkAdminSession();

adminLoginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;

    const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
        loginMessage.textContent = data.message;
        return;
    }

    showAdminPanel();
    await loadPendingPlans();
});

adminLogoutBtn.addEventListener("click", async function () {
    await fetch("/api/admin/logout", {
        method: "POST"
    });

    showLogin();
});

refreshBtn.addEventListener("click", loadPendingPlans);

async function checkAdminSession() {
    try {
        const response = await fetch("/api/admin/me");

        if (!response.ok) {
            showLogin();
            return;
        }

        showAdminPanel();
        await loadPendingPlans();
    } catch (error) {
        showLogin();
    }
}

function showLogin() {
    loginCard.hidden = false;
    adminPanel.hidden = true;
    adminLogoutBtn.hidden = true;
    plansList.innerHTML = "";
    panelMessage.textContent = "";
}

function showAdminPanel() {
    loginCard.hidden = true;
    adminPanel.hidden = false;
    adminLogoutBtn.hidden = false;
    loginMessage.textContent = "";
}

async function loadPendingPlans() {
    panelMessage.textContent = "Loading pending plans...";
    plansList.innerHTML = "";

    try {
        const response = await fetch("/api/admin/plans");
        const data = await response.json();

        if (!response.ok) {
            panelMessage.textContent = data.message;
            return;
        }

        if (data.plans.length === 0) {
            panelMessage.textContent = "No pending plans right now.";
            return;
        }

        panelMessage.textContent = "";

        for (const plan of data.plans) {
            plansList.appendChild(createPlanCard(plan));
        }
    } catch (error) {
        panelMessage.textContent = "Could not load pending plans.";
    }
}

function createPlanCard(plan) {
    const card = document.createElement("article");
    card.className = "plan-card";

    const title = document.createElement("h2");
    title.textContent = plan.name || plan.email || "Pending Plan";

    const profile = document.createElement("div");
    profile.className = "profile-grid";
    profile.appendChild(makeDetail("Email", plan.email));
    profile.appendChild(makeDetail("Sport", plan.sport));
    profile.appendChild(makeDetail("Goal", plan.goal));
    profile.appendChild(makeDetail("Challenge", plan.challenge));
    profile.appendChild(makeDetail("Days", plan.days));
    profile.appendChild(makeDetail("Confidence", plan.confidence));
    profile.appendChild(makeDetail("Stress", plan.stress));
    profile.appendChild(makeDetail("Focus", plan.focus));
    profile.appendChild(makeDetail("Bounce Back", plan.bounce));

    const planTextLabel = document.createElement("label");
    planTextLabel.textContent = "Edit Plan Before Approval";

    const planEditor = document.createElement("textarea");
    planEditor.className = "plan-editor";
    planEditor.value = plan.plan_text;

    const actions = document.createElement("div");
    actions.className = "actions";

    const approveBtn = document.createElement("button");
    approveBtn.type = "button";
    approveBtn.className = "approve-btn";
    approveBtn.textContent = "Approve";
    approveBtn.addEventListener("click", function () {
        reviewPlan(plan.id, "approve", planEditor.value);
    });

    const rejectBtn = document.createElement("button");
    rejectBtn.type = "button";
    rejectBtn.className = "reject-btn";
    rejectBtn.textContent = "Reject";
    rejectBtn.addEventListener("click", function () {
        reviewPlan(plan.id, "reject");
    });

    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);

    card.appendChild(title);
    card.appendChild(profile);
    card.appendChild(planTextLabel);
    card.appendChild(planEditor);
    card.appendChild(actions);

    return card;
}

function makeDetail(label, value) {
    const item = document.createElement("p");
    item.textContent = label + ": " + (value || "Not provided");
    return item;
}

async function reviewPlan(planId, action, planText) {
    const response = await fetch("/api/admin/plans/" + planId + "/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planText })
    });

    const data = await response.json();

    if (!response.ok) {
        panelMessage.textContent = data.message;
        return;
    }

    panelMessage.textContent = data.message;
    await loadPendingPlans();
}
