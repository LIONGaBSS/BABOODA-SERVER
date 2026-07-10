const fs = require("fs");
const path = require("path");
const { uid } = require("./store");

const SYLLABUS_DIR = path.join(__dirname, "..", "syllabus");

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.topics)) return data.topics;
  if (Array.isArray(data.chapters)) return data.chapters;
  if (Array.isArray(data.lessons)) return data.lessons;
  if (data.title || data.content || data.text) return [data];
  return [];
}

function normalizeTopic(item, classNo, subject, index) {
  const title = item.title || item.topic || item.name || `Topic ${index + 1}`;
  const content =
    item.content ||
    item.text ||
    item.summary ||
    item.notes ||
    item.details ||
    "";
  return {
    id: item.id || uid(`class${classNo}`),
    classNo,
    subject: item.subject || subject || `Class ${classNo}`,
    chapterNo: item.chapterNo || item.chapter || index + 1,
    title,
    aim: item.aim || item.objective || "",
    content,
    keywords: item.keywords || item.tags || []
  };
}

function loadAllTopics() {
  if (!fs.existsSync(SYLLABUS_DIR)) return [];
  const files = fs
    .readdirSync(SYLLABUS_DIR)
    .filter((f) => /^class\d+\.json$/i.test(f))
    .sort((a, b) => a.localeCompare(b));

  const topics = [];
  for (const file of files) {
    const classNo = Number(file.match(/class(\d+)\.json/i)?.[1]);
    const data = safeReadJson(path.join(SYLLABUS_DIR, file));
    const subject = data?.subject || data?.title || `Class ${classNo}`;
    const items = extractItems(data);
    items.forEach((item, index) => {
      topics.push(normalizeTopic(item, classNo, subject, index));
    });
  }
  return topics;
}

function getClasses() {
  return [...new Set(loadAllTopics().map((t) => t.classNo))].sort((a, b) => a - b);
}

function scoreTopic(topic, query) {
  const hay = `${topic.title} ${topic.aim} ${topic.content} ${(topic.keywords || []).join(" ")}`.toLowerCase();
  const words = String(query || "").toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean);
  let score = 0;
  for (const w of words) {
    if (hay.includes(w)) score += 2;
    if (topic.title.toLowerCase().includes(w)) score += 4;
  }
  return score;
}

function searchTopics({ classNo, query }) {
  let topics = loadAllTopics();
  if (classNo) topics = topics.filter((t) => Number(t.classNo) === Number(classNo));
  if (query) {
    topics = topics
      .map((t) => ({ ...t, _score: scoreTopic(t, query) }))
      .sort((a, b) => b._score - a._score);
  }
  return topics.slice(0, 50);
}

function getTopicById(topicId) {
  return loadAllTopics().find((t) => t.id === topicId);
}

module.exports = {
  loadAllTopics,
  getClasses,
  searchTopics,
  getTopicById
};
