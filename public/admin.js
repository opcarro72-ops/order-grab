function showMessage(message){

  const msg = document.getElementById("customMessage");
  const text = document.getElementById("messageText");

  text.innerText = message;

  msg.style.display = "block";

  setTimeout(() => {
    msg.style.display = "none";
  }, 3000);
}

function showConfirm(message){

  return new Promise((resolve) => {

    const box = document.getElementById("customConfirm");

    document.getElementById("confirmText").innerText = message;

    box.style.display = "flex";

    document.getElementById("confirmYes").onclick = () => {
      box.style.display = "none";
      resolve(true);
    };

    document.getElementById("confirmNo").onclick = () => {
      box.style.display = "none";
      resolve(false);
    };

  });
}

const token = localStorage.getItem("adminToken");

if (!token) {
  window.location.href = "/admin-login.html";
}

let userSelectTom = null;

async function loadUsers() {

  try {

    const res = await fetch("/admin/users", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const users = await res.json();

    const select = document.getElementById("userSelect");

    select.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select User";
    select.appendChild(defaultOption);

    users.forEach(user => {

      const option = document.createElement("option");

      option.value = user.username;
      option.textContent = user.username;

      select.appendChild(option);

    });

    if (userSelectTom) {
      userSelectTom.destroy();
    }

    userSelectTom = new TomSelect("#userSelect", {

      create: false,

      maxOptions: 1000,

      valueField: "value",

      labelField: "text",

      searchField: ["text"],

      sortField: [
        {
          field: "text",
          direction: "asc"
        }
      ],

      placeholder: "Search Username..."

    });

    userSelectTom.on("change", function(value) {

      if (value) {
        loadUserStatus();
      }

    });

  } catch (err) {

    console.error(err);

    showMessage("Failed to load users");

  }

}

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

    const freezeStatus = document.getElementById("freezeStatus");
const freezeReason = document.getElementById("freezeReason");

if (u.balanceFrozen) {

  freezeStatus.innerText =
    "Balance Status: FROZEN";

  freezeStatus.style.background = "#dc3545";
  freezeStatus.style.color = "#fff";

  freezeReason.value = u.freezeReason || "";

} else {

  freezeStatus.innerText =
    "Balance Status: NOT FROZEN";

  freezeStatus.style.background = "#28a745";
  freezeStatus.style.color = "#fff";

  freezeReason.value = "";

}

    document.getElementById("walletInfo").innerHTML = `
  <p><b>Name:</b> ${u.wallet?.name || "Not Set"}</p>
  <p><b>Protocol:</b> ${u.wallet?.protocol || "Not Set"}</p>
  <p><b>Address:</b> ${u.wallet?.address || "Not Set"}</p>
  <p><b>Password:</b> ${u.wallet?.password || "Not Set"}</p>
  <p><b>Locked:</b> ${u.wallet?.locked ? "Yes" : "No"}</p>
`;
  }
}
 
async function giveTasks() {

  const username = document.getElementById("userSelect").value;

  if (!username) return showMessage("Select user first");

  const mixedCount = Number(
    document.getElementById("mixedCount").value || 0
  );

  if (mixedCount < 0 || mixedCount > 7) {
    return showMessage("Mixed order count must be between 0 and 7");
  }

  const mixedPositions = document.getElementById("mixedPositions").value
    .split(",")
    .map(n => Number(n.trim()))
    .filter(n => n > 0 && n <= 25);

  if (mixedCount > 0 && mixedPositions.length !== mixedCount) {
    return showMessage("Mixed positions count must match mixedCount");
  }

  const percentText = document
    .getElementById("mixedPositionPercent")
    .value
    .trim();

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

  const commissionText = document
    .getElementById("mixedCommission")
    .value
    .trim();

  let mixedCommissions = {};

  if (commissionText) {

    commissionText.split("\n").forEach(line => {

      const parts = line.split(":");

      if (parts.length === 2) {

        mixedCommissions[
          Number(parts[0].trim())
        ] = Number(parts[1].trim());

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
      mixedPercentRanges: mixedPercents,
      mixedCommissionRanges: mixedCommissions

    })

  });

  const data = await res.json();

  showMessage(data.msg);

  loadUserStatus();

}

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
  showMessage(data.msg);
  loadUserStatus();
}

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
      <div class="admin-item">
        <p>User: ${dep.username}</p>
        <p>Requested Deposit: ${dep.amount}</p>
        <input
          type="number"
          id="dep_${dep._id}"
          value="${dep.amount}"
        >
        <button
          class="green-btn"
          onclick="approveDeposit('${dep._id}')">
          Approve Deposit
        </button>
        <button
          class="reject-btn"
          onclick="rejectDeposit('${dep._id}')">
          Reject Deposit
        </button>
      </div>
    `;

  });
}

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
  showMessage(data.message);
  loadDeposits();
}

async function rejectDeposit(id) {

  const confirmReject = await showConfirm(
    "Are you sure you want to reject this deposit?"
  );

  if (!confirmReject) return;

  try {

    const res = await fetch("/admin/reject-deposit", {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },

      body: JSON.stringify({
        id
      })

    });

    const data = await res.json();

    showMessage(data.message);

    if (data.success) {
      loadDeposits();
    }

  } catch (err) {

    showMessage("Server error");

  }

}

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
      <div class="admin-item">
        <p>User: ${wd.username}</p>
        <p>Requested Withdraw: ${wd.amount}</p>
        <input
          type="number"
          id="wd_${wd._id}"
          value="${wd.amount}"
        >
        <button
          class="green-btn"
          onclick="approveWithdraw('${wd._id}')">
          Approve Withdraw
        </button>
        <button
          class="reject-btn"
          onclick="rejectWithdraw('${wd._id}')">
          Reject Withdraw
        </button>
      </div>
    `;
  });
}

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
  showMessage(data.message);
  loadWithdraws();
}

async function rejectWithdraw(id) {

  const confirmReject = await showConfirm(
    "Are you sure you want to reject this withdrawal?"
  );

  if (!confirmReject) return;

  try {

    const res = await fetch("/admin/reject-withdraw", {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },

      body: JSON.stringify({
        id
      })

    });

    const data = await res.json();

    showMessage(data.message);

    if (data.success) {
      loadWithdraws();
    }

  } catch (err) {

    showMessage("Server error");

  }

}

function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "/admin-login.html";
}

loadUsers();
loadDeposits();
loadWithdraws();

async function resetUserPassword() {

  const username = document.getElementById("userSelect").value;

  const newPassword = document.getElementById("newUserPassword").value;

  if (!username) {
    return showMessage("Select user first");
  }

  if (!newPassword) {
    return showMessage("Enter new password");
  }

  const res = await fetch("/admin/reset-user-password", {

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },

    body: JSON.stringify({
      username,
      newPassword
    })

  });

  const data = await res.json();

  showMessage(data.msg);

}

async function resetWallet() {

  const username = document.getElementById("userSelect").value;

  if (!username) {
    return showMessage("Select user first");
  }

  const confirmReset = confirm(
    "Are you sure you want to reset wallet information?"
  );

  if (!confirmReset) return;

  const res = await fetch("/admin/reset-wallet", {

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },

    body: JSON.stringify({
      username
    })

  });

  const data = await res.json();

  showMessage(data.msg);

  loadUserStatus();

}

async function freezeBalance() {

  const username = document.getElementById("userSelect").value;

  const reason =
    document.getElementById("freezeReason").value.trim();

  if (!username) {
    return showMessage("Select user first");
  }

  if (!reason) {
    return showMessage("Please enter freeze reason");
  }

  const confirmFreeze = await showConfirm(
    "Are you sure you want to freeze this user's balance?"
  );

  if (!confirmFreeze) return;

  try {

    const res = await fetch("/admin/freeze-balance", {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },

      body: JSON.stringify({
        username,
        frozen: true,
        reason
      })

    });

    const data = await res.json();

    showMessage(data.msg);

    if (data.success) {
      loadUserStatus();
    }

  } catch (err) {

    showMessage("Server error");

  }

}

async function unfreezeBalance() {

  const username = document.getElementById("userSelect").value;

  if (!username) {
    return showMessage("Select user first");
  }

  const confirmUnfreeze = await showConfirm(
    "Are you sure you want to unfreeze this user's balance?"
  );

  if (!confirmUnfreeze) return;

  try {

    const res = await fetch("/admin/freeze-balance", {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },

      body: JSON.stringify({
        username,
        frozen: false,
        reason: ""
      })

    });

    const data = await res.json();

    showMessage(data.msg);

    if (data.success) {
      loadUserStatus();
    }

  } catch (err) {

    showMessage("Server error");

  }

}