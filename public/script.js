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

/* ---------------- LOAD BALANCE ---------------- */
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

    const el = document.getElementById("balance");
    if (el) {
      el.innerText = (data.balance || 0) + " USDT";
    }
  } catch {
    console.log("Balance load failed");
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

/* ---------------- ON LOAD ---------------- */
window.addEventListener("load", function () {
  loadBalance();
  loadUsername();
  applyLanguage();

  let times = parseInt(localStorage.getItem("todayTimes")) || 0;
  let totalCommission = parseFloat(localStorage.getItem("todayCommission")) || 0;
  let yesterdayCommission = parseFloat(localStorage.getItem("yesterdayCommission")) || 0;

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

async function submitPendingOrder(tag) {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  const pendingAmazon = JSON.parse(localStorage.getItem(`pendingAmazonOrder_${username}`));
  const pendingAlibaba = JSON.parse(localStorage.getItem(`pendingAlibabaOrder_${username}`));
  const pendingAliExpress = JSON.parse(localStorage.getItem(`pendingAliExpressOrder_${username}`));

  let pendingOrder = null;

  if (tag === "Amazon") {
    pendingOrder = pendingAmazon;
  } else if (tag === "Alibaba") {
    pendingOrder = pendingAlibaba;
  } else if (tag === "AliExpress") {
    pendingOrder = pendingAliExpress;
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

      let completeOrders;

      if (tag === "Amazon") {
        completeOrders = JSON.parse(localStorage.getItem(`completeOrders_${username}`)) || [];
        completeOrders.unshift(pendingOrder);

        localStorage.setItem(`completeOrders_${username}`, JSON.stringify(completeOrders));
        localStorage.removeItem(`pendingAmazonOrder_${username}`);
      }

      else if (tag === "Alibaba") {
        completeOrders = JSON.parse(localStorage.getItem(`completeOrders_alibaba_${username}`)) || [];
        completeOrders.unshift(pendingOrder);

        localStorage.setItem(`completeOrders_alibaba_${username}`, JSON.stringify(completeOrders));
        localStorage.removeItem(`pendingAlibabaOrder_${username}`);
      }

      else if (tag === "AliExpress") {
        completeOrders = JSON.parse(localStorage.getItem(`completeOrders_aliexpress_${username}`)) || [];
        completeOrders.unshift(pendingOrder);

        localStorage.setItem(`completeOrders_aliexpress_${username}`, JSON.stringify(completeOrders));
        localStorage.removeItem(`pendingAliExpressOrder_${username}`);
      }

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


function renderOrders() {

  const username = localStorage.getItem("username");

  const pendingAmazon = JSON.parse(localStorage.getItem(`pendingAmazonOrder_${username}`));
  const pendingAlibaba = JSON.parse(localStorage.getItem(`pendingAlibabaOrder_${username}`));
  const pendingAliExpress = JSON.parse(localStorage.getItem(`pendingAliExpressOrder_${username}`));

  const completeAmazon = JSON.parse(localStorage.getItem(`completeOrders_${username}`)) || [];
  const completeAlibaba = JSON.parse(localStorage.getItem(`completeOrders_alibaba_${username}`)) || [];
  const completeAliExpress = JSON.parse(localStorage.getItem(`completeOrders_aliexpress_${username}`)) || [];

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

          <button class="submit-btn" onclick="submitPendingOrder('${tag}')">
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