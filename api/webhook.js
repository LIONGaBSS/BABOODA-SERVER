import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const incoming = req.body.payload.text;
  
  // Call OpenAI
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

  // Send back to Gupshup
  await fetch("https://api.gupshup.io/sm/api/v1/msg", {
    method: "POST",
    headers: {
      "apikey": process.env.GUPSHUP_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      channel: "whatsapp",
      source: "YOUR_WHATSAPP_NUMBER",
      destination: req.body.payload.sender.phone,
      message: reply
    })
  });

  res.sendStatus(200);
});

export default app;
