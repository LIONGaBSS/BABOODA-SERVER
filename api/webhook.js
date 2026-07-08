const express = require("express");
const router = express.Router();

router.post("/openai", (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
