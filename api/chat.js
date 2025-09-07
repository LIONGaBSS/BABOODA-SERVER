export default async function handler(req, res) {
  // ✅ Allow CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ Handle OPTIONS request (CORS preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Reject GET (browser এ test করলে error না দিয়ে সুন্দর msg দেবে)
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed" });
  }

  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "No message provided" });
    }

    // 🔑 OpenAI API call
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo-0125",
        messages: [
          { role: "system", content: "You are Babooda, a teaching chatbot..." },
          { role: "user", content: message }
        ],
      }),
    });

    const data = await response.json();
    console.log("OpenAI raw response:", data);

    let reply = "Sorry, I couldn’t generate a reply.";
    if (data.choices?.[0]?.message?.content) {
      reply = data.choices[0].message.content;
    }

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ error: "Failed to connect to OpenAI" });
  }
}
