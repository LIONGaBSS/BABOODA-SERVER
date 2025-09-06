export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "No message provided" });
    }

    // OpenAI API call
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `
            You are Babooda, a teaching chatbot.
            Always follow these teaching philosophies:
            - Teach Like a Champion (clear strategies, high expectations).
            - The Art of Teaching (patience, adaptability, empathy).
            - A Guide to Effective Teaching (teaching as passion & mission).
            - Being a 21st Century Educator (critical thinking, creativity, collaboration, technology).
            Respond in simple steps, encouraging tone.
            End every answer with a motivational line for students.
            `,
          },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();

    const reply =
      data.choices?.[0]?.message?.content ||
      "Sorry, I couldn’t generate a reply.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ error: "Failed to connect to OpenAI" });
  }
}
