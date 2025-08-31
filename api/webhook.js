export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      console.log("Incoming Webhook Body:", req.body);
      const incoming = req.body;
      const reply = "Hello! Babooda test reply working ✅";

      await fetch("https://api.gupshup.io/wa/api/v1/msg", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_API_KEY,
        },
        body: new URLSearchParams({
          channel: "whatsapp",
          source: process.env.WHATSAPP_NUMBER,
          destination: incoming.payload?.sender?.phone || "",
          message: reply,
        }),
      });

      res.status(200).json({ success: true, reply });
    } else {
      res.status(200).send("Webhook running OK (GET)");
    }
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
