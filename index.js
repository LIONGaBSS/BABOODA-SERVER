import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

// OpenAI Secret Key (replace with your real one)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "your-openai-secret-key";

// Gupshup Webhook endpoint
app.post("/webhook", async (req, res) => {
  const message = req.body.payload.payload.text || "Hello";

  // Call OpenAI API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }]
    })
  });

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't understand.";

  // Send back to Gupshup
  res.json({
    success: true,
    reply: reply
  });
});

// Default route
app.get("/", (req, res) => {
  res.send("Babooda Chatbot server is running ✅");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
