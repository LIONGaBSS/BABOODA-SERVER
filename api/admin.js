const express = require("express");
const bcrypt = require("bcryptjs");
const { authMiddleware, adminOnly } = require("../src/auth");
const {
  getUsers,
  upsertUser,
  getAssessments
} = require("../src/db");

const router = express.Router();

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

router.use(authMiddleware);
router.use(adminOnly);

router.get("/users", (req, res) => {
  res.json({ users: getUsers().map(publicUser) });
});

router.post("/users", async (req, res) => {
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
      bloomScore = 0,
      bloomLevel = "Unknown",
      learningGoal = "",
      weakTopics = "",
      preferredTone = "simple",
      depthNotes = ""
    } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, password required" });
    }

    const exists = getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) return res.status(409).json({ error: "Email already exists" });

    const user = {
      id: `user_${Date.now()}`,
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: role === "admin" ? "admin" : "user",
      age,
      classLevel,
      board,
      subjectLevel,
      language,
      readingLevel,
      bloomScore: Number(bloomScore || 0),
      bloomLevel,
      learningGoal,
      weakTopics,
      preferredTone,
      depthNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    upsertUser(user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const users = getUsers();
    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const body = req.body || {};
    const fields = [
      "name",
      "email",
      "role",
      "age",
      "classLevel",
      "board",
      "subjectLevel",
      "language",
      "readingLevel",
      "learningGoal",
      "weakTopics",
      "preferredTone",
      "depthNotes",
      "bloomLevel"
    ];

    for (const key of fields) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        user[key] = body[key];
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "bloomScore")) {
      user.bloomScore = Number(body.bloomScore || 0);
    }

    user.updatedAt = new Date().toISOString();
    upsertUser(user);

    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/assessments", (req, res) => {
  const userId = req.query.userId || null;
  const rows = getAssessments().filter((a) => (userId ? a.userId === userId : true));
  res.json({ assessments: rows });
});

module.exports = router;
