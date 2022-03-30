// @ts-check
import Cambio from "./Cambio";
import crypto from "crypto";

const randomId = () => crypto.randomBytes(8).toString("hex");

/** @typedef {{ connected: boolean, sockets: string[], disconnectedTime?: string }} SessionData */
class GameManager {
  constructor() {
    /** @type {Map<string, Cambio>} */
    this.games = new Map();
    /** @type {Map<string, SessionData>} */
    this.sessions = new Map();
    /** @type {import('./types').SendStateToSession} */
    this.sendStateToSession;
  }

  /**
   * attachIoServer
   * @param {import('socket.io').Server} ioServer - Register your instance of the Socket-IO server
   * so the game manager can internally send updates to clients */
  attachIoServer(ioServer) {
    this.sendStateToSession = (sessionId, clientState) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.sockets.forEach((socketId) => {
          ioServer.to(socketId).emit("update", clientState);
        });
      }
    };
  }

  cleanUp() {
    const msWaitAfterDisconnect = 60 * 60 * 1000;
    let count = 0;
    for (const [key, value] of this.games.entries()) {
      let readyForDeletion = false;
      if (value.getState() === "exit") readyForDeletion = true;
      const associatedSessions = /** @type {SessionData[]} */ (
        value
          .getPlayerSessionIds()
          .map((sessionId) => this.sessions.get(sessionId))
      );
      const sessionHasConnectedPlayer = associatedSessions
        .map((session) => {
          return session ? session.connected : false;
        })
        .includes(true);
      if (!sessionHasConnectedPlayer) {
        /** @type {(a: string | undefined , b: string | undefined) => number} */
        const newestFirst = (a, b) => {
          if (!a) {
            return -1;
          } else if (!b) {
            return 1;
          } else {
            return new Date(b).valueOf() - new Date(a).valueOf();
          }
        };
        const mostRecentDisconnect = associatedSessions
          .map((session) => session.disconnectedTime)
          .sort(newestFirst)[0];
        if (mostRecentDisconnect) {
          const msSinceMostRecentDisconnect =
            new Date().valueOf() - new Date(mostRecentDisconnect).valueOf();
          if (msSinceMostRecentDisconnect > msWaitAfterDisconnect)
            readyForDeletion = true;
        }
      }
      if (readyForDeletion) {
        this.games.delete(key);
        count++;
      }
    }

    console.log(
      `Game manager clean up: Complete. Removed ${count} game${
        count === 1 ? "" : "s"
      }. ${1000 - this.games.size} game ids are available`
    );
  }

  /**
   * connectSocketToSession
   * @param {string | null} sessionId
   * @param {string} socketId
   * @returns {{idStatus: 'exists' | 'created', sessionId: string}}
   */
  connectSocketToSession(sessionId, socketId) {
    let confirmedSessionId = sessionId || randomId();
    const existingSessionData = sessionId
      ? this.sessions.get(sessionId)
      : undefined;

    /** @type {SessionData} */
    let updatedSessionData = {};

    if (existingSessionData) {
      updatedSessionData = { ...existingSessionData };
      updatedSessionData.sockets.push(socketId);
    } else {
      updatedSessionData.sockets = [socketId];
    }

    updatedSessionData.connected = true;

    this.sessions.set(confirmedSessionId, updatedSessionData);

    return {
      idStatus: existingSessionData ? "exists" : "created",
      sessionId: confirmedSessionId,
    };
  }

  /**
   * Creates a new game instance and returns its id
   * @param {import('../src/types').GameOptions} options
   * @returns {string} gameId
   */
  createGame(options) {
    // Cleaning up old games every time we create a new one is the simplest way to
    // ensure it happens regularly without creating a seperate interval task system
    this.cleanUp();
    let newGameId = this.getUnusedId();
    this.games.set(
      newGameId,
      new Cambio(newGameId, this.sendStateToSession, options)
    );
    return newGameId;
  }

  /**
   * @param {string} sessionId
   * @param {string} disconnectingSocketId
   */
  disconnectSocketFromSession(sessionId, disconnectingSocketId) {
    const sessionData = this.sessions.get(sessionId);
    if (sessionData) {
      let updatedSessionData = { ...sessionData };
      updatedSessionData.sockets = sessionData.sockets.filter(
        (socketId) => socketId !== disconnectingSocketId
      );

      const sessionHasNoSockets = updatedSessionData.sockets.length === 0;

      if (sessionHasNoSockets) {
        updatedSessionData.connected = false;
        updatedSessionData.disconnectedTime = new Date().toISOString();
      }

      this.sessions.set(sessionId, updatedSessionData);
      this.pushSessionStatusToGames(sessionId);
    }
  }

  getUnusedId() {
    let id = Math.random().toString().substr(2, 4);
    while (this.games.has(id)) {
      let id = Math.random().toString().substr(2, 4);
    }
    return id;
  }

  /**
   * pushSessionStatusToGames
   * Finds all the games sessionId is playing in and mark their status as 'connected' or 'disconnected'
   * @param {string} sessionId
   */
  pushSessionStatusToGames(sessionId) {
    const session = this.sessions.get(sessionId);

    if (session) {
      const sessionStatus = session.connected;
      for (const value of this.games.values()) {
        const sessionIdsInGame = value.getPlayerSessionIds();
        if (sessionIdsInGame.includes(sessionId)) {
          value.setPlayerConnectionStatus(sessionId, sessionStatus);
        }
      }
    }
  }

  /**
   * @param {string} sessionId
   * @param {string} gameId
   * @returns {Promise<void | Error>}
   */
  tryJoiningGame(sessionId, gameId) {
    const game = this.games.get(gameId);
    if (!game) {
      return Promise.reject(new Error("Game does not exist"));
    }
    return game.addPlayer(sessionId);
  }

  /**
   * @param {string} sessionId sessionId of the player sending the update
   * @param {import('./types').Update} update object containing update
   */
  update(sessionId, update) {
    const game = this.games.get(update.gameId);
    if (game) game.update(sessionId, update);
  }
}

const gameManager = new GameManager();

export default gameManager;
