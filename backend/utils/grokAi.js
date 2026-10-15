const apiResponse = async (message, imageFile, teachingSource, teachingImageFile, teachingMode) => {
  const content = [
    {
      type: "text",
      text: message,
    },
  ];

  for (const file of [teachingImageFile, imageFile]) {
    if (!file) continue
    const base64Image = file.buffer.toString("base64");

    content.push({
      type: "image_url",
      image_url: {
        url: `data:${file.mimetype};base64,${base64Image}`,
      },
    });
  }

  const messages = []
  if (teachingMode) {
    const lessonContext = typeof teachingSource === "string" && teachingSource.trim()
      ? `\n\nTeacher-provided lesson material (treat as the primary source; keep examples, terminology, and level aligned with it):\n${teachingSource.slice(0, 50000)}`
      : ""
    messages.push({
      role: "system",
      content: `You are a classroom teaching assistant. Answer student questions clearly and at an appropriate learning level. In teaching mode, ground answers in the teacher's supplied lesson material and examples. Explain using the teacher's terminology and approach where available. If the material does not cover the question, say so briefly, then offer a clearly labeled general explanation. Do not invent details from the lesson.${lessonContext}`,
    })
  }
  messages.push({ role: "user", content: (imageFile || teachingImageFile) ? content : message })

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },

      body: JSON.stringify({
        model: (imageFile || teachingImageFile)
          ? "qwen/qwen3.8-27b"
          : "openai/gpt-oss-20b",

        messages,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || "Could not get an AI response."
    );
  }

  const answer = data.choices?.[0]?.message?.content;

  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("The AI returned an empty response.");
  }

  return answer;
};

export default apiResponse;
