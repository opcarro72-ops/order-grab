require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cron = require("node-cron");

const app = express();

app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("DB Connected"))
.catch(err => console.log("DB Error:", err));

/* ---------------- USER MODEL ---------------- */
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true
  },

  password: String,

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
  }
});

const User = mongoose.model("User", userSchema);

/* ---------------- DEPOSIT MODEL ---------------- */
const depositSchema = new mongoose.Schema({
  username: String,
  amount: Number,
  approvedAmount: { type: Number, default: 0 },
  status: { type: String, default: "Pending" },
  time: { type: Date, default: Date.now }
});
const Deposit = mongoose.model("Deposit", depositSchema);

/* ---------------- WITHDRAW MODEL ---------------- */
const withdrawSchema = new mongoose.Schema({
  username: String,
  amount: Number,
  approvedAmount: { type: Number, default: 0 },
  status: { type: String, default: "Processing" },
  time: { type: Date, default: Date.now }
});
const Withdraw = mongoose.model("Withdraw", withdrawSchema);

/* ---------------- TOKEN VERIFY ---------------- */
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

/* ---------------- ADMIN VERIFY ---------------- */
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

/* ---------------- USER REGISTER ---------------- */
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({
        success: false,
        msg: "Username and password required"
      });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.json({
        success: false,
        msg: "Username already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashedPassword,
      balance: 0
    });

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

/* ---------------- USER LOGIN ---------------- */
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
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      username: user.username
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      msg: err.message
    });
  }
});


/* ---------------- ADMIN MODEL ---------------- */
const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
});

const Admin = mongoose.model("Admin", adminSchema);


/* ---------------- ADMIN LOGIN ---------------- */
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

/* ---------------- USER DEPOSIT REQUEST ---------------- */
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
        msg: "Previous deposit is pending"
      });
    }

    const deposit = new Deposit({
      username: user.username,
      amount
    });

    await deposit.save();

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false, msg: err.message });
  }
});

/* ---------------- USER DEPOSIT HISTORY ---------------- */
app.get("/my-deposits", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const deposits = await Deposit.find({ username: user.username }).sort({ time: -1 });
    res.json(deposits);
  } catch {
    res.json([]);
  }
});

/* ---------------- ADMIN GET DEPOSITS ---------------- */
app.get("/admin/deposits", verifyAdmin, async (req, res) => {
  const deposits = await Deposit.find().sort({ time: -1 });
  res.json(deposits);
});

/* ---------------- ADMIN APPROVE DEPOSIT ---------------- */
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

/* ---------------- USER BALANCE ---------------- */
app.get("/balance", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ balance: user.balance });
  } catch {
    res.json({ balance: 0 });
  }
});

/* ---------------- USER WITHDRAW REQUEST ---------------- */
app.post("/withdraw", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const amount = Number(req.body.amount || 0);

    if (!user) return res.json({ success: false, msg: "User not found" });
    if (amount <= 0) return res.json({ success: false, msg: "Invalid withdraw amount" });
    if (user.balance < amount) return res.json({ success: false, msg: "Not enough balance" });

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

/* ---------------- USER WITHDRAW HISTORY ---------------- */
app.get("/my-withdraws", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const withdraws = await Withdraw.find({ username: user.username }).sort({ time: -1 });
    res.json(withdraws);
  } catch {
    res.json([]);
  }
});

/* ---------------- ADMIN GET WITHDRAWS ---------------- */
app.get("/admin/withdraws", verifyAdmin, async (req, res) => {
  const withdraws = await Withdraw.find().sort({ time: -1 });
  res.json(withdraws);
});

/* ---------------- ADMIN APPROVE WITHDRAW ---------------- */
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

/* ---------------- ADMIN GET USERS ---------------- */
app.get("/admin/users", verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}, { username: 1, _id: 0 });
    res.json(users);
  } catch {
    res.json([]);
  }
});

/* ---------------- ADMIN USER STATUS ---------------- */
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
        // Task info
        todayTasks: user.todayTasks || 0,
        taskLimit: user.taskLimit || 0,

        // Commission info
        todayCommission: user.todayCommission || 0,
        yesterdayCommission: user.yesterdayCommission || 0,

        // Balance
        balance: user.balance || 0,

        // Mixed order info
        mixedOrderCount: user.mixedOrderCount || 0,
        mixedOrderPositions: user.mixedOrderPositions || [],

        // Normal commission range
        normalMinCommission: user.normalMinCommission || 1,
        normalMaxCommission: user.normalMaxCommission || 5,

        // Mixed commission ranges
        mixedOrderPercentRanges: user.mixedOrderPercentRanges || {}
      }
    });

  } catch (err) {
    res.json({
      success: false,
      msg: err.message
    });
  }
});

/* ---------------- ADMIN UPDATE BALANCE ---------------- */
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

/* ---------------- USER TASK STATUS ---------------- */
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

      // Task info
      todayTasks: user.todayTasks || 0,
      taskLimit: user.taskLimit || 0,

      // Commission info
      todayCommission: user.todayCommission || 0,
      yesterdayCommission: user.yesterdayCommission || 0,

      // Balance
      balance: user.balance || 0,

      // Mixed order info
      mixedOrderCount: user.mixedOrderCount || 0,
      mixedOrderPositions: user.mixedOrderPositions || [],

      // Normal commission range
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

// ✅ ADD THIS (FINAL)
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

/* ---------------- UK MIDNIGHT AUTO RESET ---------------- */
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

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});

/* ---------------- SERVER ---------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running...");
});