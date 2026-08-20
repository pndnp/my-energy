import OpenAI from "openai";

const API_KEY = process.env.LLM_API_KEY;
const BASE_URL = process.env.LLM_BASE_URL
if (!API_KEY) {
  throw new Error("LLM_API_KEY is required");
}
if (!BASE_URL) {
  throw new Error("LLM_BASE_URL is required");
}

export const openaiClient = new OpenAI({
  apiKey: API_KEY,
  baseURL: BASE_URL,
});
