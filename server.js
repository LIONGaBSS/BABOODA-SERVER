require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { ensureDataFiles, seedDataIfMissing } = require("./src/store");

const authRoutes = require("./api/auth");
const syllabusRoutes = require("./api/syllabus");
const chatRoutes = require("./api/chat");
const adminRoutes = require("./api/admin");
const userRoutes = require("./api/user");
const organizerRoutes = require("./api/organizer");
const webhookRoutes = require("./api/webhook");

const app = express();
const PORT = process.env.PORT || 3000;

ensureDataFiles();
seedDataIfMissing();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Babooda server is live" });
});

app.use("/api/auth", authRoutes);
app.use("/api/syllabus", syllabusRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/organizer", organizerRoutes);
app.use("/api/webhook", webhookRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Babooda running at http://localhost:${PORT}`);
});
