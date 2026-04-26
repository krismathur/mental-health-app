const savedName = localStorage.getItem("mindzone_name");
if (!savedName) window.location.href = "index.html";
const motivation = localStorage.getItem("mindzone_motivation") || "Keep showing up, and trust your training.";
const titleEl = document.getElementById("welcomeTitle");
titleEl.textContent = "Welcome to MindZone, " + savedName + "!";
const messageEl = document.getElementById("motivationText");
messageEl.textContent = motivation;
