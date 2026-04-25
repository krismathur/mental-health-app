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

    // add more sports

    const line1 = "Welcome to MindZone " + name + "!";
    //  finish line 2 
    const line2 = "MindZone is a website personalized to you and your sport through so many fun features.";
    const line3 = extra;
    document.getElementById("output").innerText = line1 + " " + line2 + " " + line3;
    localStorage.setItem("mindzone_name", name);
    localStorage.setItem("minzone_sport", sport);

    });