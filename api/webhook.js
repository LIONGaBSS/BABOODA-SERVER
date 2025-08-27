import express from "express";
import fetch from "node-fetch";
import 'dotenv/config';

const app = express();
app.use(express.json());

// Incoming webhook from Gupshup
app.post("/webhook", async (req, res) => {
  try {
    const incoming = req.body.payload.text;   // user er message
    const sender = req.body.payload.sender.phone; // user phone number

    // 1️⃣ Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: incoming }]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // 2️⃣ Send reply back to WhatsApp via Gupshup
    await fetch("https://api.gupshup.io/sm/api/v1/msg", {
      method: "POST",
      headers: {
        "apikey": process.env.GUPSHUP_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        channel: "whatsapp",
        source: process.env.WHATSAPP_NUMBER,  // WhatsApp business number
        destination: sender,
        message: reply
      })
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err);
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log("🚀 Webhook server running on port 3000"));

export default app;
