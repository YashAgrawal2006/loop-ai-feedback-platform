import { gemini, GEMINI_MODEL } from "../gemini";
import {
  feedbackClassificationSchema,
  type FeedbackClassification,
} from "./classification";

export async function classifyFeedback(
  feedback: string
): Promise<FeedbackClassification> {
  const prompt = `
You are the AI feedback classification engine for LOOP, an AI-powered
Customer Feedback Intelligence Platform.

Analyze the customer feedback below and classify it accurately.

Rules:
- sentiment must be positive, neutral, or negative.
- category must be one of:
  product, service, support, pricing, performance,
  user_experience, feature_request, other.
- theme should be a short, meaningful theme describing the main issue or topic.
- urgency describes how urgently the customer issue needs attention.
- priority describes how important the issue is for the business.
- summary must be a concise summary of the feedback.
- Do not invent information that is not present in the feedback.

Customer feedback:
"${feedback}"
`;

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: zodToJsonSchema(),
    },
  });

  const rawText = response.text;

  if (!rawText) {
    throw new Error("Gemini returned an empty classification response.");
  }

  const parsed = JSON.parse(rawText);

  return feedbackClassificationSchema.parse(parsed);
}

function zodToJsonSchema() {
  return {
    type: "object",
    properties: {
      sentiment: {
        type: "string",
        enum: ["positive", "neutral", "negative"],
      },
      category: {
        type: "string",
        enum: [
          "product",
          "service",
          "support",
          "pricing",
          "performance",
          "user_experience",
          "feature_request",
          "other",
        ],
      },
      theme: {
        type: "string",
      },
      urgency: {
        type: "string",
        enum: ["low", "medium", "high"],
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high"],
      },
      summary: {
        type: "string",
      },
    },
    required: [
      "sentiment",
      "category",
      "theme",
      "urgency",
      "priority",
      "summary",
    ],
  };
}