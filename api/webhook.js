export default function handler(req, res) {
  if (req.method === "POST") {
    console.log("Received webhook:", req.body);
    res.status(200).json({ status: "ok" }); // ✅ Gupshup ke success response
  } else {
    res.status(405).json({ error: "Method not allowed" }); // Browser test e dakhabe
  }
}
