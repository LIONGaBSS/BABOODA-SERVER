Corrected

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      console.log("Incoming Webhook Body:", req.body);

      const incoming = req.body;
      const userMessage = incoming.payload?.payload?.text || "Hi";

      // 🔹 OpenAI API call
      const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `
              You are *Babooda*, a teaching chatbot. 
              Follow the teaching methods from the 4 guide books.
              `,
            },
            { role: "user", content: userMessage },
          ],
        }),
      });

      const data = await openAiResponse.json();
      const botReply =
        data.choices?.[0]?.message?.content ||
        "Sorry, I couldn’t process that. Try again.";

      // 🔹 Gupshup WhatsApp API call
      const response = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_API_KEY,
        },
        body: new URLSearchParams({
          channel: "whatsapp",
          source: "917834811114", // Sandbox number
          destination: incoming.payload?.sender?.phone || "",
          message: botReply,
        }),
      });

      const gupshupResult = await response.text();
      console.log("Gupshup API Response:", gupshupResult);

      res.status(200).json({ success: true, reply: botReply });
    } else {
      res.status(200).send("Webhook running OK (GET)");
    }
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
