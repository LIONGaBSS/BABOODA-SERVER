const express = require("express");
const { authMiddleware } = require("../src/auth");
const { getTopicById, searchTopics } = require("../src/syllabus");
const { askAI, generateBloomQuestions, gradeAnswer } = require("../src/ai");
const {
  addConversation,
  addAssessment,
  addQuestion,
  getAssessments,
  getUsers,
  upsertUser
} = require("../src/db");

const router = express.Router();

function buildContextText(topic, query = "") {
  const items = [
    `Title: ${topic?.title || ""}`,
    `Aim: ${topic?.aim || ""}`,
    `Content: ${topic?.content || ""}`,
    `Keywords: ${(topic?.keywords || []).join(", ")}`
  ];

  if (query) items.push(`User question: ${query}`);
  return items.filter(Boolean).join("\n");
}

router.post("/ask", authMiddleware, async (req, res) => {
  try {
    const { question, topicId, classNo, mode = "general" } = req.body || {};

    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }

    let topic = topicId ? getTopicById(topicId) : null;

    if (!topic && classNo) {
      const matches = searchTopics({ classNo, query: question });
      topic = matches[0] || null;
    }

    if (!topic) {
      return res.status(404).json({ error: "No matching syllabus topic found" });
    }

    const profile = {
      classLevel: req.user.classLevel,
      age: req.user.age,
      bloomScore: req.user.bloomScore,
      bloomLevel: req.user.bloomLevel,
      readingLevel: req.user.readingLevel,
      language: req.user.language,
      preferredTone: req.user.preferredTone
    };

    const contextText = buildContextText(topic, question);
    const answer = await askAI({ topic, question, mode, profile, contextText });

    addConversation({
      id: `conv_${Date.now()}`,
      userId: req.user.id,
      topicId: topic.id,
      question,
      mode,
      answer,
      createdAt: new Date().toISOString()
    });

    res.json({ topic, answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/ask", authMiddleware, async (req, res) => {
  try {
    const { topicId, question, mode = "aim", targetUserId = null } = req.body || {};
    const topic = getTopicById(topicId);

    if (!topic) return res.status(404).json({ error: "Topic not found" });
    if (!question) return res.status(400).json({ error: "question is required" });

    const targetUser = targetUserId
      ? getUsers().find((u) => u.id === targetUserId)
      : req.user;

    if (!targetUser) return res.status(404).json({ error: "User not found" });

    const profile = {
      classLevel: targetUser.classLevel,
      age: targetUser.age,
      bloomScore: targetUser.bloomScore,
      bloomLevel: targetUser.bloomLevel,
      readingLevel: targetUser.readingLevel,
      language: targetUser.language,
      preferredTone: targetUser.preferredTone
    };

    const answer = await askAI({
      topic,
      question,
      mode,
      profile,
      contextText: buildContextText(topic, question)
    });

    res.json({ topic, user: targetUser, answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/generate-bloom", authMiddleware, async (req, res) => {
  try {
    const { topicId, userId = null } = req.body || {};
    const topic = getTopicById(topicId);

    if (!topic) return res.status(404).json({ error: "Topic not found" });

    const users = getUsers();
    const targetUser = userId ? users.find((u) => u.id === userId) : req.user;
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    const result = await generateBloomQuestions({
      topic,
      profile: {
        classLevel: targetUser.classLevel,
        age: targetUser.age,
        bloomScore: targetUser.bloomScore,
        readingLevel: targetUser.readingLevel
      }
    });

    const assessment = {
      id: `assess_${Date.now()}`,
      userId: targetUser.id,
      topicId: topic.id,
      topicTitle: topic.title,
      questions: result.questions || [],
      raw: result,
      createdAt: new Date().toISOString()
    };

    addAssessment(assessment);

    for (const q of assessment.questions) {
      addQuestion({
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        assessmentId: assessment.id,
        userId: targetUser.id,
        topicId: topic.id,
        bloomLevel: q.bloomLevel || "",
        question: q.question || "",
        hint: q.hint || "",
        createdAt: new Date().toISOString()
      });
    }

    res.json({ assessment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/grade-answer", authMiddleware, async (req, res) => {
  try {
    const { question, answer, topicId, userId = null } = req.body || {};
    const topic = getTopicById(topicId);
    if (!topic) return res.status(404).json({ error: "Topic not found" });
    if (!question || !answer) {
      return res.status(400).json({ error: "question and answer are required" });
    }

    const users = getUsers();
    const targetUser = userId ? users.find((u) => u.id === userId) : req.user;
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    const result = await gradeAnswer({
      question,
      answer,
      topic,
      profile: {
        classLevel: targetUser.classLevel,
        age: targetUser.age,
        bloomScore: targetUser.bloomScore
      }
    });

    const nextScore = Number(result.score || 0);
    targetUser.bloomScore = Math.round((Number(targetUser.bloomScore || 0) + nextScore) / 2);
    targetUser.bloomLevel = result.level || targetUser.bloomLevel || "Unknown";
    targetUser.depthNotes = result.feedback || targetUser.depthNotes || "";
    targetUser.updatedAt = new Date().toISOString();
    upsertUser(targetUser);

    res.json({
      grading: result,
      updatedUser: targetUser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/history", authMiddleware, (req, res) => {
  try {
    const { getConversations } = require("../src/db");
    const rows = getConversations().filter((row) => row.userId === req.user.id);
    res.json({ history: rows.slice(0, 100) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
