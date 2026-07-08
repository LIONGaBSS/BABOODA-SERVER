const express = require("express");
const { authRequired } = require("../src/auth");
const { getTopicById, searchTopics } = require("../src/syllabus");
const { askAI } = require("../src/ai");

const router = express.Router();

function topicText(topic) {
  if (!topic) return "";
  return [
    `Title: ${topic.title}`,
    `Aim: ${topic.aim || ""}`,
    `Content: ${topic.content || ""}`,
    `Keywords: ${(topic.keywords || []).join(", ")}`
  ].join("\n");
}

router.post("/ask", authRequired, async (req, res) => {
  try {
    const { topicId, question, mode = "general", classNo = "" } = req.body || {};
    if (!question) return res.status(400).json({ error: "question is required" });

    let topic = topicId ? getTopicById(topicId) : null;
    if (!topic && classNo) {
      const found = searchTopics({ classNo, query: question });
      topic = found[0] || null;
    }
    if (!topic) return res.status(404).json({ error: "No topic found" });

    const profile = {
      role: req.auth.role,
      classNo: req.auth.role === "user" ? req.body.classNo || "" : req.body.classNo || "",
      age: req.body.age || "",
      bloomScore: req.body.bloomScore || 0,
      readingLevel: req.body.readingLevel || "",
      language: req.body.language || "English"
    };

    const answer = await askAI({
      topic,
      question,
      mode,
      profile,
      studyText: topicText(topic)
    });

    res.json({ topic, answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
