// @ts-check
import { z } from "zod";

export const socketConnectionAuth = z.object({
  gameId: z.string().length(4),
  sessionId: z.string().length(16).nullable(),
});

export const gameOptionsSchema = z.object({
  showValuesOnPictureCards: z.boolean(),
  canSnapOtherPlayers: z.boolean(),
  openHands: z.boolean(),
});

/**
 * Card position
 */
const deckPosition = z.object({ area: z.literal("deck") });

const pilePosition = z.object({ area: z.literal("pile") });

const tablePosition = z.object({
  area: z.literal("table"),
  player: z.number(),
  tableSlot: z.number(),
});

const viewingPosition = z.object({
  area: z.literal("viewing"),
  player: z.number(),
  viewingSlot: z.number(),
});

export const cardPositionSchema = z.union([
  deckPosition,
  pilePosition,
  tablePosition,
  viewingPosition,
]);

/**
 * Schemas for the game update objects sent by the client
 */
const setNameUpdateSchema = z.object({
  action: z.literal("setName"),
  name: z.string().min(1).max(15),
});

const leaveUpdateSchema = z.object({
  action: z.literal("leave"),
});

const indicateReadyUpdateSchema = z.object({
  action: z.literal("indicateReady"),
});

const snapUpdateSchema = z.object({
  action: z.literal("snap"),
});

const tapCardUpdateSchema = z.object({
  action: z.literal("tapCard"),
  cardPosition: cardPositionSchema
});

const passUpdateSchema = z.object({
  action: z.literal("pass"),
});

const cambioUpdateSchema = z.object({
  action: z.literal("cambio"),
});

const requestRematchUpdateSchema = z.object({
  action: z.literal("requestRematch"),
});

const gameId = z.object({
  gameId: z.string().length(4),
});

// Explanation of Slightly annoying structure here:
// https://github.com/colinhacks/zod/issues/147
export const updateSchema = z.union([
  gameId.merge(setNameUpdateSchema),
  gameId.merge(indicateReadyUpdateSchema),
  gameId.merge(leaveUpdateSchema),
  gameId.merge(snapUpdateSchema),
  gameId.merge(tapCardUpdateSchema),
  gameId.merge(passUpdateSchema),
  gameId.merge(cambioUpdateSchema),
  gameId.merge(requestRematchUpdateSchema),
]);
