const button = document.getElementById("submitBtn");
button.addEventListener("click", function (event){
    event.preventDefault();
    const name = document.getElementById("name").value.trim();
    const age = document.getElementById("age").value.trim();
    const sport = document.getElementById("sport").value.trim();
    const sportLower = sport.toLowerCase();
    let extra = "Keep showing up, and trust your training.";
    if (sportLower.includes("basketball")){
        extra = "Take your confidence, and show it on the court!"
    } else if (sportLower.includes("tennis")){
        extra = "Take the match step by step."
    } else if (sportLower.includes("baseball")){
        extra = "Stay confident, and calm at the plate."
    }

    localStorage.setItem("mindzone_name", name);
    localStorage.setItem("mindzone_sport", sport);
    localStorage.setItem("mindzone_motivation", extra);
    window.location.href = "welcome.html";
    });