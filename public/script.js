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

function loadUsername() {
  const name = localStorage.getItem("username");

  const el = document.getElementById("usernameDisplay");
  if (el && name) {
    el.innerHTML = name + ' <span class="vip">VIP0</span>';
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "login.html";
}

function goPage(page) {
  window.location.href = page;
}

function goRegister() {
  window.location.href = "register.html";
}

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

window.addEventListener("load", function () {

  loadBalance();
  loadUsername();

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

function filterCards(vip, btn) {
  const cards = document.querySelectorAll(".menu-card");
  const tabs = document.querySelectorAll(".tab");

  tabs.forEach(tab => tab.classList.remove("active"));

  if (btn) {
    btn.classList.add("active");
  }

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

  const t = window.recordLanguage || {};
  showMessage(
    t.failedToLoadOrder || "Failed to load order"
  );
  return;
}

if (!pendingOrder) {
  const t = window.recordLanguage || {};

  showMessage(
    t.noPendingOrder || "No pending order found"
  );
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
  const t = window.recordLanguage || {};
  showMessage(
    t.balanceLoadFailed || "Balance load failed"
  );
  return;
}

if (userBalance < pendingOrder.orderAmount) {
  const t = window.recordLanguage || {};
  const shortage =
    (pendingOrder.orderAmount - userBalance).toFixed(4);
  showMessage(
    (t.balanceNotEnough ||
      "Your account balance is not enough, you need to recharge {amount} to complete this order."
    ).replace("{amount}", shortage)
  );
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

  const t = window.recordLanguage || {};
  showMessage(
    t.orderSubmitted || "Order submitted successfully"
  );
} else {

  const t = window.recordLanguage || {};
  showMessage(
    data.msg ||
    t.submitFailed ||
    "Submit failed"
  );
}

} catch (err) {
  console.log(err);
  const t = window.recordLanguage || {};
  showMessage(
    t.serverError || "Server error"
  );
}
}

async function renderOrders() {
  const t = window.recordLanguage || {};
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
           <span>${tag} ${t.order}</span>
          </div>

          <div class="order-number">
           ${t.orderNos}: ${order.orderNo}
          </div>

          ${productsHTML}

          <div class="order-info">

  <p>
    <span>${t.transactionTime}</span>
    <span>${order.trxTime}</span>
  </p>

  <p>
    <span>${t.orderAmount}</span>
    <span>${order.orderAmount.toFixed(2)} USDT</span>
  </p>

  <p>
    <span>${t.commissions}</span>
    <span>${order.commission.toFixed(4)} USDT</span>
  </p>

  <p class="income-row">
    <span>${t.expectedIncome}</span>
    <span class="income">
      ${(order.orderAmount + order.commission).toFixed(4)} USDT
    </span>
  </p>

</div>

<button
  class="submit-btn"
  onclick="submitPendingOrder('${order.orderNo}')"
>
  ${t.submitOrder}
</button>

        </div>
      </div>
    `;
  }

  if (!pendingAmazon && !pendingAlibaba && !pendingAliExpress) {
    incompleteTab.innerHTML = `<div class="empty">${t.noIncompleteOrder}</div>`;
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
    completeTab.innerHTML = `<div class="empty">${t.noCompletedOrders}</div>`;
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
            <span>${order.tag} ${t.completed}</span>
          </div>

          <div class="order-number">
            ${t.orderNos}: ${order.orderNo}
          </div>

          ${productsHTML}

          <div class="order-info">
            <p>
  <span>${t.orderAmount}</span>
  <span>${order.orderAmount.toFixed(2)} USDT</span>
</p>

<p>
  <span>${t.commissions}</span>
  <span>${order.commission.toFixed(4)} USDT</span>
</p>

<p class="income-row">
  <span>${t.total}</span>
  <span class="income">
    ${(order.orderAmount + order.commission).toFixed(4)} USDT
  </span>
</p>
          </div>

          <button class="submit-btn" style="background:green;">
            ${t.completed}
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

(function checkLoginSession() {
  const token = localStorage.getItem("token");
  if (!token) {
    return;
  }

  async function verifyCurrentSession() {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      return;
    }

    try {
      const res = await fetch("/session-check", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + currentToken
        }
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("inviteCode");
        window.location.href = "/login.html";
      }

    } catch (err) {
      console.log("Session check error:", err);
    }
  }

  verifyCurrentSession();
  setInterval(verifyCurrentSession, 5000);

})();