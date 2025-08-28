export default function handler(req, res) {
  if (req.method === "POST") {
    console.log("Gupshup Webhook Data:", req.body);

    // Gupshup ke 200 reply dite hobe
    res.status(200).json({ success: true });
  } else {
    // Jodi GET/other method hoy
    res.status(200).send("Webhook running OK");
  }
}
