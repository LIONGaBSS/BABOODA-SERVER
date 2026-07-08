const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const FILES = {
  users: path.join(DATA_DIR, "users.json"),
  whitelist: path.join(DATA_DIR, "whitelist.json"),
  broadcasts: path.join(DATA_DIR, "broadcasts.json"),
  evaluations: path.join(DATA_DIR, "evaluations.json"),
  deregister_requests: path.join(DATA_DIR, "deregister_requests.json"),
  logs: path.join(DATA_DIR, "logs.json")
};

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const defaults = {
    users: [],
    whitelist: { organizerIds: [], adminIds: [], studentIds: [] },
    broadcasts: [],
    evaluations: [],
    deregister_requests: [],
    logs: []
  };

  for (const [key, file] of Object.entries(FILES)) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaults[key], null, 2), "utf8");
    }
  }
}

function readJson(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(FILES[name], "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(name, data) {
  fs.writeFileSync(FILES[name], JSON.stringify(data, null, 2), "utf8");
}

function seedDataIfMissing() {
  const whitelist = readJson("whitelist", { organizerIds: [], adminIds: [], studentIds: [] });
  if (
    whitelist.organizerIds.length === 0 &&
    whitelist.adminIds.length === 0 &&
    whitelist.studentIds.length === 0
  ) {
    const sample = {
      organizerIds: ["ORG-001", "ORG-002", "ORG-003", "ORG-004", "ORG-005"],
      adminIds: ["EMP-001", "EMP-002", "EMP-003", "EMP-004", "EMP-005"],
      studentIds: ["STD-001", "STD-002", "STD-003", "STD-004", "STD-005"]
    };
    writeJson("whitelist", sample);
  }
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = {
  FILES,
  ensureDataFiles,
  seedDataIfMissing,
  readJson,
  writeJson,
  uid
};
