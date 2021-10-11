// @ts-check
import gameManager from "../gameManager";
import { gameOptionsSchema } from "../schemas";

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').NextFunction} Next */
/** @typedef {import('http').ServerResponse} Response */
export async function post(
  /** @type Request */ req,
  /** @type Response */ res,
  /** @type Next */ next
) {
  const result = gameOptionsSchema.safeParse(req.body);

  if (result.success == false) {
    console.log(result.error);
    next();
  } else {
    const gameId = gameManager.createGame(result.data);
    res.end(JSON.stringify({ gameId: gameId }));
  }
}
