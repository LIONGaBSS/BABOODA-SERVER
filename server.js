require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const { ensureDataFiles, seedAdminUser } = require("./src/db");

const authRoutes = require("./api/auth");
const adminRoutes = require("./api/admin");
const syllabusRoutes = require("./api/syllabus");
const chatRoutes = require("./api/chat");
const webhookRoutes = require("./api/webhook");

const app = express();
const PORT = process.env.PORT || 3000;

ensureDataFiles();
seedAdminUser();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Babooda server is running" });
});

app.use("/api", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/syllabus", syllabusRoutes);
app.use("/api", chatRoutes);
app.use("/api/webhook", webhookRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Babooda running on http://localhost:${PORT}`);
});
