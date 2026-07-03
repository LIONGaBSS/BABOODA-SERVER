const express = require("express");
const { getClassList, searchTopics, getTopicById } = require("../src/syllabus");

const router = express.Router();

router.get("/classes", (req, res) => {
  res.json({ classes: getClassList() });
});

router.get("/topics", (req, res) => {
  const classNo = req.query.class || req.query.classNo || null;
  const query = req.query.q || req.query.query || "";
  const topics = searchTopics({ classNo, query });
  res.json({ topics });
});

router.get("/topic/:id", (req, res) => {
  const topic = getTopicById(req.params.id);
  if (!topic) return res.status(404).json({ error: "Topic not found" });
  res.json({ topic });
});

module.exports = router;
