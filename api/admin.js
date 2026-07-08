const express = require("express");
const { authRequired, roleRequired } = require("../src/auth");
const { readJson, writeJson, uid } = require("../src/store");
const { getTopicById, searchTopics } = require("../src/syllabus");
const { askAI, generateBloomQuestions, gradeBloomAnswers } = require("../src/ai");
const { dueDates, progressSymbol, average } = require("../src/helpers");

const router = express.Router();

router.use(authRequired, roleRequired("admin", "organizer"));

function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function getActiveUsers() {
  return readJson("users", []).filter((u) => u.status === "active");
}

router.get("/users", (req, res) => {
  const classNo = req.query.classNo || "";
  const role = req.query.role || "";
  let users = getActiveUsers();
  if (classNo) users = users.filter((u) => String(u.profile?.classNo || "") === String(classNo));
  if (role) users = users.filter((u) => u.role === role);
  res.json({ users: users.map(safeUser) });
});

router.get("/broadcasts", (req, res) => {
  const broadcasts = readJson("broadcasts", []);
  res.json({ broadcasts });
});

router.post("/aim", async (req, res) => {
  try {
    const { topicId, classNo, question } = req.body || {};
    const topic = topicId ? getTopicById(topicId) : searchTopics({ classNo, query: question })[0];
    if (!topic) return res.status(404).json({ error: "Topic not found" });

    const answer = await askAI({
      topic,
      question: question || `What is the aim of ${topic.title}?`,
      mode: "aim",
      profile: { classNo, age: "" , bloomScore: 0, language: "English" },
      studyText: `${topic.title}\n${topic.aim || ""}\n${topic.content || ""}`
    });

    res.json({ topic, answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/broadcast", (req, res) => {
  const { topicId, classNo, subject, adminId, aiAnswer, editedAnswer, title } = req.body || {};
  const topic = topicId ? getTopicById(topicId) : null;

  if (!classNo || !subject || !title) {
    return res.status(400).json({ error: "classNo, subject, title required" });
  }

  const broadcasts = readJson("broadcasts", []);
  const row = {
    id: uid("bcast"),
    topicId: topic?.id || topicId || "",
    classNo,
    subject,
    title,
    adminId: adminId || req.auth.sub,
    aiAnswer: aiAnswer || "",
    editedAnswer: editedAnswer || aiAnswer || "",
    broadcastDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString()
  };
  broadcasts.unshift(row);
  writeJson("broadcasts", broadcasts);
  res.json({ broadcast: row });
});

router.get("/reminders", (req, res) => {
  const broadcasts = readJson("broadcasts", []);
  const reminders = [];
  for (const b of broadcasts) {
    for (const d of dueDates(b.broadcastDate)) {
      reminders.push({
        broadcastId: b.id,
        topicId: b.topicId,
        classNo: b.classNo,
        subject: b.subject,
        title: b.title,
        dueDate: d
      });
    }
  }
  res.json({ reminders });
});

router.post("/generate-evaluation", async (req, res) => {
  try {
    const { broadcastId, userId = "" } = req.body || {};
    const broadcasts = readJson("broadcasts", []);
    const broadcast = broadcasts.find((b) => b.id === broadcastId);
    if (!broadcast) return res.status(404).json({ error: "Broadcast not found" });

    const topic = getTopicById(broadcast.topicId);
    if (!topic) return res.status(404).json({ error: "Topic not found" });

    const users = readJson("users", []);
    const user = userId ? users.find((u) => u.id === userId) : null;

    const result = await generateBloomQuestions({
      topic,
      profile: {
        classNo: user?.profile?.classNo || broadcast.classNo,
        age: user?.profile?.age || ""
      }
    });

    const evaluations = readJson("evaluations", []);
    const row = {
      id: uid("eval"),
      broadcastId,
      topicId: topic.id,
      classNo: broadcast.classNo,
      subject: broadcast.subject,
      adminId: broadcast.adminId,
      userId: userId || "",
      questionSet: result.questions || [],
      answers: [],
      scores: [],
      topicScore: 0,
      bloomScore: 0,
      level: "Pending",
      progressSymbol: "Sideways",
      dueDates: dueDates(broadcast.broadcastDate),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    evaluations.unshift(row);
    writeJson("evaluations", evaluations);

    res.json({ evaluation: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/grade-evaluation", async (req, res) => {
  try {
    const { evaluationId, answers } = req.body || {};
    const evaluations = readJson("evaluations", []);
    const idx = evaluations.findIndex((e) => e.id === evaluationId);
    if (idx < 0) return res.status(404).json({ error: "Evaluation not found" });

    const evaluation = evaluations[idx];
    const broadcast = readJson("broadcasts", []).find((b) => b.id === evaluation.broadcastId);
    const topic = broadcast ? getTopicById(broadcast.topicId) : null;
    const user = readJson("users", []).find((u) => u.id === evaluation.userId);

    const grade = await gradeBloomAnswers({
      topic,
      questions: evaluation.questionSet,
      answers,
      profile: {
        classNo: user?.profile?.classNo || evaluation.classNo,
        age: user?.profile?.age || "",
        bloomScore: user?.bloomScore || 0
      }
    });

    evaluation.answers = answers || [];
    evaluation.scores = grade.perQuestionScores || [];
    evaluation.topicScore = grade.topicScore || 0;
    evaluation.bloomScore = grade.topicScore || 0;
    evaluation.level = grade.level || "Low";
    evaluation.updatedAt = new Date().toISOString();

    // update user
    if (user) {
      user.bloomScores = user.bloomScores || { d3: 0, d7: 0, d21: 0 };
      const dueIndex = evaluation.dueDates.findIndex((d) => d === new Date().toISOString().slice(0, 10));
      if (dueIndex === 0) user.bloomScores.d3 = evaluation.bloomScore;
      else if (dueIndex === 1) user.bloomScores.d7 = evaluation.bloomScore;
      else if (dueIndex === 2) user.bloomScores.d21 = evaluation.bloomScore;

      const vals = [user.bloomScores.d3, user.bloomScores.d7, user.bloomScores.d21].filter((n) => Number(n) > 0);
      user.bloomScore = average(vals);
      user.progressSymbol = progressSymbol([user.bloomScores.d3, user.bloomScores.d7, user.bloomScores.d21]);
      user.bloomLevel = grade.level || user.bloomLevel || "Unknown";
      user.updatedAt = new Date().toISOString();

      const allUsers = readJson("users", []);
      const uIdx = allUsers.findIndex((u) => u.id === user.id);
      if (uIdx >= 0) {
        allUsers[uIdx] = user;
        writeJson("users", allUsers);
      }
    }

    evaluations[idx] = evaluation;
    writeJson("evaluations", evaluations);

    res.json({ evaluation, grade, updatedUser: user || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/report/:year", (req, res) => {
  const year = String(req.params.year);
  const evaluations = readJson("evaluations", []);
  const broadcasts = readJson("broadcasts", []);
  const users = readJson("users", []);

  const yearEvals = evaluations.filter((e) => new Date(e.createdAt).getFullYear() === Number(year));
  const byAdmin = {};

  for (const e of yearEvals) {
    const broadcast = broadcasts.find((b) => b.id === e.broadcastId);
    const adminId = broadcast?.adminId || e.adminId || "unknown";
    if (!byAdmin[adminId]) {
      byAdmin[adminId] = {
        adminId,
        totalUpward: 0,
        totalDownward: 0,
        totalSideways: 0,
        topics: {}
      };
    }

    const user = users.find((u) => u.id === e.userId);
    const symbol = user?.progressSymbol || e.progressSymbol || "Sideways";
    if (symbol === "Upward") byAdmin[adminId].totalUpward += 1;
    else if (symbol === "Downward") byAdmin[adminId].totalDownward += 1;
    else byAdmin[adminId].totalSideways += 1;

    const topicTitle = broadcast?.title || e.topicId || "Unknown topic";
    if (!byAdmin[adminId].topics[topicTitle]) {
      byAdmin[adminId].topics[topicTitle] = { Upward: 0, Downward: 0, Sideways: 0 };
    }
    byAdmin[adminId].topics[topicTitle][symbol] += 1;
  }

  res.json({ year, report: Object.values(byAdmin) });
});

module.exports = router;
