const fs = require("fs");
const path = require("path");

const SYLLABUS_DIR = path.join(__dirname, "..", "syllabus");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.topics)) return data.topics;
  if (Array.isArray(data.chapters)) return data.chapters;
  if (Array.isArray(data.lessons)) return data.lessons;
  if (Array.isArray(data.items)) return data.items;
  if (data.title || data.content || data.text) return [data];
  return [];
}

function normalizeTopic(item, meta) {
  const title = item.title || item.topic || item.name || `Topic ${meta.index + 1}`;
  const content =
    item.content ||
    item.text ||
    item.summary ||
    item.explanation ||
    item.details ||
    item.notes ||
    "";

  const aim = item.aim || item.objective || item.goal || item.learningObjective || "";

  return {
    id: item.id || `class${meta.classNo}-${meta.index + 1}-${slugify(title)}`,
    classNo: meta.classNo,
    subject: item.subject || meta.subject || path.basename(meta.fileName, ".json"),
    chapterNo: item.chapterNo || item.chapter || meta.index + 1,
    title,
    aim,
    content,
    keywords: item.keywords || item.tags || [],
    raw: item
  };
}

function loadAllTopics() {
  if (!fs.existsSync(SYLLABUS_DIR)) return [];

  const files = fs
    .readdirSync(SYLLABUS_DIR)
    .filter((f) => /^class\d+\.json$/i.test(f))
    .sort((a, b) => a.localeCompare(b));

  const topics = [];

  for (const fileName of files) {
    const classNoMatch = fileName.match(/class(\d+)\.json/i);
    const classNo = classNoMatch ? Number(classNoMatch[1]) : null;
    const filePath = path.join(SYLLABUS_DIR, fileName);
    const data = safeReadJson(filePath);
    const subject = data?.subject || data?.title || `Class ${classNo}`;
    const items = extractItems(data);

    items.forEach((item, index) => {
      topics.push(normalizeTopic(item, { classNo, subject, fileName, index }));
    });
  }

  return topics;
}

function scoreTopic(topic, query) {
  const text = [
    topic.title,
    topic.aim,
    topic.content,
    ...(topic.keywords || [])
  ]
    .join(" ")
    .toLowerCase();

  const tokens = String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);

  let score = 0;
  for (const token of tokens) {
    if (text.includes(token)) score += 2;
    if (topic.title.toLowerCase().includes(token)) score += 3;
  }
  return score;
}

function searchTopics({ classNo, query }) {
  let topics = loadAllTopics();

  if (classNo) {
    topics = topics.filter((t) => Number(t.classNo) === Number(classNo));
  }

  if (query && String(query).trim()) {
    topics = topics
      .map((t) => ({ ...t, _score: scoreTopic(t, query) }))
      .sort((a, b) => b._score - a._score);
  }

  return topics.slice(0, 30);
}

function getTopicById(topicId) {
  return loadAllTopics().find((t) => t.id === topicId);
}

function getClassList() {
  return loadAllTopics()
    .map((t) => t.classNo)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);
}

module.exports = {
  loadAllTopics,
  searchTopics,
  getTopicById,
  getClassList
};
