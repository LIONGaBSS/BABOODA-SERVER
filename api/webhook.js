export default function handler(req, res) {
  if (req.method === "POST") {
    console.log("Webhook payload:", req.body);

    return res.status(200).json({ message: "Webhook received successfully" });
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
