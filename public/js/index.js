const loginLink = document.getElementById("loginLink");
const signupLink = document.getElementById("signupLink");

async function checkLoginStatus() {
    try {
        const response = await fetch("/api/me");

        if (!response.ok) {
            return;
        }

        loginLink.textContent = "Dashboard";
        loginLink.href = "welcome.html";

        signupLink.textContent = "Log Out";
        signupLink.href = "#";

        signupLink.addEventListener("click", async function (event) {
            event.preventDefault();

            await fetch("/api/logout", {
                method: "POST"
            });

            window.location.href = "index.html";
        });
    } catch (error) {
        // Keep the default Log In / Sign Up buttons if the server is unreachable.
    }
}

checkLoginStatus();
