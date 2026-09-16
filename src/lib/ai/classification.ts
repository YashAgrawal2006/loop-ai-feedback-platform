import { z } from "zod";

export const feedbackClassificationSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  category: z.enum([
    "product",
    "service",
    "support",
    "pricing",
    "performance",
    "user_experience",
    "feature_request",
    "other",
  ]),
  theme: z.string().min(1).max(100),
  urgency: z.enum(["low", "medium", "high"]),
  priority: z.enum(["low", "medium", "high"]),
  summary: z.string().min(1).max(300),
});

export type FeedbackClassification = z.infer<
  typeof feedbackClassificationSchema
>;