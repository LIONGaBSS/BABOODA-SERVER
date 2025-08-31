export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      console.log("Incoming Webhook Body:", req.body);
      res.status(200).json({ success: true, echo: req.body });
    } else {
      res.status(200).send("Webhook running OK (GET)");
    }
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
