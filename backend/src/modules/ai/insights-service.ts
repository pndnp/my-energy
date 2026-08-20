import { openaiClient } from "./openai-provider.js";
import { buildContext, buildPrompt } from "./context-builder.js";
import { z } from "zod";
import prisma from "../../db/index.js";

const SCHEMA = 30 * 60 * 1000; //

export interface InsightResponse {
  type: string;
  title: string;
  description: string;
  confidence: "high" | "medium" | "low";
}

export interface Experiment {
  title: string;
  description: string;
}

export interface InsightsResult {
  insights: InsightResponse[];
  experiment: Experiment;
  lastGeneratedAt: Date;
}

const responseSchema = z.object({
  insights: z.array(z.object({
    type: z.string(),
    title: z.string(),
    description: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
  })),
  experiment: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

export async function generateInsights(userId: string, periodDays = 30): Promise<InsightsResult> {
  // Check cache first
  const cached = await prisma.aiInsight.findFirst({
    where: { userId, periodDays },
  });

  if (cached && cached.generatedAt) {
    const age = Date.now() - cached.generatedAt.getTime();
    if (age < SCHEMA) {
      return {
        insights: JSON.parse(cached.insightsJSON),
        experiment: JSON.parse(cached.experimentJSON),
        lastGeneratedAt: cached.generatedAt,
      };
    }
  }

  // Fetch logs
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - periodDays);

  const logs = await prisma.dailyLog.findMany({
    where: {
      userId,
      date: { gte: start, lte: today },
    },
    orderBy: { date: "asc" },
  });

  if (logs.length < 7) {
    return {
      insights: [{
        type: "general",
        title: "Недостаточно данных",
        description: `Заполнено только ${logs.length} дней. Нужно минимум 7 для надёжных наблюдений. Продолжайте вести дневник!`,
        confidence: "low",
      }],
      experiment: { title: "Начните ведение", description: "Заполняйте дневник хотя бы три дня в неделю." },
      lastGeneratedAt: new Date(),
    };
  }

  // Build context & prompt
  const context = buildContext(logs, periodDays);
  const promptText = buildPrompt(context);

  try {
    const completion = await openaiClient.chat.completions.create({
      model: process.env.LLM_MODEL || "gpt-oss-120b",
      messages: [
        { role: "system", content: "Ты аналитик привычек. Отвечай ТОЛЬКО валидным JSON." },
        { role: "user", content: promptText },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("Empty response");

    // Extract JSON from possible markdown code blocks
    let jsonStr = content;
    const markdownMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (markdownMatch) {
      jsonStr = markdownMatch[1].trim();
    }

    // Try parsing with retries for malformed JSON
    let parsed: any;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        parsed = JSON.parse(jsonStr);
        break;
      } catch (parseErr) {
        if (attempt === maxRetries - 1) throw parseErr;
        // Try to fix common JSON issues
        console.warn(`JSON parse attempt ${attempt + 1} failed, retrying...`);
        jsonStr = jsonStr.replace(/,[\s]*}/g, '}').replace(/,[\s]*/g, ']').replace(/\/\/.*$/gm, '');
      }
    }

    const result = responseSchema.parse(parsed);

    // Cache result
    await prisma.aiInsight.upsert({
      where: {
        userId_periodDays: { userId, periodDays },
      },
      update: {
        insightsJSON: JSON.stringify(result.insights),
        experimentJSON: JSON.stringify(result.experiment),
        generatedAt: new Date(),
      },
      create: {
        userId,
        periodDays,
        insightsJSON: JSON.stringify(result.insights),
        experimentJSON: JSON.stringify(result.experiment),
      },
    });

    return { ...result, lastGeneratedAt: new Date() };
  } catch (err) {
    console.error("AI generation error:", err);
    return {
      insights: [{
        type: "general",
        title: "Ошибка генерации",
        description: "Не удалось сгенерировать наблюдения. Попробуйте позже.",
        confidence: "low",
      }],
      experiment: { title: "", description: "" },
      lastGeneratedAt: new Date(),
    };
  }
}
