const express = require("express");
const { authMiddleware, signToken, comparePassword, hashPassword } = require("../src/auth");
const { findUserByEmail, findUserById, upsertUser } = require("../src/db");

const router = express.Router();

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = "user",
      age = "",
      classLevel = "",
      board = "",
      subjectLevel = "",
      language = "English",
      readingLevel = "",
      learningGoal = "",
      weakTopics = "",
      preferredTone = "simple",
      depthNotes = ""
    } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }

    const existing = findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await hashPassword(password);

    const user = {
      id: `user_${Date.now()}`,
      name,
      email,
      passwordHash,
      role: role === "admin" ? "admin" : "user",
      age,
      classLevel,
      board,
      subjectLevel,
      language,
      readingLevel,
      bloomScore: 0,
      bloomLevel: "Unknown",
      learningGoal,
      weakTopics,
      preferredTone,
      depthNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    upsertUser(user);

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = findUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.put("/me", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body || {};

    const allowed = [
      "name",
      "age",
      "classLevel",
      "board",
      "subjectLevel",
      "language",
      "readingLevel",
      "learningGoal",
      "weakTopics",
      "preferredTone",
      "depthNotes"
    ];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        user[key] = updates[key];
      }
    }

    user.updatedAt = new Date().toISOString();
    upsertUser(user);

    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
