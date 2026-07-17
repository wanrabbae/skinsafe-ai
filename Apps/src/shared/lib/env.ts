import "server-only";

import { z } from "zod";

const aiServerEnvSchema = z.object({
  AI_SERVICE_URL: z.string().url(),
  AI_SERVICE_TOKEN: z.string().min(1).optional(),
});

export function getAiServerEnv() {
  return aiServerEnvSchema.parse({
    AI_SERVICE_URL: process.env.AI_SERVICE_URL,
    AI_SERVICE_TOKEN: process.env.AI_SERVICE_TOKEN || undefined,
  });
}
