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

const bpomEnvSchema = z.object({
  API_INDONESIA_API_KEY: z.string().min(1),
  API_INDONESIA_API_BPOM_URL: z.string().url(),
});

export function getBpomEnv() {
  return bpomEnvSchema.parse({
    API_INDONESIA_API_KEY: process.env.API_INDONESIA_API_KEY,
    API_INDONESIA_API_BPOM_URL: process.env.API_INDONESIA_API_BPOM_URL,
  });
}

