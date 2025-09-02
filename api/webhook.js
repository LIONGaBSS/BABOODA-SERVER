export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      console.log("✅ Incoming Webhook Body:", JSON.stringify(req.body, null, 2));

      const incoming = req.body;
      const userMessage = incoming.payload?.payload?.text || "Hi";

      console.log("📩 User Message:", userMessage);
      console.log("📱 Sender:", incoming.payload?.sender?.phone);
      const botReply = `Hello! I got your message: "${userMessage}" ✅`;

      const response = await fetch("https://api.gupshup.io/sm/api/v1/msg", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_API_KEY,
        },
        body: new URLSearchParams({
          channel: "whatsapp",
          source: "917834811114",
          destination: incoming.payload?.sender?.phone || "",
          message: botReply,
        }),
      });

      const respText = await response.text();
      console.log("📤 Gupshup API Response:", respText);

      res.status(200).json({ success: true, reply: botReply });
    } else {
      res.status(200).send("Webhook running OK (GET)");
    }
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
