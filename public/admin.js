const token = localStorage.getItem("adminToken");

if (!token) {
  window.location.href = "/admin-login.html";
}

/* ---------------- LOAD USERS ---------------- */
async function loadUsers() {
  const res = await fetch("/admin/users", {
    headers: { Authorization: "Bearer " + token }
  });

  const users = await res.json();
  const select = document.getElementById("userSelect");

  select.innerHTML = '<option value="">Select User</option>';

  users.forEach(user => {
    select.innerHTML += `<option value="${user.username}">${user.username}</option>`;
  });
}

/* ---------------- LOAD USER STATUS ---------------- */
async function loadUserStatus() {
  const username = document.getElementById("userSelect").value;
  if (!username) return;

  const res = await fetch(`/admin/user-status/${username}`, {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  if (data.success) {
    const u = data.user;

    document.getElementById("userStatus").innerHTML = `
      <p>Today's Tasks: ${u.todayTasks}</p>
      <p>Task Limit: ${u.taskLimit}</p>
      <p>Today's Commission: ${u.todayCommission.toFixed(4)} USDT</p>
      <p>Yesterday's Commission: ${u.yesterdayCommission.toFixed(4)} USDT</p>
      <p>Balance: ${u.balance.toFixed(4)} USDT</p>
      <p>Mixed Positions: ${
        u.mixedOrderPositions && u.mixedOrderPositions.length > 0
          ? u.mixedOrderPositions.join(", ")
          : "None"
      }</p>
    `;

    document.getElementById("newBalance").value = u.balance;
  }
}
 
async function giveTasks() {
  const username = document.getElementById("userSelect").value;
  if (!username) return alert("Select user first");

  const mixedCount = Number(document.getElementById("mixedCount").value || 0);

  if (mixedCount < 0 || mixedCount > 5) {
    return alert("Mixed order count must be between 0 and 5");
  }

  const mixedPositions = document.getElementById("mixedPositions").value
    .split(",")
    .map(n => Number(n.trim()))
    .filter(n => n > 0 && n <= 25);

  if (mixedCount > 0 && mixedPositions.length !== mixedCount) {
    return alert("Mixed positions count must match mixedCount");
  }

  // ✅ ONLY this part keep
  const percentText = document.getElementById("mixedPositionPercent")?.value.trim();

  let mixedPercents = {};

  if (percentText) {
    percentText.split("\n").forEach(line => {
      const parts = line.split(":");

      if (parts.length === 2) {
        const position = Number(parts[0].trim());
        const rangeParts = parts[1].trim().split("-");

        if (rangeParts.length === 2) {
          mixedPercents[position] = {
            min: Number(rangeParts[0]),
            max: Number(rangeParts[1])
          };
        }
      }
    });
  }

  const res = await fetch("/admin/allow-tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      username,
      mixedCount,
      mixedPositions,
      mixedPercentRanges: mixedPercents
    })
  });

  const data = await res.json();
  alert(data.msg);
  loadUserStatus();
}

/* ---------------- UPDATE BALANCE ---------------- */
async function updateBalance() {
  const username = document.getElementById("userSelect").value;
  const balance = Number(document.getElementById("newBalance").value);

  const res = await fetch("/admin/update-balance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ username, balance })
  });

  const data = await res.json();
  alert(data.msg);
  loadUserStatus();
}

/* ---------------- LOAD DEPOSITS ---------------- */
async function loadDeposits() {
  const res = await fetch("/admin/deposits", {
    headers: { Authorization: "Bearer " + token }
  });

  const deposits = await res.json();
  const box = document.getElementById("depositList");
  box.innerHTML = "";

  deposits
    .filter(d => d.status === "Pending")
    .forEach(dep => {
      box.innerHTML += `
        <div class="item">
          <p>User: ${dep.username}</p>
          <p>Requested Deposit: ${dep.amount}</p>
          <input type="number" id="dep_${dep._id}" value="${dep.amount}">
          <button class="green-btn" onclick="approveDeposit('${dep._id}')">Approve Deposit</button>
        </div>
      `;
    });
}

/* ---------------- APPROVE DEPOSIT ---------------- */
async function approveDeposit(id) {
  const approvedAmount = document.getElementById("dep_" + id).value;

  const res = await fetch("/admin/approve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ id, approvedAmount })
  });

  const data = await res.json();
  alert(data.message);
  loadDeposits();
}

/* ---------------- LOAD WITHDRAWS ---------------- */
async function loadWithdraws() {
  const res = await fetch("/admin/withdraws", {
    headers: { Authorization: "Bearer " + token }
  });

  const withdraws = await res.json();
  const box = document.getElementById("withdrawList");
  box.innerHTML = "";

  withdraws
    .filter(w => w.status === "Processing")
    .forEach(wd => {
      box.innerHTML += `
        <div class="item">
          <p>User: ${wd.username}</p>
          <p>Requested Withdraw: ${wd.amount}</p>
          <input type="number" id="wd_${wd._id}" value="${wd.amount}">
          <button class="green-btn" onclick="approveWithdraw('${wd._id}')">Approve Withdraw</button>
        </div>
      `;
    });
}

/* ---------------- APPROVE WITHDRAW ---------------- */
async function approveWithdraw(id) {
  const approvedAmount = document.getElementById("wd_" + id).value;

  const res = await fetch("/admin/approve-withdraw", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ id, approvedAmount })
  });

  const data = await res.json();
  alert(data.message);
  loadWithdraws();
}

/* ---------------- LOGOUT ---------------- */
function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "/admin-login.html";
}

/* ---------------- INIT ---------------- */
loadUsers();
loadDeposits();
loadWithdraws();