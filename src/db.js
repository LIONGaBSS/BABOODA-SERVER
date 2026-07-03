const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const CONVERSATIONS_FILE = path.join(DATA_DIR, "conversations.json");
const ASSESSMENTS_FILE = path.join(DATA_DIR, "assessments.json");
const QUESTIONS_FILE = path.join(DATA_DIR, "questions.json");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function ensureJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
  }
}

function ensureDataFiles() {
  ensureDir(DATA_DIR);
  ensureJsonFile(USERS_FILE, []);
  ensureJsonFile(CONVERSATIONS_FILE, []);
  ensureJsonFile(ASSESSMENTS_FILE, []);
  ensureJsonFile(QUESTIONS_FILE, []);
}

function readJson(filePath, fallback = []) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function getUsers() {
  return readJson(USERS_FILE, []);
}

function saveUsers(users) {
  writeJson(USERS_FILE, users);
}

function getConversations() {
  return readJson(CONVERSATIONS_FILE, []);
}

function saveConversations(rows) {
  writeJson(CONVERSATIONS_FILE, rows);
}

function getAssessments() {
  return readJson(ASSESSMENTS_FILE, []);
}

function saveAssessments(rows) {
  writeJson(ASSESSMENTS_FILE, rows);
}

function getQuestions() {
  return readJson(QUESTIONS_FILE, []);
}

function saveQuestions(rows) {
  writeJson(QUESTIONS_FILE, rows);
}

function findUserByEmail(email) {
  return getUsers().find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

function findUserById(id) {
  return getUsers().find((u) => u.id === id);
}

function upsertUser(updatedUser) {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === updatedUser.id);
  if (index >= 0) users[index] = updatedUser;
  else users.push(updatedUser);
  saveUsers(users);
  return updatedUser;
}

async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || "Admin";

  if (!adminEmail || !adminPassword) return;

  const existing = findUserByEmail(adminEmail);
  if (existing) return;

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = {
    id: `user_${Date.now()}`,
    name: adminName,
    email: adminEmail,
    passwordHash,
    role: "admin",
    age: "",
    classLevel: "",
    board: "",
    subjectLevel: "",
    language: "English",
    readingLevel: "",
    bloomScore: 0,
    bloomLevel: "Unknown",
    learningGoal: "",
    weakTopics: "",
    preferredTone: "simple",
    depthNotes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  upsertUser(admin);
  console.log(`Seeded admin user: ${adminEmail}`);
}

function addConversation(row) {
  const rows = getConversations();
  rows.unshift(row);
  saveConversations(rows);
  return row;
}

function addAssessment(row) {
  const rows = getAssessments();
  rows.unshift(row);
  saveAssessments(rows);
  return row;
}

function addQuestion(row) {
  const rows = getQuestions();
  rows.unshift(row);
  saveQuestions(rows);
  return row;
}

module.exports = {
  ensureDataFiles,
  getUsers,
  saveUsers,
  getConversations,
  saveConversations,
  getAssessments,
  saveAssessments,
  getQuestions,
  saveQuestions,
  findUserByEmail,
  findUserById,
  upsertUser,
  seedAdminUser,
  addConversation,
  addAssessment,
  addQuestion
};
