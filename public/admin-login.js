async function adminLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("errorMsg");

  errorMsg.innerText = "";

  if (!username || !password) {
    errorMsg.innerText = "Username and password required";
    return;
  }

  try {
    const res = await fetch("/admin-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem("adminToken", data.token);
      window.location.href = "/admin.html";
    } else {
      errorMsg.innerText = data.msg || "Admin login failed";
    }

  } catch (err) {
    errorMsg.innerText = "Server error";
  }
}