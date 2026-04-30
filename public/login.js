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

function goRegister() {
  window.location.href = "/register.html";
}