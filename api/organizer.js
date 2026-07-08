const express = require("express");
const { authRequired, roleRequired } = require("../src/auth");
const { readJson, writeJson, uid } = require("../src/store");
const { countBy } = require("../src/helpers");

const router = express.Router();

router.use(authRequired, roleRequired("organizer"));

function safeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

router.get("/dashboard", (req, res) => {
  const users = readJson("users", []).filter((u) => u.status === "active");
  const admins = users.filter((u) => u.role === "admin");
  const students = users.filter((u) => u.role === "user");

  res.json({
    organizers: users.filter((u) => u.role === "organizer").map(safeUser),
    admins: admins.map(safeUser),
    users: students.map(safeUser),
    classWiseUsers: countBy(students, (u) => u.profile?.classNo || "Unknown")
  });
});

router.get("/report/:year", (req, res) => {
  const year = Number(req.params.year);
  const evaluations = readJson("evaluations", []);
  const broadcasts = readJson("broadcasts", []);
  const users = readJson("users", []);

  const yearEvals = evaluations.filter((e) => new Date(e.createdAt).getFullYear() === year);
  const byAdmin = {};

  for (const e of yearEvals) {
    const b = broadcasts.find((x) => x.id === e.broadcastId);
    const adminId = b?.adminId || e.adminId || "unknown";
    const admin = users.find((u) => u.id === adminId);
    const adminName = admin?.name || adminId;

    if (!byAdmin[adminId]) {
      byAdmin[adminId] = {
        adminId,
        adminName,
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

    const topicName = b?.title || e.topicId || "Unknown topic";
    if (!byAdmin[adminId].topics[topicName]) {
      byAdmin[adminId].topics[topicName] = { Upward: 0, Downward: 0, Sideways: 0 };
    }
    byAdmin[adminId].topics[topicName][symbol] += 1;
  }

  res.json({ year, report: Object.values(byAdmin) });
});

router.get("/deregister-requests", (req, res) => {
  const rows = readJson("deregister_requests", []);
  res.json({ requests: rows });
});

router.post("/deregister/request", (req, res) => {
  const { targetUserId, reason = "" } = req.body || {};
  if (!targetUserId) return res.status(400).json({ error: "targetUserId required" });

  const rows = readJson("deregister_requests", []);
  const reqRow = {
    id: uid("dreg"),
    targetUserId,
    requestedBy: req.auth.sub,
    requestedByRole: req.auth.role,
    reason,
    approvals: [],
    status: "pending",
    createdAt: new Date().toISOString()
  };
  rows.unshift(reqRow);
  writeJson("deregister_requests", rows);
  res.json({ request: reqRow });
});

router.post("/deregister/approve", (req, res) => {
  const { requestId } = req.body || {};
  if (!requestId) return res.status(400).json({ error: "requestId required" });

  const rows = readJson("deregister_requests", []);
  const idx = rows.findIndex((r) => r.id === requestId);
  if (idx < 0) return res.status(404).json({ error: "Request not found" });

  const request = rows[idx];
  if (!request.approvals.includes(req.auth.sub)) request.approvals.push(req.auth.sub);

  // 5 organizer approvals => deregister
  if (request.approvals.length >= 5) {
    request.status = "approved";
    const users = readJson("users", []);
    const uIdx = users.findIndex((u) => u.id === request.targetUserId);
    if (uIdx >= 0) {
      users[uIdx].status = "deregistered";
      users[uIdx].updatedAt = new Date().toISOString();
      writeJson("users", users);
    }
  }

  request.updatedAt = new Date().toISOString();
  rows[idx] = request;
  writeJson("deregister_requests", rows);

  res.json({ request });
});

router.get("/classes/:classNo/users", (req, res) => {
  const classNo = String(req.params.classNo);
  const users = readJson("users", [])
    .filter((u) => u.status === "active" && String(u.profile?.classNo || "") === classNo);
  res.json({ users: users.map(safeUser) });
});

module.exports = router;
