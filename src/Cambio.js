// @ts-check
/** @typedef {import('./types').PlayerData} PlayerData */
/** @typedef {import('./types').SendStateToSession} SendStateToSession */
/** @typedef {import('./types').Update} Update */
export default class Cambio {
  /**
   * @param {string} id
   * @param {SendStateToSession} sendStateToSession
   * @param {import('./types').GameOptions} options
   */
  constructor(id, sendStateToSession, options) {
    this.id = id;
    this.sendStateToSession = sendStateToSession;
    this.options = options;
    // TODO: Remove
    this.count = 1;
    this.clientStateId = 0;
    /** @type {import('./types').Events} */
    this.events = [];
    /** @type {Map<string, PlayerData>} Players */
    this.players = new Map();
    /** @type {import('./types').State} */
    this.state = "settingUp";
    /** @type {boolean} */
    this.isApplyingUpdate = false;
    /** @type {Array<{sessionId: string, data: Update}>} */
    this.updateQueue = [];
    this.permittedUpdates = {
      settingUp:	["setName", "indicateReady", "leave"],
      initialViewing:	["snap", "leave"],
      snapSuspension:	["tapCard", "leave"],
      startingTurn:	["tapCard", "snap", "cambio", "pass", "leave"],
      awaitingDeckSwapChoice:	["tapCard", "snap", "leave"],
      awaitingPileSwapChoice:	["tapCard", "snap", "leave"],
      awaitingMateLookChoice:	["tapCard", "snap", "leave"],
      previewingCard:	["snap", "leave"],
      awaitingMineLookChoice:	["tapCard", "snap", "leave"],
      awaitingQueenLookChoice:	["tapCard", "snap", "leave"],
      awaitingQueenSwapOwnChoice:	["tapCard", "snap", "leave"],
      awaitingQueenSwapOtherChoice:	["tapCard", "snap", "leave"],
      awaitingBlindSwapOwnChoice:	["tapCard", "snap", "leave"],
      awaitingBlindSwapOtherChoice:	["tapCard", "snap", "leave"],
      gameOver:	["requestRematch", "leave"],
      exit:	[],
      // TODO: Including "leave" in these is probably meaningless because the updates are gated when
      // they are processed, not when they are receieved and the game will never be in this state
      // when that happens
      resolvingSnap:	["leave"],
      finishingDeckSwap:	["leave"],
      finishingPileSwap:	["leave"],
      startingSpecialPower:	["leave"],
    }
  }

  /** @param {string} sessionId */
  addPlayer(sessionId) {
    return new Promise(
      /** @type {() => void} */ (resolve) => {
        const isExistingPlayer = this.players.has(sessionId);
        const isGameUnderway = this.state !== "settingUp";

        // If the game's going and you're not in it, reject
        if (isGameUnderway && !isExistingPlayer) {
          throw new Error("Game is already underway");
        }

        const existingPlayerData = this.players.get(sessionId);
        /** @type {PlayerData} */
        let updatedPlayerData = {};
        if (existingPlayerData) {
          updatedPlayerData = { ...existingPlayerData };
        } else {
          // If there's no existing player, make sure name is null
          updatedPlayerData.name = null;
        }
        // Set connected to true either way
        updatedPlayerData.connected = true;

        this.players.set(sessionId, updatedPlayerData);

        console.log(`Adding player ${sessionId}`);
        resolve(this.sendStateToAll());
      }
    );
  }

  getAndEmptyEventQueue() {
    const currentEvents = this.events;
    this.events = [];
    return currentEvents;
  }

  /** @returns {string[]} sessionIds */
  getPlayerSessionIds() {
    const playerArray = [];
    for (const key of this.players.keys()) {
      playerArray.push(key);
    }
    return playerArray;
  }

  getState() {
    return this.state;
  }

  /**
   * @param {string} sessionId
   * @param {boolean} isConnected
   */
  setPlayerConnectionStatus(sessionId, isConnected) {
    console.log(`Try to set ${sessionId} connection status to ${isConnected}`);
    const playerData = this.players.get(sessionId);
    if (playerData) {
      let updatedPlayerData = { ...playerData };
      updatedPlayerData.connected = isConnected;
      if (playerData.name && isConnected !== playerData.connected) {
        this.events.push({
          type: "text",
          message: `${playerData.name} ${
            isConnected ? "connected" : "disconnected"
          }`,
        });
      }
      this.players.set(sessionId, updatedPlayerData);
      // TODO: Will this cause problems? Could it send the state in a mangled format by being triggered
      // during another operation is this.isApplyingUpdate?
      this.sendStateToAll();
    }
  }

  /** @returns {Promise<void>} */
  sendStateToAll() {
    return new Promise((resolve) => {
      this.clientStateId++;
      const flattenedPlayerData = [];
      for (const [key, value] of this.players.entries()) {
        if (value && value.name)
          flattenedPlayerData.push({
            sessionId: key,
            ...value,
          });
      }

      const events = this.getAndEmptyEventQueue();

      for (const sessionId of this.players.keys()) {
        const playerDetails = this.players.get(sessionId);
        const clientState = {
          clientStateId: this.clientStateId,
          gameId: this.id,
          name: playerDetails ? playerDetails.name : null,
          count: this.count,
          players: flattenedPlayerData,
          options: this.options,
          events,
        };
        this.sendStateToSession(sessionId, clientState);
      }

      resolve();
    });
  }

  /**
   * @param {string} sessionId
   * @param {Update} update
   */
  update(sessionId, update) {
    if (!this.players.has(sessionId)) return;
    this.updateQueue.push({
      sessionId: sessionId,
      data: update,
    });
    if (!this.isApplyingUpdate) {
      this.processUpdateQueue();
    }
  }

  processUpdateQueue() {
    this.isApplyingUpdate = true;
    const update = this.updateQueue.shift();
    if (update) {
      this.handleUpdate(update.sessionId, update.data).then(() => {
        if (this.updateQueue.length > 0) {
          return this.processUpdateQueue();
        } else {
          this.isApplyingUpdate = false;
        }
      });
    }
  }

  /**
   * @param {string} sessionId
   * @param {Update} update
   */
  handleUpdate(sessionId, update) {
    return new Promise((resolve) => {
      if (update.action === "setName") {
        const existingPlayerData = this.players.get(sessionId);
        if (existingPlayerData) {
          const updatedPlayerData = { ...existingPlayerData };
          updatedPlayerData.name = update.name;
          this.players.set(sessionId, updatedPlayerData);
        }
      }
      
      // TODO: Remove
      if (update.action === "plusOne") {
        this.count++;
        const moduloTen = this.count % 10;
        if (moduloTen == 0 && this.count > 1) {
          this.events.push({
            type: "text",
            message: "Wow, another ten clicks hey !!",
          });
        }
      }

      if (update.action === "leave") {
        const player = this.players.get(sessionId);
        if (player) {
          this.events.push({
            type: "text",
            message: `${player.name} left the game`,
          });
        }
        this.state = "exit";
        this.players.delete(sessionId);
      }

      resolve(this.sendStateToAll());
    });
  }
}
