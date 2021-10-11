// @ts-check
import { z } from "zod";

export const socketConnectionAuth = z.object({
  gameId: z.string().length(4),
  sessionId: z.string().length(16).nullable(),
});

export const gameOptionsSchema = z.object({
  explosions: z.boolean(),
  soundEffects: z.boolean(),
});

const leaveUpdateSchema = z.object({
  action: z.literal("leave"),
});

const setNameUpdateSchema = z.object({
  action: z.literal("setName"),
  name: z.string().min(1).max(15),
});

const plusOneUpdateSchema = z.object({
  action: z.literal("plusOne"),
});

const gameId = z.object({
  gameId: z.string().length(4),
});

// Explanation of Slightly annoying structure here:
// https://github.com/colinhacks/zod/issues/147
export const updateSchema = z.union([
  gameId.merge(plusOneUpdateSchema),
  gameId.merge(setNameUpdateSchema),
  gameId.merge(leaveUpdateSchema),
]);
