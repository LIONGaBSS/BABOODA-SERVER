const express = require("express");
const bcrypt = require("bcryptjs");
const { authRequired } = require("../src/auth");
const { readJson, writeJson, uid } = require("../src/store");
const { hashPassword, comparePassword, signToken } = require("../src/auth");

const router = express.Router();

function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function countActive(role) {
  return readJson("users", []).filter((u) => u.role === role && u.status === "active").length;
}

function validateRoleLimit(role) {
  if (role === "organizer" && countActive("organizer") >= 5) return "Maximum 5 organizers allowed";
  if (role === "admin" && countActive("admin") >= 50) return "Maximum 50 admins allowed";
  if (role === "user" && countActive("user") >= 1000) return "Maximum 1000 users allowed";
  return null;
}

function checkWhitelist(role, organizationId) {
  const whitelist = readJson("whitelist", { organizerIds: [], adminIds: [], studentIds: [] });
  if (role === "organizer") return whitelist.organizerIds.includes(organizationId);
  if (role === "admin") return whitelist.adminIds.includes(organizationId);
  if (role === "user") return whitelist.studentIds.includes(organizationId);
  return false;
}

router.post("/register", async (req, res) => {
  try {
    const {
      role,
      organizationId,
      password,
      name,
      age = "",
      classNo = "",
      subject = "",
      designation = "",
      discipline = "",
      school = "",
      department = "",
      address = "",
      phone = "",
      email = "",
      extra1 = "",
      extra2 = "",
      extra3 = "",
      extra4 = "",
      extra5 = "",
      extra6 = "",
      extra7 = "",
      extra8 = "",
      extra9 = ""
    } = req.body || {};

    if (!role || !organizationId || !password || !name) {
      return res.status(400).json({ error: "role, organizationId, password, name are required" });
    }

    if (!["organizer", "admin", "user"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const limitMsg = validateRoleLimit(role);
    if (limitMsg) return res.status(400).json({ error: limitMsg });

    if (!checkWhitelist(role, organizationId)) {
      return res.status(403).json({ error: "This organization ID is not approved for this role" });
    }

    const users = readJson("users", []);
    const existing = users.find(
      (u) => u.role === role && u.organizationId === organizationId && u.status === "active"
    );
    if (existing) return res.status(409).json({ error: "This ID is already registered" });

    const user = {
      id: uid(role),
      role,
      organizationId,
      passwordHash: await hashPassword(password),
      name,
      status: "active",
      profile: {
        age,
        classNo,
        subject,
        designation,
        discipline,
        school,
        department,
        address,
        phone,
        email,
        extra1,
        extra2,
        extra3,
        extra4,
        extra5,
        extra6,
        extra7,
        extra8,
        extra9
      },
      bloomScores: { d3: 0, d7: 0, d21: 0 },
      bloomScore: 0,
      bloomLevel: "Unknown",
      progressSymbol: "Sideways",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(user);
    writeJson("users", users);

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { role, organizationId, password } = req.body || {};
    if (!role || !organizationId || !password) {
      return res.status(400).json({ error: "role, organizationId, password are required" });
    }

    const users = readJson("users", []);
    const user = users.find(
      (u) => u.role === role && u.organizationId === organizationId && u.status === "active"
    );
    if (!user) return res.status(401).json({ error: "Invalid login" });

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid login" });

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/me", authRequired, (req, res) => {
  const users = readJson("users", []);
  const user = users.find((u) => u.id === req.auth.sub);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: safeUser(user) });
});

router.put("/me", authRequired, (req, res) => {
  const users = readJson("users", []);
  const idx = users.findIndex((u) => u.id === req.auth.sub);
  if (idx < 0) return res.status(404).json({ error: "User not found" });

  const user = users[idx];
  const body = req.body || {};

  if (body.name !== undefined) user.name = body.name;

  const allowedProfileKeys = [
    "age","classNo","subject","designation","discipline","school","department",
    "address","phone","email","extra1","extra2","extra3","extra4","extra5",
    "extra6","extra7","extra8","extra9"
  ];

  for (const key of allowedProfileKeys) {
    if (body[key] !== undefined) user.profile[key] = body[key];
  }

  user.updatedAt = new Date().toISOString();
  users[idx] = user;
  writeJson("users", users);

  res.json({ user: safeUser(user) });
});

module.exports = router;
