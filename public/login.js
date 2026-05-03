async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username,
      password
    })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);

    localStorage.setItem("username", data.username);

    alert("Login successful");
    window.location.href = "/home.html";
  } else {
    alert(data.msg || "Login failed");
  }
}

function changeLang(lang){
  localStorage.setItem("lang", lang);

  if(lang === "bn"){
    document.querySelector("h1").innerText = "হ্যালো, স্বাগতম!";
    document.querySelector("h2").innerText = "লগইন";

    document.getElementById("username").placeholder = "৬-১৬ অক্ষর বা সংখ্যা";
    document.getElementById("password").placeholder = "৬-১৬ অক্ষরের পাসওয়ার্ড";

    document.querySelector(".remember label") 
      ? document.querySelector(".remember label").innerText = "পাসওয়ার্ড মনে রাখুন"
      : document.querySelector(".remember").innerHTML = '<input type="checkbox" checked> পাসওয়ার্ড মনে রাখুন';

    document.querySelector(".login-btn").innerText = "লগইন";
    document.querySelector(".register").innerText = "রেজিস্ট্রেশন";

  }else{
    document.querySelector("h1").innerText = "Hello,Welcome!";
    document.querySelector("h2").innerText = "Login";

    document.getElementById("username").placeholder = "6-16 letters or numbers";
    document.getElementById("password").placeholder = "6-16 alphanumeric password";

    document.querySelector(".remember label") 
      ? document.querySelector(".remember label").innerText = "Remember password"
      : document.querySelector(".remember").innerHTML = '<input type="checkbox" checked> Remember password';

    document.querySelector(".login-btn").innerText = "Login";
    document.querySelector(".register").innerText = "Registration";
  }
}

function goRegister() {
  window.location.href = "/register.html";
}

window.onload = function(){
  const lang = localStorage.getItem("lang") || "en";
  document.querySelector(".lang").value = lang;
  changeLang(lang);
}