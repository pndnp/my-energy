import { z } from "zod";

export const subscriptionSchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
