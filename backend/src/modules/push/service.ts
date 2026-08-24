// web-push — CJS: именованные экспорты через .bind() не распознаются анализатором
// CJS→ESM в Node (доступны только WebPushError и default), поэтому берём из default

import type { PushSubscription } from "web-push";
import webPush, { WebPushError } from "web-push";
import prisma from "../../db/index.js";
import type { SubscriptionInput } from "./schema.js";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) {
    return;
  }
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set");
  }
  webPush.setVapidDetails(contact, publicKey, privateKey);
  vapidConfigured = true;
}

export function getAppTimezone(): string {
  return process.env.APP_TIMEZONE ?? "Europe/Moscow";
}

export function getAppDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZone: getAppTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

interface PushPayload {
  title: string;
  body: string;
  icon: string;
  url: string;
}

async function sendToSubscription(
  subscriptionId: string,
  subscription: PushSubscription,
  payload: PushPayload,
  markSent = true,
) {
  ensureVapid();
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload), { TTL: 3600 });
    if (markSent) {
      await prisma.pushSubscription.update({
        where: { id: subscriptionId },
        data: { lastReminderSent: new Date() },
      });
    }
    return { sent: true };
  } catch (err) {
    if (err instanceof WebPushError && (err.statusCode === 410 || err.statusCode === 404)) {
      await prisma.pushSubscription.deleteMany({ where: { id: subscriptionId } });
      return { sent: false, removed: true };
    }
    console.error(`[push] send failed for subscription ${subscriptionId}:`, err);
    return { sent: false };
  }
}

async function upsertSubscription(
  userId: string,
  input: SubscriptionInput,
): Promise<{ created: boolean }> {
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: input.endpoint },
  });
  if (existing) {
    await prisma.pushSubscription.update({
      where: { id: existing.id },
      data: {
        userId,
        p256dhKey: input.keys.p256dh,
        authSecret: input.keys.auth,
      },
    });
    return { created: false };
  }
  await prisma.pushSubscription.create({
    data: {
      userId,
      endpoint: input.endpoint,
      p256dhKey: input.keys.p256dh,
      authSecret: input.keys.auth,
    },
  });
  return { created: true };
}

async function removeByEndpoint(userId: string, endpoint: string): Promise<boolean> {
  const result = await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
  return result.count > 0;
}

export interface ReminderRunResult {
  totalUsers: number;
  reminded: number;
  sent: number;
  skipped: number;
  failed: number;
  removed: number;
}

export async function runDailyReminder(now: Date = new Date()): Promise<ReminderRunResult> {
  const todayApp = getAppDateString(now);
  const result: ReminderRunResult = {
    totalUsers: 0,
    reminded: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    removed: 0,
  };

  const users = await prisma.user.findMany({ where: { pushNotificationsEnabled: true } });
  result.totalUsers = users.length;

  const payload: PushPayload = {
    title: "Незаполненный дневник",
    body: "Напоминание: заполните показатели за сегодня",
    icon: "/icons/icon-192.png",
    url: "/dashboard",
  };

  for (const user of users) {
    // Дневники хранят дату как полуночь UTC строки YYYY-MM-DD — сверяемся с тем же форматом
    const todayLogStart = new Date(`${todayApp}T00:00:00.000Z`);
    const hasLog = await prisma.dailyLog.findFirst({
      where: { userId: user.id, date: todayLogStart },
      select: { id: true },
    });
    if (hasLog) {
      continue;
    }

    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
    if (subscriptions.length === 0) {
      continue;
    }

    let remindedThisUser = false;
    for (const subscription of subscriptions) {
      if (
        subscription.lastReminderSent !== null &&
        getAppDateString(subscription.lastReminderSent) === todayApp
      ) {
        result.skipped += 1;
        continue;
      }
      const outcome = await sendToSubscription(
        subscription.id,
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dhKey, auth: subscription.authSecret },
        },
        payload,
      );
      if (outcome.sent) {
        result.sent += 1;
        remindedThisUser = true;
      } else {
        if (outcome.removed) {
          result.removed += 1;
        }
        if (!outcome.removed) {
          result.failed += 1;
        }
      }
    }
    if (remindedThisUser) {
      result.reminded += 1;
    }
  }

  console.log(`[push] daily reminder (${todayApp}):`, result);
  return result;
}

export interface TestPushResult {
  totalSubscriptions: number;
  sent: number;
  failed: number;
  removed: number;
}

// Только для ручной проверки push-конвейера (тестовый пуш без изменения lastReminderSent)
export async function sendTestPush(
  userId: string,
  payload: { title?: string; body?: string },
): Promise<TestPushResult> {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  const result: TestPushResult = {
    totalSubscriptions: subscriptions.length,
    sent: 0,
    failed: 0,
    removed: 0,
  };
  const testPayload: PushPayload = {
    title: payload.title ?? "Тестовое уведомление",
    body: payload.body ?? "Если вы видите это — Web Push работает!",
    icon: "/icons/icon-192.png",
    url: "/dashboard",
  };
  for (const subscription of subscriptions) {
    const outcome = await sendToSubscription(
      subscription.id,
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dhKey, auth: subscription.authSecret },
      },
      testPayload,
      false,
    );
    if (outcome.sent) {
      result.sent += 1;
    } else if (outcome.removed) {
      result.removed += 1;
    } else {
      result.failed += 1;
    }
  }
  console.log(`[push] test push for user ${userId}:`, result);
  return result;
}

export { upsertSubscription, removeByEndpoint };
