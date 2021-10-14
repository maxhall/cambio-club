// @ts-check
import { shuffledDeck, shuffle } from "./deck";

/** @typedef {import('./types').PlayerData} PlayerData */
/** @typedef {import('./types').SendStateToSession} SendStateToSession */
/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Update} Update */
/** @typedef {import('./types').Card} Card */
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
    this.currentTurnTablePosition = 0;
    this.clientStateId = 0;
    /** @type {import('./types').Events} */
    this.events = [];
    /** @type {Map<string, PlayerData>} Players */
    this.players = new Map();
    /** @type {State} */
    this.state = "settingUp";
    /** @type {boolean} */
    this.isApplyingUpdate = false;
    /** @type {Array<{sessionId: string, data: Update}>} */
    this.updateQueue = [];
    /** @type {Card[]} */
    this.hiddenDeck = [];
    /** @type {Card[]} */
    this.hiddenPile = [];
    /** @type {Card[]} */
    this.positionedCards = [];
    /** @type {import('./types').PermittedUpdates} */
    this.permittedUpdates = {
      settingUp: ["setName", "indicateReady", "leave"],
      dealing: ["leave"],
      initialViewing: ["snap", "leave"],
      snapSuspension: ["tapCard", "leave"],
      startingTurn: ["tapCard", "snap", "cambio", "pass", "leave"],
      awaitingDeckSwapChoice: ["tapCard", "snap", "leave"],
      awaitingPileSwapChoice: ["tapCard", "snap", "leave"],
      awaitingMateLookChoice: ["tapCard", "snap", "leave"],
      previewingCard: ["snap", "leave"],
      awaitingMineLookChoice: ["tapCard", "snap", "leave"],
      awaitingQueenLookChoice: ["tapCard", "snap", "leave"],
      awaitingQueenSwapOwnChoice: ["tapCard", "snap", "leave"],
      awaitingQueenSwapOtherChoice: ["tapCard", "snap", "leave"],
      awaitingBlindSwapOwnChoice: ["tapCard", "snap", "leave"],
      awaitingBlindSwapOtherChoice: ["tapCard", "snap", "leave"],
      gameOver: ["requestRematch", "leave"],
      exit: [],
      // TODO: Including "leave" in these is probably meaningless because the updates are gated when
      // they are processed, not when they are receieved and the game will never be in this state
      // when that happens
      resolvingSnap: ["leave"],
      finishingDeckSwap: ["leave"],
      finishingPileSwap: ["leave"],
      startingSpecialPower: ["leave"],
    };
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

  deal() {
    return new Promise((resolve) => {
      this.state = "dealing";
      // Make a array of indices for each table position and shuffle it
      /** @type {number[]} */
      const shuffledNumbers = shuffle(
        new Array(this.players.size).fill(null).map((_, i) => i)
      );
      // TODO: If there are X amount of players, deal two decks
      this.deck = shuffledDeck();
      for (const [key, value] of this.players.entries()) {
        const playerData = this.players.get(key);
        const tablePosition = /** @type {number} */ (shuffledNumbers.pop());
        if (playerData) {
          const updatedPlayerData = { ...playerData };
          if (typeof tablePosition === "number")
            updatedPlayerData.tablePosition = tablePosition;
          this.players.set(key, updatedPlayerData);
        }

        // Indexes for the middle four cards of the two rows of four
        [1, 2, 5, 6].forEach((tableSlot) => {
          if (this.deck) {
            const drawnCard = this.deck.shift();
            if (drawnCard) {
              /** @type {Card} */
              const positionedCard = {
                ...drawnCard,
                position: {
                  player: tablePosition,
                  area: "table",
                  tableSlot,
                },
                facedown: true,
                canBeTapped: false,
                selected: false,
              };
              this.positionedCards.push(positionedCard);
            }
          }
        });
      }
      // Face down card for the deck
      if (this.deck) {
        const drawnCard = this.deck.shift();
        if (drawnCard) {
          this.positionedCards.push({
            ...drawnCard,
            position: {
              area: "deck",
            },
            facedown: true,
            canBeTapped: false,
            selected: false,
          });
        }
      }

      // Face up card on the pile
      if (this.deck) {
        const drawnCard = this.deck.shift();
        if (drawnCard) {
          this.positionedCards.push({
            ...drawnCard,
            position: {
              area: "pile",
            },
            facedown: false,
            canBeTapped: false,
            selected: false,
          });
        }
      }

      this.sendStateToAll().then((_) => {
        resolve(this.initialViewing(10));
      });
    });
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
   * @param {Update} update
   */
  handleUpdate(sessionId, update) {
    // TODO: Remove this any
    return new Promise((/** @type {any} */ resolve) => {
      if (!this.permittedUpdates[this.state].includes(update.action)) {
        resolve();
        return;
      }

      switch (update.action) {
        case "setName":
          const existingPlayerData = this.players.get(sessionId);
          if (existingPlayerData) {
            const updatedPlayerData = { ...existingPlayerData };
            updatedPlayerData.name = update.name;
            this.players.set(sessionId, updatedPlayerData);
          }
          resolve(this.sendStateToAll());
          break;

        case "indicateReady":
          const playerData = this.players.get(sessionId);
          if (playerData) {
            const updatedPlayerData = { ...playerData };
            updatedPlayerData.ready = true;
            this.players.set(sessionId, updatedPlayerData);
          }

          const playersNotReady = [...this.players.values()].filter(
            (p) => p.ready !== true
          );
          if (playersNotReady.length == 0 && this.players.size > 1) {
            resolve(this.deal());
          } else {
            resolve(this.sendStateToAll());
          }
          break;

        // TODO: Remove
        case "plusOne":
          this.count++;
          const moduloTen = this.count % 10;
          if (moduloTen == 0 && this.count > 1) {
            this.events.push({
              type: "text",
              message: "Wow, another ten clicks hey !!",
            });
          }
          resolve(this.sendStateToAll());
          break;

        case "leave":
          const player = this.players.get(sessionId);
          if (player) {
            this.events.push({
              type: "text",
              message: `${player.name} left the game`,
            });
          }
          this.state = "exit";
          this.players.delete(sessionId);
          resolve(this.sendStateToAll());
          break;

        case "snap":
          resolve(this.sendStateToAll());
          break;

        case "tapCard":
          resolve(this.sendStateToAll());
          break;

        case "pass":
          resolve(this.sendStateToAll());
          break;

        case "cambio":
          resolve(this.sendStateToAll());
          break;

        case "requestRematch":
          resolve(this.sendStateToAll());
          break;
      }
    });
  }

  /** @param {number} seconds How long players' get to view their bottom two cards at the game's start */
  initialViewing(seconds) {
    return new Promise((resolve) => {
      console.log("Initial viewing.");
      this.events.push({
        type: "text",
        message: "Get ready to memorise",
      });
      this.state = "initialViewing";
      resolve(this.sendStateToAll());
    });
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

  /** @returns {{currentTurnSessionId: string, currentTurnName: string | null, currentTurnTablePosition: number} | undefined} */
  getCurrentTurnPlayerInfo() {
    const playerInfo = Array.from(this.players.entries())
      .map((playerInfo) => {
        const [currentTurnSessionId, details] = playerInfo;
        return {
          currentTurnSessionId,
          currentTurnName: details.name,
          currentTurnTablePosition: details.tablePosition,
        };
      })
      .find((p) => {
        return p.currentTurnTablePosition === this.currentTurnTablePosition;
      });

    return playerInfo;
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
      const currentTurnInfo = this.getCurrentTurnPlayerInfo();
      // TODO: Is this the best default?
      const currentTurnSessionId = currentTurnInfo ? currentTurnInfo.currentTurnSessionId : '';

      for (const sessionId of this.players.keys()) {
        const playerDetails = this.players.get(sessionId);
        /** @type {import("./types").ClientState} */
        const clientState = {
          clientStateId: this.clientStateId,
          gameId: this.id,
          state: this.state,
          currentTurnTablePosition: this.currentTurnTablePosition,
          currentTurnSessionId,
          name: playerDetails ? playerDetails.name : null,
          sessionId,
          count: this.count,
          players: flattenedPlayerData,
          options: this.options,
          // TODO: Facet this so players are only seeing their cards
          // Remove the suit, rank and value from facedown cards
          cards: this.positionedCards,
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
    console.log(update);

    if (!this.players.has(sessionId)) return;
    this.updateQueue.push({
      sessionId: sessionId,
      data: update,
    });
    if (!this.isApplyingUpdate) {
      this.processUpdateQueue();
    }
  }
}
