const OpenAI = require("openai");

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function fallbackText(topic, mode) {
  const base = topic?.content || topic?.aim || topic?.title || "This topic";
  return {
    aim: `The aim of "${topic?.title || "this topic"}" is to understand the central idea using the study material first.`,
    trunk: `The main trunk idea is: ${base.slice(0, 180)}.`,
    test: `Counter-argument view: the topic may be interpreted differently depending on context, examples, or assumptions in the book.`,
    own: `Practical analogy: think of this idea as a real-life framework that helps organize smaller details around one central principle.`,
    reality: `How to use it: apply the idea while reading, summarizing, comparing examples, and solving exam questions.`,
    general: `Based on the syllabus material, the key answer is: ${base.slice(0, 220)}.`
  }[mode] || base;
}

async function askAI({ topic, question, mode, profile, studyText }) {
  if (!client) {
    return {
      mode,
      book_answer: fallbackText(topic, mode),
      personalized_answer: `For ${profile.classNo || "the class"} level, this can be explained simply: ${fallbackText(topic, mode)}`,
      counter_arguments: ["Alternative interpretation may exist in a different context."],
      analogy: "Use a familiar real-life example to connect the idea.",
      application: "Use it in reading, revision, and written answers.",
      confidence: 55,
      source_notes: ["Fallback mode because OPENAI_API_KEY is not set."],
      question
    };
  }

  const system = `
You are Babooda, a syllabus-grounded educational AI.
Use study material first. Do not invent facts if the material is enough.
Then adapt to the learner profile:
- class: ${profile.classNo || ""}
- age: ${profile.age || ""}
- Bloom depth: ${profile.bloomScore || ""}
- language: ${profile.language || "English"}
- reading level: ${profile.readingLevel || ""}

Return ONLY valid JSON with:
{
  "mode": "...",
  "book_answer": "...",
  "personalized_answer": "...",
  "counter_arguments": ["..."],
  "analogy": "...",
  "application": "...",
  "confidence": 0-100,
  "source_notes": ["..."]
}
`;

  const user = `
Topic title: ${topic?.title || ""}
Topic aim: ${topic?.aim || ""}
Study material:
${studyText || topic?.content || ""}

Mode: ${mode}
Question: ${question}
`;

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    input: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  const text = response.output_text || "";
  try {
    return JSON.parse(text);
  } catch {
    return {
      mode,
      book_answer: text,
      personalized_answer: "",
      counter_arguments: [],
      analogy: "",
      application: "",
      confidence: 0,
      source_notes: ["Model returned non-JSON output."]
    };
  }
}

async function generateBloomQuestions({ topic, profile }) {
  if (!client) {
    return {
      questions: [
        { bloom: "Remember", question: `What is ${topic?.title || "this topic"}?` },
        { bloom: "Understand", question: `Explain ${topic?.title || "this topic"} in your own words.` },
        { bloom: "Apply", question: `How would you use this idea in a real-life example?` },
        { bloom: "Analyze", question: `What are the major parts or assumptions of the topic?` },
        { bloom: "Evaluate", question: `Do you agree with the interpretation in the book? Why?` },
        { bloom: "Create", question: `Create a new example or solution using this idea.` }
      ]
    };
  }

  const prompt = `
Create 6 Bloom's Taxonomy questions in JSON:
{
 "questions":[
   {"bloom":"Remember","question":"..."},
   {"bloom":"Understand","question":"..."},
   {"bloom":"Apply","question":"..."},
   {"bloom":"Analyze","question":"..."},
   {"bloom":"Evaluate","question":"..."},
   {"bloom":"Create","question":"..."}
 ]
}

Topic: ${topic?.title || ""}
Aim: ${topic?.aim || ""}
Content: ${topic?.content || ""}
Learner class: ${profile.classNo || ""}
Learner age: ${profile.age || ""}
`;
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    input: [
      { role: "system", content: "You generate assessment questions." },
      { role: "user", content: prompt }
    ]
  });

  try {
    return JSON.parse(response.output_text || "{}");
  } catch {
    return { questions: [] };
  }
}

async function gradeBloomAnswers({ topic, questions, answers, profile }) {
  const qaPairs = (questions || []).map((q, i) => ({
    question: q.question,
    answer: answers?.[i] || ""
  }));

  if (!client) {
    const lengths = qaPairs.map((x) => String(x.answer).length);
    const score = Math.max(0, Math.min(100, Math.round(lengths.reduce((a, b) => a + b, 0) / 12)));
    return {
      topicScore: score,
      perQuestionScores: qaPairs.map(() => score),
      feedback: "Fallback grading used because OPENAI_API_KEY is not set.",
      strengths: ["Answers were submitted"],
      gaps: ["Add more detail from the study material"],
      nextSteps: ["Use chapter keywords", "Write one example", "Mention the main idea"],
      level: score < 30 ? "Low" : score < 60 ? "Developing" : score < 80 ? "Proficient" : "Advanced"
    };
  }

  const prompt = `
Grade these Bloom answers from the study material first.
Return JSON:
{
 "topicScore": 0-100,
 "perQuestionScores":[0-100,0-100,0-100,0-100,0-100,0-100],
 "feedback":"...",
 "strengths":["..."],
 "gaps":["..."],
 "nextSteps":["..."],
 "level":"Low|Developing|Proficient|Advanced"
}

Topic: ${topic?.title || ""}
Aim: ${topic?.aim || ""}
Content: ${topic?.content || ""}

Questions & answers:
${JSON.stringify(qaPairs, null, 2)}

Profile:
${JSON.stringify(profile || {}, null, 2)}
`;

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    input: [
      { role: "system", content: "You are a strict but fair educational grader." },
      { role: "user", content: prompt }
    ]
  });

  try {
    return JSON.parse(response.output_text || "{}");
  } catch {
    return {
      topicScore: 0,
      perQuestionScores: [],
      feedback: "Non-JSON output",
      strengths: [],
      gaps: [],
      nextSteps: [],
      level: "Low"
    };
  }
}

module.exports = {
  askAI,
  generateBloomQuestions,
  gradeBloomAnswers
};
