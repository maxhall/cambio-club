// @ts-check
import { cloneDeep, isEqual } from "lodash";
import { Timer, shuffledDeck, shuffle } from "./utils";

/** @typedef {import('./types').Card} Card */
/** @typedef {import('./types').MaskedCard} MaskedCard */
/** @typedef {import("./types").CardPosition} CardPosition */
/** @typedef {import('./types').PlayerData} PlayerData */
/** @typedef {import('./types').SendStateToSession} SendStateToSession */
/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Update} Update */

const INITIAL_VIEWING_INTRO_PAUSE = 1.5 * 1000;
const INITIAL_VIEWING_TIME = 10 * 1000;
const SNAP_SUSPENSION_TIME = 10 * 1000;
const TABLE_CARD_SLOTS = 8;

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

    this.canBeSnapped = false;
    this.clientStateId = 0;
    /** @type {string} */
    this.currentTurnSessionId;
    /** @type {number} */
    this.currentTurnTablePosition = 0;
    /** @type {import('./types').Events} */
    this.events = [];
    /** @type {boolean} */
    this.isApplyingUpdate = false;
    /** @type {boolean} */
    this.isCambioRound = false;
    /** @type {Card[]} */
    this.hiddenDeck = [];
    /** @type {Card[]} */
    this.hiddenPile = [];
    /** @type {import('./types').PermittedUpdates} */
    this.permittedUpdates = {
      settingUp: ["setName", "indicateReady", "leave"],
      dealing: ["leave"],
      initialViewing: ["snap", "leave"],
      snapSuspension: ["tapCard", "leave"],
      awaitingSnapResolutionChoice: ["tapCard", "leave"],
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
    /** @type {Map<string, PlayerData>} Players */
    this.players = new Map();
    /** @type {string} */
    this.playerWhoSnapped;
    /** @type {Card[]} */
    this.positionedCards = [];
    /** @type {CardPosition} */
    this.savedSnappedCardPosition;
    /** @type {null | Timer} */
    this.snapSuspensionTimer = null;
    /** @type {State} */
    this.state = "settingUp";
    /** @type {State} */
    this.stateBeforeSnapSuspension;
    /** @type {Card[]} */
    this.cardsTappableBeforeSnapSuspension;
    /** @type {Array<{sessionId: string, data: Update}>} */
    this.updateQueue = [];
    /** @type {null | Timer} */
    this.viewingTimer = null;
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

  /** @param {CardPosition} cardPosition */
  blindSwapOwnChoice(cardPosition) {
    return new Promise((resolve) => {
      // resolve();
    });
  }

  /** @param {CardPosition} cardPosition */
  blindSwapOtherChoice(cardPosition) {
    return new Promise((resolve) => {
      // resolve();
    });
  }

  cambio() {
    return new Promise((resolve) => {
      // resolve();
    });
  }

  deal() {
    return new Promise((resolve) => {
      this.state = "dealing";
      console.log("Dealing");
      // Make a array of indices for each table position and shuffle it
      /** @type {number[]} */
      const shuffledNumbers = shuffle(
        new Array(this.players.size).fill(null).map((_, i) => i)
      );
      this.hiddenDeck = shuffledDeck();
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
          const drawnCard = this.drawCard();
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
        });
      }

      this.positionedCards.push({
        ...this.drawCard(),
        position: {
          area: "deck",
        },
        facedown: true,
        canBeTapped: false,
        selected: false,
      });

      this.positionedCards.push({
        ...this.drawCard(),
        position: {
          area: "pile",
        },
        facedown: false,
        canBeTapped: false,
        selected: false,
      });

      this.sendStateToAll().then((_) => {
        resolve(this.initialViewing());
      });
    });
  }

  drawCard() {
    if (this.hiddenDeck.length === 0) {
      // Take all the cards from the hidden pile, shuffle them and put them on the deck
      console.log("Shuffling the pile to refill the deck");
      this.hiddenDeck = shuffle([...this.hiddenPile]);
      this.hiddenPile = [];
    }
    return /** @type {Card} */ (this.hiddenDeck.shift());
  }

  endGame() {
    return new Promise((resolve) => {
      console.log("Ending game!");
    });
  }

  /** @param {CardPosition} cardPosition */
  finishDeckSwap(cardPosition) {
    return new Promise((resolve) => {
      this.state = "finishingDeckSwap";
      const tappedCard = /** @type {Card} */ (
        this.positionedCards.find((card) =>
          isEqual(card.position, cardPosition)
        )
      );
      const viewingSlotCard = /** @type {Card} */ (
        this.positionedCards.find(
          (c) =>
            c.position.area === "viewing" &&
            c.position.player === this.currentTurnTablePosition
        )
      );
      const pileCard = /** @type {Card} */ (
        this.positionedCards.find((c) => c.position.area === "pile")
      );

      // Push the pile card on to the hidden pile
      this.hiddenPile.unshift(pileCard);
      this.positionedCards = this.positionedCards.filter(
        (card) => card.position.area !== "pile"
      );

      // If the tapped card was the pile,
      if (cardPosition.area === "pile") {
        // Move the card from the viewing slot to the pile
        viewingSlotCard.position = {
          area: "pile",
        };
      } else if (
        cardPosition.area === "table" &&
        cardPosition.player === this.currentTurnTablePosition
      ) {
        // Move the deck card in the first viewing slot to the spot that was tapped
        viewingSlotCard.position = cardPosition;
        // And move the tapped card to the pile
        tappedCard.position = {
          area: "pile",
        };
      } else {
        // The card isn't valid
        resolve(null);
        return;
      }

      this.canBeSnapped = true;
      this.sendStateToAll();

      resolve(this.startSpecialPower());
    });
  }

  /** @param {CardPosition} cardPosition */
  finishPileSwap(cardPosition) {
    return new Promise((resolve) => {
      this.state = "finishingPileSwap";
      const tappedCard = /** @type {Card} */ (
        this.positionedCards.find((card) =>
          isEqual(card.position, cardPosition)
        )
      );
      const pileCard = /** @type {Card} */ (
        this.positionedCards.find((c) => c.position.area === "pile")
      );

      // If the chosen card is valid (i.e. one of theirs) swap it with the pile card
      if (
        cardPosition.area === "table" &&
        cardPosition.player === this.currentTurnTablePosition
      ) {
        pileCard.position = cardPosition;
        tappedCard.position = {
          area: "pile",
        };
      }

      this.canBeSnapped = true;
      this.sendStateToAll();

      resolve(this.startSpecialPower());
    });
  }

  /** @param {CardPosition} cardPosition */
  finishMateLook(cardPosition) {
    return new Promise((resolve) => {
      // resolve();
    });
  }

  /** @param {CardPosition} cardPosition */
  finishMineLook(cardPosition) {
    return new Promise((resolve) => {
      // resolve();
    });
  }

  /** @param {CardPosition} cardPosition */
  finishSnapResolution(cardPosition) {
    return new Promise((resolve) => {
      console.log("Finishing snap resolution!");

      const snappingPlayerTablePosition = /** @type {number} */ (
        this.players.get(this.playerWhoSnapped)?.tablePosition
      );
      const tappedCard = /** @type {Card} */ (
        this.positionedCards.find((card) =>
          isEqual(card.position, cardPosition)
        )
      );

      console.log(`Snapping player table position:`);
      console.log(snappingPlayerTablePosition);
      console.log(`Snapping player table position:`);
      console.log(snappingPlayerTablePosition);
      console.log(`Saved snapped card position:`);
      console.log(this.savedSnappedCardPosition);

      // If the tapped card is in the snapping players table or viewing area, move it to the savedSnappedCardPosition that was just vacated
      if (
        (cardPosition.area === "table" || cardPosition.area === "viewing") &&
        cardPosition.player === snappingPlayerTablePosition
      ) {
        tappedCard.position = this.savedSnappedCardPosition;

        this.restorePresnapState();
        resolve(this.sendStateToAll());
      }
    });
  }

  /** @param {CardPosition} cardPosition */
  finishQueenLook(cardPosition) {
    return new Promise((resolve) => {
      // resolve();
    });
  }

  getAndEmptyEventQueue() {
    const currentEvents = this.events;
    this.events = [];
    return currentEvents;
  }

  /** @typedef {import('./types').Countdown} Countdown */
  /** @returns {Countdown | undefined} */
  getCurrentCountdown() {
    // If there's a snap suspension on it takes precedence
    if (this.snapSuspensionTimer && this.snapSuspensionTimer.isRunning()) {
      return {
        type: "snap",
        remainingTime: this.snapSuspensionTimer.getRemainingTime(),
        totalTime: SNAP_SUSPENSION_TIME,
        subjectPlayer: this.playerWhoSnapped,
      };
    }
    if (this.viewingTimer && this.viewingTimer.isRunning()) {
      return {
        type: "viewing",
        remainingTime: this.viewingTimer.getRemainingTime(),
        totalTime: INITIAL_VIEWING_TIME,
        // If state is initial viewing then set null so everyone is subject to the timer,
        // otherwise the timer is just for whoever's turn it is
        subjectPlayer:
          this.state == "initialViewing" ? null : this.currentTurnSessionId,
      };
    }

    return undefined;
  }

  /**
   * @param {number} playerTablePosition
   * @returns {number} The index of the first open tableSlot for that player
   */
  getFirstAvailableTableSlot(playerTablePosition) {
    const tableCards = this.positionedCards.filter(
      (c) =>
        c.position.area === "table" && c.position.player === playerTablePosition
    );
    // With an array of length TABLE_CARD_SLOTS find the first index without a card in that table slot
    const firstAvailableTableSlot = new Array(TABLE_CARD_SLOTS)
      .fill(null)
      .findIndex((_, i) => {
        const cardInTableSlot = tableCards.find(
          (card) =>
            card.position.area === "table" && card.position.tableSlot === i
        );
        return !cardInTableSlot;
      });
    return firstAvailableTableSlot;
  }

  /**
   * Returns an array of positioned cards stripped of details
   * the player matching the supplied sessionId should not know
   * @param {string} sessionId
   * @returns {MaskedCard[]}
   */
  getMaskedCardsForClient(sessionId) {
    let stripCanBeTapped = true;
    // If we're in "snapSuspension" or "awaitingSnapResolutionChoice" and you called it, you need to be able to tap
    if (
      (this.state == "snapSuspension" ||
        this.state == "awaitingSnapResolutionChoice") &&
      this.playerWhoSnapped == sessionId
    ) {
      stripCanBeTapped = false;
    }
    // If we're not in "snapSuspension" or "awaitingSnapResolutionChoice", you can tap if it's your turn
    if (
      !(
        this.state == "snapSuspension" ||
        this.state == "awaitingSnapResolutionChoice"
      ) &&
      this.currentTurnSessionId == sessionId
    ) {
      stripCanBeTapped = false;
    }

    return this.positionedCards.map((card) => {
      /** @type {MaskedCard} */
      const updatedCard = cloneDeep(card);

      // In `gameOver` all cards are faceup expect the deck
      if (this.state == "gameOver" && updatedCard.position.area !== "deck") {
        updatedCard.facedown = false;
      } else {
        // Get the tablePosition matching the sessionId
        const thisPlayerTablePosition =
          this.players.get(sessionId)?.tablePosition;
        // All facedown unless they're on the pile or in your viewing area
        if (
          updatedCard.position.area == "pile" ||
          (updatedCard.position.area == "viewing" &&
            updatedCard.position.player == thisPlayerTablePosition)
        ) {
          updatedCard.facedown = false;
        } else {
          updatedCard.facedown = true;
        }
      }

      // TODO: REMOVE just putting everything face up to test
      updatedCard.facedown = false;

      // Prevent tapping if it's not your turn
      if (stripCanBeTapped) updatedCard.canBeTapped = false;

      // Strip facedown cards of suit, rank and value
      if (updatedCard.facedown) {
        delete updatedCard.rank;
        delete updatedCard.suit;
        delete updatedCard.value;
      }
      return updatedCard;
    });
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
        console.log(`${update.action} not permitted in ${this.state}`);
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
          console.log("Snap case in handleUpdate");
          resolve(this.startSnapSuspension(sessionId));
          break;

        case "tapCard":
          console.log(`Tapped card:`);
          console.log(update);
          if (
            this.state === "snapSuspension" &&
            sessionId === this.playerWhoSnapped
          ) {
            resolve(this.resolveSnap(sessionId, update.cardPosition));
          } else if (
            this.state === "awaitingSnapResolutionChoice" &&
            sessionId === this.playerWhoSnapped
          ) {
            resolve(this.finishSnapResolution(update.cardPosition));
          } else if (sessionId === this.currentTurnSessionId) {
            // This is an ugly if-else mess because standalone if statements don't 100% guarantee
            // the state won't shift halfway through evalutation and switch is ever more verbose
            if (
              this.state == "startingTurn" &&
              update.cardPosition.area === "deck"
            ) {
              resolve(this.startDeckSwap(update.cardPosition));
            } else if (
              this.state == "startingTurn" &&
              update.cardPosition.area === "pile"
            ) {
              resolve(this.startPileSwap(update.cardPosition));
            } else if (this.state == "awaitingDeckSwapChoice") {
              resolve(this.finishDeckSwap(update.cardPosition));
            } else if (this.state == "awaitingPileSwapChoice") {
              resolve(this.finishPileSwap(update.cardPosition));
            } else if (this.state == "awaitingMateLookChoice") {
              resolve(this.finishMateLook(update.cardPosition));
            } else if (this.state == "awaitingMineLookChoice") {
              resolve(this.finishMineLook(update.cardPosition));
            } else if (this.state == "awaitingQueenLookChoice") {
              resolve(this.finishQueenLook(update.cardPosition));
            } else if (this.state == "awaitingQueenSwapOwnChoice") {
              resolve(this.queenOwnChoice(update.cardPosition));
            } else if (this.state == "awaitingQueenSwapOtherChoice") {
              resolve(this.queenOtherChoice(update.cardPosition));
            } else if (this.state == "awaitingBlindSwapOwnChoice") {
              resolve(this.blindSwapOwnChoice(update.cardPosition));
            } else if (this.state == "awaitingBlindSwapOtherChoice") {
              resolve(this.blindSwapOtherChoice(update.cardPosition));
            }
          }
          break;

        case "pass":
          if (this.currentTurnSessionId === sessionId) {
            resolve(this.nextTurn());
          }
          break;

        case "cambio":
          if (this.currentTurnSessionId === sessionId) {
            resolve(this.cambio());
          }
          break;

        case "requestRematch":
          const rematchPlayerData = this.players.get(sessionId);
          if (rematchPlayerData) {
            const updatedPlayerData = { ...rematchPlayerData };
            updatedPlayerData.hasRequestedRematch = true;
            this.players.set(sessionId, updatedPlayerData);
          }

          const allRequestedRematch = [...this.players.values()].every(
            (p) => p.hasRequestedRematch
          );
          if (allRequestedRematch) {
            resolve(this.rematch());
          } else {
            resolve(this.sendStateToAll());
          }
          break;
      }

      // If things gets suss try removing
      resolve();
    });
  }

  initialViewing() {
    return new Promise((resolve) => {
      this.canBeSnapped = true;

      this.events.push({
        type: "text",
        message: "Memorise your cards!",
      });

      // Move any card in tableSlot 5 or 6 to viewingSlot 1 and 2 respectively
      this.positionedCards.forEach((card) => {
        if (
          card.position.area == "table" &&
          (card.position.tableSlot == 5 || card.position.tableSlot == 6)
        ) {
          /** @type {import("./types").CardPosition} */
          const newPosition = {
            player: card.position.player,
            area: "viewing",
            viewingSlot: card.position.tableSlot == 5 ? 0 : 1,
          };
          const updatedCard = card;
          updatedCard.position = newPosition;
          return updatedCard;
        }
        return card;
      });

      this.viewingTimer = new Timer(() => {
        // Return viewingSlot 1 and 2 to tableSlot 5 and 6 respectively
        this.positionedCards.forEach((card) => {
          if (card.position.area == "viewing") {
            /** @type {import("./types").CardPosition} */
            const newPosition = {
              player: card.position.player,
              area: "table",
              tableSlot: card.position.viewingSlot == 0 ? 5 : 6,
            };
            const updatedCard = card;
            updatedCard.position = newPosition;
            return updatedCard;
          }
          return card;
        });

        this.events.push({
          type: "text",
          message: "Initial viewing over!",
        });

        // TODO: Assess whether it's too unweildy to have to remember to null timers once they're done
        // If it's not, add a note to the state management description at each spot it's needed
        this.viewingTimer = null;

        // TODO: Is there a race condition here if the next turn is being resolved before the state changes?
        // Maybe add something about to change the state before anything happens
        // The alternative is applying an update lock while the callback is executed but that feels messy
        console.log("Calling next turn");
        this.nextTurn();
      }, INITIAL_VIEWING_TIME);

      this.state = "initialViewing";

      setTimeout(() => {
        resolve(this.sendStateToAll());
      }, INITIAL_VIEWING_INTRO_PAUSE);
    });
  }

  nextTurn() {
    return new Promise((resolve) => {
      console.log("Next turn");
      const playersYetToTakeFinalTurn = [...this.players.values()].filter(
        (p) => p.hasTakenFinalTurn !== true
      );

      if (this.isCambioRound && playersYetToTakeFinalTurn.length === 0) {
        resolve(this.endGame());
        return;
      }

      console.log(
        `Current turn table position: ${this.currentTurnTablePosition}`
      );
      this.currentTurnTablePosition =
        (this.currentTurnTablePosition + 1) % this.players.size;
      console.log(`Next turn table position: ${this.currentTurnTablePosition}`);

      this.currentTurnSessionId = /** @type {string} */ (
        [...this.players.keys()].find((sessionId) => {
          const tablePositionMatchingSessionId =
            this.players.get(sessionId)?.tablePosition;
          if (
            tablePositionMatchingSessionId === this.currentTurnTablePosition
          ) {
            return true;
          } else {
            return false;
          }
        })
      );
      console.log(`Next turn session id: ${this.currentTurnSessionId}`);

      if (this.isCambioRound) {
        const currentPlayerData = this.players.get(this.currentTurnSessionId);
        if (currentPlayerData) {
          this.players.set(this.currentTurnSessionId, {
            ...currentPlayerData,
            hasTakenFinalTurn: true,
          });
        }
      }

      this.events.push({
        type: "text",
        message: "Your turn!",
        recipientSessionIds: [this.currentTurnSessionId],
      });

      this.positionedCards.forEach((card) => {
        if (card.position.area === "deck" || card.position.area === "pile") {
          card.canBeTapped = true;
        } else {
          card.canBeTapped = false;
        }
      });

      this.state = "startingTurn";
      console.log("Turn started");

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
        // Can destruture here because Array.from returns an array of [key, value] arrays from the Map
        const [sessionId, details] = playerInfo;
        return {
          currentTurnSessionId: sessionId,
          currentTurnName: details.name,
          currentTurnTablePosition: details.tablePosition,
        };
      })
      .find((p) => {
        return p.currentTurnSessionId === this.currentTurnSessionId;
      });

    return playerInfo;
  }

  /** @param {string} sessionId */
  penaliseForFailedSnap(sessionId) {
    const snappingPlayerTablePosition = /** @type {number} */ (
      this.players.get(sessionId)?.tablePosition
    );
    const snappingPlayersTableCards = this.positionedCards.filter(
      (c) =>
        c.position.area === "table" &&
        c.position.player === snappingPlayerTablePosition
    );
    // If the player's slots are full, don't penalise
    if (snappingPlayersTableCards.length < TABLE_CARD_SLOTS) {
      // Penalise by putting the top-most deck card in the player's first available slot
      const penaltyCard = this.drawCard();
      this.positionedCards.push({
        ...penaltyCard,
        position: {
          area: "table",
          player: snappingPlayerTablePosition,
          tableSlot: this.getFirstAvailableTableSlot(
            snappingPlayerTablePosition
          ),
        },
      });
    }

    this.canBeSnapped = true;
  }

  /** @param {CardPosition} cardPosition */
  queenOwnChoice(cardPosition) {
    return new Promise((resolve) => {
      // resolve();
    });
  }

  /** @param {CardPosition} cardPosition */
  queenOtherChoice(cardPosition) {
    return new Promise((resolve) => {
      // resolve();
    });
  }

  rematch() {
    return new Promise((resolve) => {
      // resolve();
    });
  }

  /**
   * @param {string} sessionId
   * @param {CardPosition} snappedCardPosition
   * */
  resolveSnap(sessionId, snappedCardPosition) {
    return new Promise((resolve) => {
      this.state = "resolvingSnap";
      this.snapSuspensionTimer?.remove();
      const cardAtSnapPosition = /** @type {Card} */ (
        this.positionedCards.find((card) =>
          isEqual(card.position, snappedCardPosition)
        )
      );

      console.log(`Snapped card:`);
      console.log(cardAtSnapPosition);

      const pileCard = this.positionedCards.find(
        (card) => card.position.area === "pile"
      );

      console.log(`Pile card:`);
      console.log(pileCard);

      const isValidSnap = pileCard && cardAtSnapPosition.rank === pileCard.rank;
      const snappingPlayerTablePosition = /** @type {number} */ (
        this.players.get(sessionId)?.tablePosition
      );
      const isAnotherPlayerCard =
        (snappedCardPosition.area === "viewing" ||
          snappedCardPosition.area === "table") &&
        snappedCardPosition.player !== snappingPlayerTablePosition;

      console.log(
        `Snapped card ${
          isAnotherPlayerCard ? "IS" : "IS NOT"
        } another players card`
      );

      if (isValidSnap) {
        // If the snap is valid: Award the snap by moving the snappedCard to the pile.
        this.hiddenPile.unshift(pileCard);
        this.positionedCards = this.positionedCards.filter(
          (card) => card.position.area !== "pile"
        );
        cardAtSnapPosition.position = {
          area: "pile",
        };
      } else {
        // Penalise the snapper with a card from the deck
        this.penaliseForFailedSnap(sessionId);
        const snappingPlayerName = this.players.get(sessionId)?.name;
        const cardTitle =
          cardAtSnapPosition.rank === "joker"
            ? `joker`
            : `${cardAtSnapPosition.rank} of ${cardAtSnapPosition.suit}`;
        const message = `${snappingPlayerName} tried to snap a ${cardTitle} lol They get ${
          isAnotherPlayerCard ? "that card and " : ""
        }a penalty`;
        this.events.push({
          type: "text",
          message,
        });
      }

      if (isValidSnap && isAnotherPlayerCard) {
        // Set state to ""awaitingSnapResolutionChoice""
        this.state = "awaitingSnapResolutionChoice";
        // Save the position of the snappedcard.
        this.savedSnappedCardPosition = snappedCardPosition;
        // add an event asking the snapping player what they want to get rid of
        const snappedOnName = [...this.players.values()].find(
          (p) => p.tablePosition === snappedCardPosition.player
        )?.name;
        this.events.push({
          type: "text",
          message: `Choose a card to give to ${snappedOnName}`,
        });
        // mark all the snapping player's cards as canBeTapped
        this.positionedCards.forEach((card) => {
          card.facedown =
            card.position.area === "table" &&
            card.position.player === snappingPlayerTablePosition;
        });
        // send the state
        resolve(this.sendStateToAll());
        return;
      }

      if (!isValidSnap && isAnotherPlayerCard) {
        // Further penalise the snapper by moving the snappedCard to their table area if they have room.
        console.log("Take the other player card you tried to snap!");

        const snappingPlayersTableCards = this.positionedCards.filter(
          (c) =>
            c.position.area === "table" &&
            c.position.player === snappingPlayerTablePosition
        );
        if (snappingPlayersTableCards.length < TABLE_CARD_SLOTS) {
          cardAtSnapPosition.position = {
            area: "table",
            player: snappingPlayerTablePosition,
            tableSlot: this.getFirstAvailableTableSlot(
              snappingPlayerTablePosition
            ),
          };
        }
      }

      // You only get here if the snap was a valid one of the player's own card
      // or the snap was invalid
      this.restorePresnapState();

      resolve(this.sendStateToAll());
    });
  }

  restorePresnapState() {
    this.state = this.stateBeforeSnapSuspension;
    this.positionedCards.forEach((card) => {
      const matchingCard = this.cardsTappableBeforeSnapSuspension.find((c) => {
        return c.rank === card.rank && c.suit === card.suit;
      });
      if (matchingCard) {
        card.canBeTapped = true;
      } else {
        card.canBeTapped = false;
      }
    });
    // TODO: Am I sure all the viewing timers are cleared once they end such that this if check is always?
    if (this.viewingTimer) this.viewingTimer.start();
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
      // General data for the client state update
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
      const currentTurnSessionId = currentTurnInfo
        ? currentTurnInfo.currentTurnSessionId
        : "";

      // Customise for each player
      for (const sessionId of this.players.keys()) {
        const playerDetails = this.players.get(sessionId);
        /** @type {import("./types").ClientState} */
        const clientState = {
          canBeSnapped: this.canBeSnapped,
          cards: this.getMaskedCardsForClient(sessionId),
          clientStateId: this.clientStateId,
          countdown: this.getCurrentCountdown(),
          currentTurnSessionId: this.currentTurnSessionId,
          events: events.filter((event) => {
            return event.recipientSessionIds
              ? event.recipientSessionIds.includes(sessionId)
              : event;
          }),
          gameId: this.id,
          name: playerDetails ? playerDetails.name : null,
          options: this.options,
          players: flattenedPlayerData,
          sessionId,
          state: this.state,
        };
        this.sendStateToSession(sessionId, clientState);
      }

      resolve();
    });
  }

  /** @param {CardPosition} cardPosition */
  startDeckSwap(cardPosition) {
    return new Promise((resolve) => {
      // Set state to 'awaitingDeckSwapChoice'
      this.state = "awaitingDeckSwapChoice";
      // Move the deck card to the first open viewing slot of the current turn's player
      const currentDeckCard = this.positionedCards.find(
        (card) => card.position.area === "deck"
      );
      const currentPlayerInfo = this.getCurrentTurnPlayerInfo();
      if (currentDeckCard && currentPlayerInfo) {
        currentDeckCard.position = {
          area: "viewing",
          viewingSlot: 0,
          player: currentPlayerInfo.currentTurnTablePosition,
        };
      }
      // Draw a new card for the deck card
      this.positionedCards.push({
        ...this.drawCard(),
        position: {
          area: "deck",
        },
      });
      // Highlight the pile and the players own cards.
      this.positionedCards.forEach((card) => {
        card.canBeTapped =
          card.position.area === "pile" ||
          (card.position.area === "table" &&
            card.position.player ===
              currentPlayerInfo?.currentTurnTablePosition);
      });
      // Send state
      resolve(this.sendStateToAll());
    });
  }

  /** @param {CardPosition} cardPosition */
  startPileSwap(cardPosition) {
    return new Promise((resolve) => {
      this.state = "awaitingPileSwapChoice";
      const currentPlayerTablePosition = this.players.get(
        this.currentTurnSessionId
      )?.tablePosition;
      this.positionedCards.forEach((card) => {
        card.canBeTapped =
          card.position.area === "table" &&
          card.position.player === currentPlayerTablePosition;
      });
      resolve(this.sendStateToAll());
    });
  }

  /** @param {string} sessionId */
  startSnapSuspension(sessionId) {
    return new Promise((resolve) => {
      console.log("Starting snap suspension!");
      this.stateBeforeSnapSuspension = this.state;
      // Saves a reference to each card that was previously tappable
      this.cardsTappableBeforeSnapSuspension = this.positionedCards.filter(
        (card) => card.canBeTapped
      );
      if (this.viewingTimer) this.viewingTimer.pause();
      this.state = "snapSuspension";
      this.canBeSnapped = false;
      this.playerWhoSnapped = sessionId;
      const snappingPlayerName = this.players.get(sessionId)?.name;

      this.events.push({
        type: "text",
        message: `${snappingPlayerName} snapped!`,
        recipientSessionIds: [...this.players.keys()].filter(
          (id) => id !== sessionId
        ),
      });

      this.events.push({
        type: "text",
        message: `Choose the card to snap`,
        recipientSessionIds: [sessionId],
      });

      this.snapSuspensionTimer = new Timer(() => {
        // If this elapses they haven't made a selection so penalise
        this.snapSuspensionTimer?.remove();
        // TODO: Add a graphic event for this
        this.events.push({
          type: "text",
          message: `${snappingPlayerName} gets a penalty for not snapping in time`,
        });
        this.penaliseForFailedSnap(sessionId);

        this.restorePresnapState();

        this.sendStateToAll();
      }, SNAP_SUSPENSION_TIME);

      // Add canBeTapped to the right cards
      const snappingPlayerTablePosition = /** @type {number} */ (
        this.players.get(sessionId)?.tablePosition
      );
      this.positionedCards.forEach((card) => {
        card.canBeTapped =
          (card.position.area === "table" ||
            card.position.area === "viewing") &&
          (this.options.canSnapOtherPlayers ||
            card.position.player === snappingPlayerTablePosition);
      });
      resolve(this.sendStateToAll());
    });
  }

  startSpecialPower() {
    return new Promise((resolve) => {
      resolve(this.nextTurn());
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
