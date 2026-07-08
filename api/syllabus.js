const express = require("express");
const { getClasses, searchTopics, getTopicById } = require("../src/syllabus");

const router = express.Router();

router.get("/classes", (req, res) => {
  res.json({ classes: getClasses() });
});

router.get("/topics", (req, res) => {
  const classNo = req.query.classNo || req.query.class || "";
  const q = req.query.q || "";
  const topics = searchTopics({ classNo, query: q });
  res.json({ topics });
});

router.get("/topic/:id", (req, res) => {
  const topic = getTopicById(req.params.id);
  if (!topic) return res.status(404).json({ error: "Topic not found" });
  res.json({ topic });
});

module.exports = router;
