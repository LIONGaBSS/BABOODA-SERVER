export default function handler(req, res) {
  if (req.method === "GET") {
    // For browser testing
    res.status(200).send("Webhook is live ✅");
  } else if (req.method === "POST") {
    // For Gupshup test + messages
    console.log("Webhook received:", req.body);
    res.status(200).json({ success: true }); 
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
