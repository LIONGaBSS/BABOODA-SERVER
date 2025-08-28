export default function handler(req, res) {
  if (req.method === "POST") {
    console.log("Webhook received:", req.body);

    // Gupshup ke always 200 dite hobe, nahole invalid bole
    res.status(200).json({ success: true, message: "Webhook received" });
  } else {
    // Browser diye test korle GET request e eta dekhabe
    res.status(200).json({ message: "Webhook is working" });
  }
}
