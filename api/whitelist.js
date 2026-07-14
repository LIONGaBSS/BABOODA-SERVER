const express = require("express");
const { authRequired, roleRequired } = require("../src/auth");
const { getWhitelist, saveWhitelist } = require("../src/store");

const router = express.Router();

router.use(authRequired);
router.use(roleRequired("organizer"));

function listKey(role) {
  if (role === "organizer") return "organizerIds";
  if (role === "admin") return "adminIds";
  if (role === "user") return "studentIds";
  return null;
}

router.get("/", (req, res) => {
  const whitelist = getWhitelist();
  res.json({ whitelist });
});

router.post("/add", (req, res) => {
  const { role, organizationId } = req.body || {};

  if (!role || !organizationId) {
    return res.status(400).json({ error: "role and organizationId are required" });
  }

  const key = listKey(role);
  if (!key) return res.status(400).json({ error: "Invalid role" });

  const whitelist = getWhitelist();
  if (!whitelist[key].includes(organizationId)) {
    whitelist[key].push(organizationId);
    saveWhitelist(whitelist);
  }

  res.json({ whitelist });
});

router.post("/remove", (req, res) => {
  const { role, organizationId } = req.body || {};

  if (!role || !organizationId) {
    return res.status(400).json({ error: "role and organizationId are required" });
  }

  const key = listKey(role);
  if (!key) return res.status(400).json({ error: "Invalid role" });

  const whitelist = getWhitelist();
  whitelist[key] = whitelist[key].filter((id) => id !== organizationId);
  saveWhitelist(whitelist);

  res.json({ whitelist });
});

module.exports = router;
