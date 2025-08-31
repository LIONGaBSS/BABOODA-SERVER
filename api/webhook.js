import OpenAI from "openai";
import fetch from "node-fetch";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const data = req.body;
      console.log("📩 Incoming from Gupshup:", data);

      // Gupshup text extract
      const userMessage = data.payload?.payload?.text || "Hello";

      // OpenAI response generate
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Babooda, a friendly teaching chatbot." },
          { role: "user", content: userMessage },
        ],
      });

      const botReply = completion.choices[0].message.content;

      // Gupshup WhatsApp reply API
      const url = "https://api.gupshup.io/sm/api/v1/msg";
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "apikey": process.env.GUPSHUP_API_KEY,
        },
        body: new URLSearchParams({
          channel: "whatsapp",
          source: process.env.WHATSAPP_NUMBER,
          destination: data.payload.sender.phone, // User phone number
          message: botReply,
        }),
      });

      res.status(200).json({ success: true, reply: botReply });
    } catch (err) {
      console.error("❌ Error:", err);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(200).send("Webhook running OK 🚀");
  }
}
