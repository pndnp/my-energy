import type { Prisma } from "@prisma/client";
import prisma from "../../db/index.js";
import type { DailyLogInput, PartialDailyLogInput } from "./schema.js";

export interface DailyLogResponse {
  id: string;
  userId: string;
  date: string;
  sleep: number;
  nutrition: number;
  caffeine: number;
  alcohol: number;
  activity: number;
  mood: number;
  wellbeing: number;
  stress: number;
  energy: number;
  createdAt: string;
  updatedAt: string;
}

function toResponse(log: Prisma.DailyLogGetPayload<{ include: {} }>): DailyLogResponse {
  return {
    id: log.id,
    userId: log.userId,
    date: log.date.toISOString().split("T")[0], // Return YYYY-MM-DD format
    sleep: log.sleep,
    nutrition: log.nutrition,
    caffeine: log.caffeine,
    alcohol: log.alcohol,
    activity: log.activity,
    mood: log.mood,
    wellbeing: log.wellbeing,
    stress: log.stress,
    energy: log.energy,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  };
}

async function create(userId: string, data: DailyLogInput): Promise<DailyLogResponse> {
  const date = new Date(data.date);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  const log = await prisma.dailyLog.create({
    data: {
      userId,
      date,
      sleep: data.sleep,
      nutrition: data.nutrition,
      caffeine: data.caffeine,
      alcohol: data.alcohol,
      activity: data.activity,
      mood: data.mood,
      wellbeing: data.wellbeing,
      stress: data.stress,
      energy: data.energy,
    },
  });

  return toResponse(log);
}

async function upsert(userId: string, data: DailyLogInput): Promise<DailyLogResponse> {
  const date = new Date(data.date);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  const log = await prisma.dailyLog.upsert({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
    update: {
      sleep: data.sleep,
      nutrition: data.nutrition,
      caffeine: data.caffeine,
      alcohol: data.alcohol,
      activity: data.activity,
      mood: data.mood,
      wellbeing: data.wellbeing,
      stress: data.stress,
      energy: data.energy,
    },
    create: {
      userId,
      date,
      sleep: data.sleep,
      nutrition: data.nutrition,
      caffeine: data.caffeine,
      alcohol: data.alcohol,
      activity: data.activity,
      mood: data.mood,
      wellbeing: data.wellbeing,
      stress: data.stress,
      energy: data.energy,
    },
  });

  return toResponse(log);
}

async function getByDate(userId: string, dateStr: string): Promise<DailyLogResponse | null> {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return null;
  }

  const log = await prisma.dailyLog.findFirst({
    where: {
      userId,
      date,
    },
  });

  if (!log) {
    return null;
  }

  return toResponse(log);
}

async function updatePartial(
  userId: string,
  dateStr: string,
  data: PartialDailyLogInput,
): Promise<DailyLogResponse> {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  const metricKeys: (keyof PartialDailyLogInput)[] = [
    "sleep",
    "nutrition",
    "caffeine",
    "alcohol",
    "activity",
    "mood",
    "wellbeing",
    "stress",
    "energy",
  ];

  const existing = await getByDate(userId, dateStr);
  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  const updateData: Prisma.DailyLogUpdateInput = {};

  for (const key of metricKeys) {
    if (data[key] !== undefined) {
      (updateData as Record<string, unknown>)[key] = data[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return existing;
  }

  const log = await prisma.dailyLog.update({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
    data: updateData as Prisma.DailyLogUpdateArgs["data"],
  });

  return toResponse(log);
}

async function listByRange(
  userId: string,
  from: string,
  to: string,
): Promise<DailyLogResponse[]> {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new Error("Invalid date range");
  }

  const logs = await prisma.dailyLog.findMany({
    where: {
      userId,
      date: {
        gte: fromDate,
        lte: toDate,
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  return logs.map(toResponse);
}

export { create, upsert, getByDate, updatePartial, listByRange, toResponse };
