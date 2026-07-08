const express = require("express");
const { authRequired, roleRequired } = require("../src/auth");
const { readJson, writeJson, uid } = require("../src/store");
const { getTopicById } = require("../src/syllabus");
const { askAI } = require("../src/ai");
const { dueDates, progressSymbol } = require("../src/helpers");

const router = express.Router();

router.use(authRequired, roleRequired("user", "admin", "organizer"));

function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

router.get("/feed", (req, res) => {
  const user = readJson("users", []).find((u) => u.id === req.auth.sub);
  if (!user) return res.status(404).json({ error: "User not found" });

  const broadcasts = readJson("broadcasts", [])
    .filter((b) => String(b.classNo) === String(user.profile?.classNo || ""));

  const evaluations = readJson("evaluations", []).filter((e) => e.userId === user.id);

  const reminders = broadcasts.flatMap((b) =>
    dueDates(b.broadcastDate).map((d) => ({
      broadcastId: b.id,
      topicId: b.topicId,
      title: b.title,
      classNo: b.classNo,
      subject: b.subject,
      dueDate: d
    }))
  );

  res.json({ user: safeUser(user), broadcasts, reminders, evaluations });
});

router.post("/ask", async (req, res) => {
  try {
    const { topicId, question, mode } = req.body || {};
    const topic = getTopicById(topicId);
    if (!topic) return res.status(404).json({ error: "Topic not found" });
    if (!question) return res.status(400).json({ error: "question is required" });

    const user = readJson("users", []).find((u) => u.id === req.auth.sub);
    if (!user) return res.status(404).json({ error: "User not found" });

    const answer = await askAI({
      topic,
      question,
      mode,
      profile: {
        classNo: user.profile?.classNo || "",
        age: user.profile?.age || "",
        bloomScore: user.bloomScore || 0,
        readingLevel: user.profile?.subject || "",
        language: "English"
      },
      studyText: `${topic.title}\n${topic.aim || ""}\n${topic.content || ""}`
    });

    res.json({ topic, answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/evaluations", (req, res) => {
  const user = readJson("users", []).find((u) => u.id === req.auth.sub);
  if (!user) return res.status(404).json({ error: "User not found" });

  const evaluations = readJson("evaluations", []).filter((e) => e.userId === user.id);
  res.json({ evaluations });
});

router.post("/submit-evaluation", (req, res) => {
  const { evaluationId, answers } = req.body || {};
  const evaluations = readJson("evaluations", []);
  const idx = evaluations.findIndex((e) => e.id === evaluationId);
  if (idx < 0) return res.status(404).json({ error: "Evaluation not found" });

  const evaluation = evaluations[idx];
  if (evaluation.userId !== req.auth.sub) {
    return res.status(403).json({ error: "This evaluation is not assigned to you" });
  }

  evaluation.answers = answers || [];
  evaluation.updatedAt = new Date().toISOString();
  evaluations[idx] = evaluation;
  writeJson("evaluations", evaluations);

  res.json({ evaluation });
});

router.post("/update-progress", (req, res) => {
  const { d3 = 0, d7 = 0, d21 = 0 } = req.body || {};
  const users = readJson("users", []);
  const idx = users.findIndex((u) => u.id === req.auth.sub);
  if (idx < 0) return res.status(404).json({ error: "User not found" });

  const user = users[idx];
  user.bloomScores = { d3: Number(d3), d7: Number(d7), d21: Number(d21) };
  const vals = [user.bloomScores.d3, user.bloomScores.d7, user.bloomScores.d21].filter((n) => n > 0);
  user.bloomScore = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  user.progressSymbol = progressSymbol([d3, d7, d21]);
  user.updatedAt = new Date().toISOString();
  users[idx] = user;
  writeJson("users", users);
  res.json({ user: safeUser(user) });
});

module.exports = router;
