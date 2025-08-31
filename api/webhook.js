import OpenAI from "openai";

// OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const data = req.body;
      console.log("📩 Incoming WhatsApp Message:", JSON.stringify(data));

      const userMessage = data?.payload?.payload?.text || "Hello";

      // 🔹 OpenAI call
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",   // lightweight, fast
        messages: [
          { role: "system", content: "You are Babooda, a helpful teacher chatbot." },
          { role: "user", content: userMessage },
        ],
      });

      const botReply = completion.choices[0].message.content;
      console.log("🤖 Babooda Reply:", botReply);

      // 🔹 Reply back to Gupshup WhatsApp API
      await fetch("https://api.gupshup.io/sm/api/v1/msg", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "apikey": process.env.GUPSHUP_API_KEY,
        },
        body: new URLSearchParams({
          channel: "whatsapp",
          source: process.env.WHATSAPP_NUMBER,  // আপনার sandbox/business no
          destination: data.payload.sender?.phone || "918123456789",
          message: JSON.stringify({ type: "text", text: botReply }),
        }),
      });

      return res.status(200).json({ success: true, reply: botReply });
    } else {
      return res.status(200).send("✅ Babooda Webhook is running fine");
    }
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
