import { gemini, GEMINI_MODEL } from "../gemini";
import { searchSimilarFeedback } from "./search-similar-feedback";

type AskLoopInput = {
  question: string;
  workspaceId: string;
};

type AskLoopSource = {
  sourceNumber: number;
  feedbackId: string;
  customerLabel: string;
  content: string;
  channel: string;
  sentiment: string | null;
  category: string | null;
  theme: string | null;
  priority: string | null;
  similarity: number;
  createdAt: Date;
};

export async function askLoop({
  question,
  workspaceId,
}: AskLoopInput) {
  const normalizedQuestion = question.trim();

  if (!normalizedQuestion) {
    throw new Error("Question cannot be empty.");
  }

  // Retrieve feedback that is semantically relevant
  // to the user's question.
  const results = await searchSimilarFeedback({
    query: normalizedQuestion,
    workspaceId,
    limit: 5,
  });

  if (results.length === 0) {
    return {
      answer:
        "I could not find enough relevant customer feedback to answer this question.",
      sources: [],
    };
  }

  // Build grounded context from real feedback records.
  const context = results
    .map(
      (result, index) => `
SOURCE ${index + 1}
Feedback ID: ${result.feedbackId}
Customer: ${result.customerLabel}
Channel: ${result.channel}
Sentiment: ${result.sentiment ?? "unknown"}
Category: ${result.category ?? "unknown"}
Theme: ${result.theme ?? "unknown"}
Priority: ${result.priority ?? "unknown"}
Similarity: ${result.similarity.toFixed(4)}

Customer feedback:
${result.content}
`
    )
    .join("\n---\n");

  const prompt = `
You are LOOP, an AI-powered Customer Feedback Intelligence assistant.

Answer the user's question using ONLY the customer feedback provided
in the context below.

IMPORTANT RULES:
- Do not invent facts.
- Do not use outside knowledge.
- If the provided feedback does not contain enough information to answer,
  clearly say that the available feedback is insufficient.
- Summarize patterns across the feedback when appropriate.
- Keep the answer concise and useful for a business analyst.
- When making a claim based on a source, refer to it as [Source 1],
  [Source 2], etc.
- Only cite sources that actually support the claim.
- Do not create source numbers that are not present in the context.

USER QUESTION:
${normalizedQuestion}

CUSTOMER FEEDBACK CONTEXT:
${context}
`;

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  const answer = response.text?.trim();

  if (!answer) {
    throw new Error("Gemini returned an empty Ask LOOP response.");
  }

  const sources: AskLoopSource[] = results.map(
    (result, index) => ({
      sourceNumber: index + 1,
      feedbackId: result.feedbackId,
      customerLabel: result.customerLabel,
      content: result.content,
      channel: result.channel,
      sentiment: result.sentiment,
      category: result.category,
      theme: result.theme,
      priority: result.priority,
      similarity: result.similarity,
      createdAt: result.createdAt,
    })
  );

  return {
    answer,
    sources,
  };
}