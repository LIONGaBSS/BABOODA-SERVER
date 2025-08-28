export default function handler(req, res) {
  if (req.method === "GET") {
    // Gupshup verification er jonne GET request e ekdom simple response dite hobe
    res.status(200).json({ success: true, message: "Webhook is live" });
  } else if (req.method === "POST") {
    console.log("Incoming Gupshup payload:", req.body);
    res.status(200).json({ success: true });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
