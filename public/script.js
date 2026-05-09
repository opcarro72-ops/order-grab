/* ---------------- LOGIN ---------------- */
async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Enter username & password");
    return;
  }

  let data;

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    data = await res.json();

  } catch (err) {
    alert("Server error");
    return;
  }

  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("username", data.username);
    window.location.href = "/home.html";
  } else {
    alert(data.msg || "Login failed");
  }
}

/* ---------------- REGISTER ---------------- */
async function register() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Enter username & password");
    return;
  }

  const res = await fetch("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (data.success) {
    alert("Register success!");
    window.location.href = "login.html";
  } else {
    alert(data.msg || "Register failed");
  }
}

async function loadBalance() {

  const token = localStorage.getItem("token");

  if (!token) return;

  try {

    const res = await fetch("/balance", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const data = await res.json();

    const balanceEl = document.getElementById("balance");

    if (balanceEl) {
      balanceEl.innerText =
        parseFloat(data.balance || 0).toFixed(4) + " USDT";
    }

    const cashGapEl = document.getElementById("cashGap");

    if (cashGapEl) {
      cashGapEl.innerText =
        parseFloat(data.cashGap || 0).toFixed(4) + " USDT";
    }

    const todayTimesEl = document.getElementById("todayTimes");

    if (todayTimesEl) {
      todayTimesEl.innerText = data.todayTasks || 0;
    }

    const todayCommissionEl =
      document.getElementById("todayCommission");

    if (todayCommissionEl) {
      todayCommissionEl.innerText =
        parseFloat(data.todayCommission || 0).toFixed(4) + " USDT";
    }

    const yesterdayCommissionEl =
      document.getElementById("yesterdayCommission");

    if (yesterdayCommissionEl) {
      yesterdayCommissionEl.innerText =
        parseFloat(data.yesterdayCommission || 0).toFixed(4) + " USDT";
    }

  } catch (err) {

    console.log("Balance load failed", err);

  }

}

/* ---------------- DEPOSIT REQUEST ---------------- */
async function goNext() {
  const amountInput = document.getElementById("amountInput");
  if (!amountInput) return;

  const amount = parseFloat(amountInput.value);

  if (!amount || amount < 0.1) {
    alert("Deposit amount must be greater than 0.1 USDT");
    return;
  }

  const token = localStorage.getItem("token");

  const res = await fetch("/deposit-request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ amount })
  });

  const data = await res.json();

  if (data.success) {
    alert("Deposit request submitted");
    window.location.href = "payment.html";
  } else {
    alert(data.msg || "Deposit failed");
  }
}

/* ---------------- WITHDRAW REQUEST ---------------- */
async function withdraw() {
  const amount = prompt("Enter amount");
  if (!amount) return;

  const token = localStorage.getItem("token");

  const res = await fetch("/withdraw", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ amount })
  });

  const data = await res.json();

  if (data.success) {
    alert("Withdraw request submitted");
    loadBalance();
  } else {
    alert(data.msg || "Withdraw failed");
  }
}

/* ---------------- USERNAME ---------------- */
function loadUsername() {
  const name = localStorage.getItem("username");

  const el = document.getElementById("usernameDisplay");
  if (el && name) {
    el.innerHTML = name + ' <span class="vip">VIP0</span>';
  }
}

/* ---------------- LOGOUT ---------------- */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "login.html";
}

/* ---------------- PAGE NAVIGATION ---------------- */
function goPage(page) {
  window.location.href = page;
}

function goRegister() {
  window.location.href = "register.html";
}

/* ---------------- DEPOSIT INPUT CHECK ---------------- */
function checkAmount() {
  const amountInput = document.getElementById("amountInput");
  const btn = document.getElementById("depositBtn");
  const show = document.getElementById("showAmount");

  if (!amountInput || !btn || !show) return;

  const amount = parseFloat(amountInput.value) || 0;

  show.innerText = amount;

  if (amount >= 0.1) {
    btn.disabled = false;
    btn.classList.add("active");
  } else {
    btn.disabled = true;
    btn.classList.remove("active");
  }
}

/* ---------------- LANGUAGE ---------------- */
const translations = {
  en: {
    home: "Home",
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    depositRecords: "Deposit records",
    withdrawRecords: "Withdrawal records",
    languageSettings: "Language settings"
  },
  bn: {
    home: "হোম",
    deposit: "ডিপোজিট",
    withdrawal: "উইথড্র",
    profile: "প্রোফাইল",
    settings: "সেটিংস",
    logout: "লগআউট",
    depositRecords: "ডিপোজিট রেকর্ড",
    withdrawRecords: "উইথড্র রেকর্ড",
    languageSettings: "ভাষা পরিবর্তন"
  }
};

function applyLanguage() {
  const lang = localStorage.getItem("siteLanguage") || "en";
  const t = translations[lang];

  document.querySelectorAll("[data-lang]").forEach(el => {
    const key = el.getAttribute("data-lang");
    if (t[key]) {
      el.innerText = t[key];
    }
  });
}

window.addEventListener("load", function () {

  loadBalance();
  loadUsername();
  applyLanguage();

  const todayTimesEl = document.getElementById("todayTimes");
  const todayCommissionEl = document.getElementById("todayCommission");
  const yesterdayCommissionEl = document.getElementById("yesterdayCommission");

  if (todayTimesEl) {
    todayTimesEl.innerText = times;
  }

  if (todayCommissionEl) {
    todayCommissionEl.innerText = totalCommission.toFixed(4) + " USDT";
  }

  if (yesterdayCommissionEl) {
    yesterdayCommissionEl.innerText = yesterdayCommission.toFixed(4) + " USDT";
  }

  const amountInput = document.getElementById("amountInput");
  if (amountInput) {
    amountInput.addEventListener("input", checkAmount);
  }

  if (document.getElementById("incompleteTab")) {
    renderOrders();
  }

  if (typeof setActiveNav === "function") {
    setActiveNav();
  }

});

/* ---------------- VIP FILTER ---------------- */
function filterCards(vip, btn) {
  const cards = document.querySelectorAll(".menu-card");
  const tabs = document.querySelectorAll(".tab");

  // সব tab থেকে active class remove
  tabs.forEach(tab => tab.classList.remove("active"));

  // clicked tab active
  if (btn) {
    btn.classList.add("active");
  }

  // card show/hide
  cards.forEach(card => {
    if (vip === "all" || card.dataset.vip === vip) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

async function submitPendingOrder(orderNo) {

  const token = localStorage.getItem("token");

  let pendingOrder = null;

  try {

    const res = await fetch("/my-orders", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const data = await res.json();

    pendingOrder = data.orders.find(
      o => o.orderNo === orderNo && o.status === "pending"
    );

  } catch (err) {
    alert("Failed to load order");
    return;
  }

  if (!pendingOrder) {
    alert("No pending order found");
    return;
  }

  let userBalance = 0;

  try {
    const res = await fetch("/balance", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const data = await res.json();
    userBalance = data.balance || 0;

  } catch (err) {
    alert("Balance load failed");
    return;
  }

  if (userBalance < pendingOrder.orderAmount) {
    const shortage = (pendingOrder.orderAmount - userBalance).toFixed(4);
    alert(`Your account balance is not enough, you need to recharge ${shortage} to complete this order`);
    return;
  }

  try {
    const res = await fetch("/add-commission", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        orderAmount: pendingOrder.orderAmount,
        commission: pendingOrder.commission
      })
    });

    const data = await res.json();

    if (data.success) {

      await fetch("/complete-order", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token
  },
  body: JSON.stringify({
    orderNo: pendingOrder.orderNo
  })
});

      renderOrders();
      localStorage.setItem("recordTab", "complete");
      switchTab("complete");
      loadBalance();

      alert("Order submitted successfully");

    } else {
      alert(data.msg || "Submit failed");
    }

  } catch (err) {
    console.log(err);
    alert("Server error");
  }
}


async function renderOrders() {

  const username = localStorage.getItem("username");

  const token = localStorage.getItem("token");

const res = await fetch("/my-orders", {
  headers: {
    Authorization: "Bearer " + token
  }
});

const data = await res.json();

const orders = data.orders || [];

const pendingAmazon = orders.find(
  o => o.type === "Amazon" && o.status === "pending"
);

const pendingAlibaba = orders.find(
  o => o.type === "Alibaba" && o.status === "pending"
);

const pendingAliExpress = orders.find(
  o => o.type === "AliExpress" && o.status === "pending"
);

const completeAmazon = orders.filter(
  o => o.type === "Amazon" && o.status === "complete"
);

const completeAlibaba = orders.filter(
  o => o.type === "Alibaba" && o.status === "complete"
);

const completeAliExpress = orders.filter(
  o => o.type === "AliExpress" && o.status === "complete"
);
  const incompleteTab = document.getElementById("incompleteTab");
  const completeTab = document.getElementById("completeTab");

  incompleteTab.innerHTML = "";
  completeTab.innerHTML = "";


  function createPendingHTML(order, tag) {
    let productsHTML = "";

    order.products.forEach(product => {
      productsHTML += `
        <div class="product-box">
          <img src="${product.image}" class="product-img">
          <div class="product-details">
            <div class="product-name">${product.name}</div>
            <div class="product-price-row">
              <span>${product.price.toFixed(2)} USDT</span>
              <span>x${product.qty}</span>
            </div>
          </div>
        </div>
      `;
    });

    return `
      <div class="popup-overlay" style="display:flex;">
        <div class="order-popup">

          <div class="popup-header">
            <span>${tag} Order</span>
          </div>

          <div class="order-number">
            Order Nos: ${order.orderNo}
          </div>

          ${productsHTML}

          <div class="order-info">
            <p><span>Transaction time</span><span>${order.trxTime}</span></p>
            <p><span>Order amount</span><span>${order.orderAmount.toFixed(2)} USDT</span></p>
            <p><span>Commissions</span><span>${order.commission.toFixed(4)} USDT</span></p>
            <p class="income-row">
              <span>Expected income</span>
              <span class="income">
                ${(order.orderAmount + order.commission).toFixed(4)} USDT
              </span>
            </p>
          </div>

          <button class="submit-btn" onclick="submitPendingOrder('${order.orderNo}')">
            Submit order
          </button>

        </div>
      </div>
    `;
  }

  if (!pendingAmazon && !pendingAlibaba && !pendingAliExpress) {
    incompleteTab.innerHTML = `<div class="empty">No incomplete order</div>`;
  }

  if (pendingAmazon) {
    incompleteTab.innerHTML += createPendingHTML(pendingAmazon, "Amazon");
  }

  if (pendingAlibaba) {
    incompleteTab.innerHTML += createPendingHTML(pendingAlibaba, "Alibaba");
  }

  if (pendingAliExpress) {
    incompleteTab.innerHTML += createPendingHTML(pendingAliExpress, "AliExpress");
  }


  const allComplete = [
    ...completeAmazon.map(o => ({...o, tag:"Amazon"})),
    ...completeAlibaba.map(o => ({...o, tag:"Alibaba"})),
    ...completeAliExpress.map(o => ({...o, tag:"AliExpress"}))
  ];

  if (allComplete.length === 0) {
    completeTab.innerHTML = `<div class="empty">No completed orders</div>`;
  } else {

    allComplete.forEach(order => {

      let productsHTML = "";

      order.products.forEach(product => {
        productsHTML += `
          <div class="product-box">
            <img src="${product.image}" class="product-img">
            <div class="product-details">
              <div class="product-name">${product.name}</div>
              <div class="product-price-row">
                <span>${product.price.toFixed(2)} USDT</span>
                <span>x${product.qty}</span>
              </div>
            </div>
          </div>
        `;
      });

      completeTab.innerHTML += `
        <div class="order-popup" style="margin-bottom:20px;">

          <div class="popup-header">
            <span>${order.tag} Completed</span>
          </div>

          <div class="order-number">
            Order Nos: ${order.orderNo}
          </div>

          ${productsHTML}

          <div class="order-info">
            <p><span>Order amount</span><span>${order.orderAmount.toFixed(2)} USDT</span></p>
            <p><span>Commissions</span><span>${order.commission.toFixed(4)} USDT</span></p>
            <p class="income-row">
              <span>Total</span>
              <span class="income">
                ${(order.orderAmount + order.commission).toFixed(4)} USDT
              </span>
            </p>
          </div>

          <button class="submit-btn" style="background:green;">
            Completed
          </button>

        </div>
      `;
    });
  }
}

function showMessage(text) {

  const alertBox = document.getElementById("customAlert");

  alertBox.innerText = text;

  alertBox.style.display = "block";

  setTimeout(() => {
    alertBox.style.display = "none";
  }, 3000);

}

function setActiveNav() {
  const currentPage = window.location.pathname.split("/").pop();

  document.querySelectorAll(".nav-item").forEach(item => {
    if (item.getAttribute("data-page") === currentPage) {
      item.classList.add("active");
    }
  });
}