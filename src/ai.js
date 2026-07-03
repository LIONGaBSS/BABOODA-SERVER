const OpenAI = require("openai");

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function pickTone(profile = {}) {
  const level = String(profile.readingLevel || profile.classLevel || "").toLowerCase();
  if (!level) return "simple";
  if (["class 5", "class 6", "5", "6", "beginner"].includes(level)) return "very simple";
  if (["class 7", "class 8", "intermediate"].includes(level)) return "simple";
  return "balanced";
}

function extractJson(text) {
  if (!text) return null;
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(text.slice(first, last + 1));
  } catch (err) {
    return null;
  }
}

function fallbackAnswer({ topic, question, mode, profile }) {
  const classLevel = profile?.classLevel || "unknown";
  const tone = pickTone(profile);
  return {
    topicId: topic?.id || null,
    mode,
    book_answer: `Based on the syllabus material for "${topic?.title || "this topic"}", here is a grounded answer for ${classLevel}.`,
    student_explanation: `In ${tone} language, the idea means: ${topic?.content?.slice(0, 280) || "study material is not available in text form yet."}`,
    counter_arguments: [
      "Different interpretations may exist depending on the book's context.",
      "A stronger or weaker claim may need extra evidence from the source text."
    ],
    analogy: "Think of this idea like a guiding rule that helps organize the smaller parts of the topic.",
    application: "Use this idea while reading, summarizing, and answering exam questions from the chapter.",
    confidence: 55,
    source_notes: [
      "Fallback answer used because no OpenAI API key is configured."
    ],
    question_echo: question || ""
  };
}

async function askAI({ topic, question, mode = "general", profile = {}, contextText = "" }) {
  if (!client) {
    return fallbackAnswer({ topic, question, mode, profile });
  }

  const systemPrompt = `
You are Babooda, a syllabus-grounded teaching assistant.
Use the provided study material first.
Do not invent facts beyond the material unless clearly marked as inference.
Adapt the explanation to the user's profile:
- Class: ${profile.classLevel || "unknown"}
- Age: ${profile.age || "unknown"}
- Bloom depth: ${profile.bloomLevel || "unknown"} (${profile.bloomScore || 0})
- Reading level: ${profile.readingLevel || "unknown"}
- Language: ${profile.language || "English"}
- Preferred tone: ${profile.preferredTone || "simple"}

Return ONLY valid JSON with this schema:
{
  "topicId": string|null,
  "mode": string,
  "book_answer": string,
  "student_explanation": string,
  "counter_arguments": [string],
  "analogy": string,
  "application": string,
  "confidence": number,
  "source_notes": [string]
}
`;

  const modeMap = {
    aim: "Answer the aim/objective of the topic.",
    main_idea: "Answer the main trunk / load-bearing idea of the topic.",
    counter: "Explain counter-arguments or alternate interpretations from the material.",
    analogy: "Give a practical analogy of the idea in the topic.",
    application: "Explain how to use the idea learned from the topic.",
    general: "Answer the user's question using the book material first."
  };

  const userPrompt = `
Topic:
Title: ${topic?.title || "Unknown"}
Aim: ${topic?.aim || "Not given"}
Class: ${topic?.classNo || "Unknown"}
Subject: ${topic?.subject || "Unknown"}

Mode instruction:
${modeMap[mode] || modeMap.general}

Study material:
${contextText || topic?.content || "No material text available."}

User question:
${question}
`;

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  const outputText = response.output_text || "";
  const parsed = extractJson(outputText);

  if (parsed) {
    return {
      topicId: parsed.topicId || topic?.id || null,
      mode: parsed.mode || mode,
      book_answer: parsed.book_answer || "",
      student_explanation: parsed.student_explanation || "",
      counter_arguments: Array.isArray(parsed.counter_arguments) ? parsed.counter_arguments : [],
      analogy: parsed.analogy || "",
      application: parsed.application || "",
      confidence: Number(parsed.confidence || 0),
      source_notes: Array.isArray(parsed.source_notes) ? parsed.source_notes : [],
      question_echo: question
    };
  }

  return {
    topicId: topic?.id || null,
    mode,
    book_answer: outputText || "No answer returned.",
    student_explanation: "",
    counter_arguments: [],
    analogy: "",
    application: "",
    confidence: 0,
    source_notes: ["Model returned non-JSON output."],
    question_echo: question
  };
}

async function generateBloomQuestions({ topic, profile = {} }) {
  if (!client) {
    return {
      questions: [
        { bloomLevel: "Remember", question: `What is ${topic?.title || "the topic"}?` },
        { bloomLevel: "Understand", question: `Explain ${topic?.title || "the topic"} in your own words.` },
        { bloomLevel: "Apply", question: `How would you use ${topic?.title || "this idea"} in real life?` },
        { bloomLevel: "Analyze", question: `What are the main parts or assumptions behind this topic?` },
        { bloomLevel: "Evaluate", question: `Do you agree with the interpretation in the book? Why?` },
        { bloomLevel: "Create", question: `Create a new example or solution using this topic.` }
      ],
      note: "Fallback generated because no OpenAI API key is configured."
    };
  }

  const prompt = `
Create 6 Bloom's Taxonomy questions for this topic.
Return ONLY valid JSON in the form:
{
  "questions": [
    { "bloomLevel": "Remember", "question": "...", "hint": "..." },
    { "bloomLevel": "Understand", "question": "...", "hint": "..." },
    { "bloomLevel": "Apply", "question": "...", "hint": "..." },
    { "bloomLevel": "Analyze", "question": "...", "hint": "..." },
    { "bloomLevel": "Evaluate", "question": "...", "hint": "..." },
    { "bloomLevel": "Create", "question": "...", "hint": "..." }
  ]
}

Topic:
Title: ${topic?.title || "Unknown"}
Aim: ${topic?.aim || "Not given"}
Content: ${topic?.content || "No content"}

Student profile:
Class: ${profile.classLevel || "unknown"}
Age: ${profile.age || "unknown"}
Bloom score: ${profile.bloomScore || 0}
Reading level: ${profile.readingLevel || "unknown"}
`;

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    input: [
      { role: "system", content: "You generate educational assessment items." },
      { role: "user", content: prompt }
    ]
  });

  const outputText = response.output_text || "";
  const parsed = extractJson(outputText);
  if (parsed?.questions) return parsed;

  return {
    questions: [],
    raw: outputText
  };
}

async function gradeAnswer({ question, answer, topic, profile = {} }) {
  if (!client) {
    const score = Math.min(100, Math.max(0, String(answer || "").length));
    return {
      score: score > 100 ? 100 : score,
      level:
        score < 20 ? "Low" :
        score < 50 ? "Developing" :
        score < 75 ? "Proficient" : "Advanced",
      feedback: "Fallback scoring used because no OpenAI API key is configured.",
      strengths: ["Answer was received"],
      gaps: ["Connect answer to the syllabus text more directly"],
      nextSteps: ["Quote the key idea", "Add one example", "Mention the chapter's logic"]
    };
  }

  const prompt = `
Grade the student's answer using a 0-100 score, with feedback based on the study material first.
Return ONLY valid JSON:
{
  "score": number,
  "level": "Low|Developing|Proficient|Advanced",
  "feedback": string,
  "strengths": [string],
  "gaps": [string],
  "nextSteps": [string]
}

Topic:
Title: ${topic?.title || "Unknown"}
Aim: ${topic?.aim || "Not given"}
Content: ${topic?.content || "No content"}

Question:
${question}

Student answer:
${answer}

Student profile:
Class: ${profile.classLevel || "unknown"}
Age: ${profile.age || "unknown"}
Bloom score: ${profile.bloomScore || 0}
`;

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    input: [
      { role: "system", content: "You are a strict but fair educational grader." },
      { role: "user", content: prompt }
    ]
  });

  const outputText = response.output_text || "";
  const parsed = extractJson(outputText);

  if (parsed) return parsed;

  return {
    score: 0,
    level: "Low",
    feedback: outputText || "No grading output returned.",
    strengths: [],
    gaps: [],
    nextSteps: []
  };
}

module.exports = {
  askAI,
  generateBloomQuestions,
  gradeAnswer
};
