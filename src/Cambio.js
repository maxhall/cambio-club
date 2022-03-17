// @ts-check
import { cloneDeep, isEqual } from "lodash";
import { Timer, shuffledDeck, shuffle } from "./utils";

/** @typedef {import('./types').Card} Card */
/** @typedef {import('./types').MaskedCard} MaskedCard */
/** @typedef {import('./types').CardPosition} CardPosition */
/** @typedef {import('./types').PlayerData} PlayerData */
/** @typedef {import('./types').SendStateToSession} SendStateToSession */
/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Update} Update */

const INITIAL_VIEWING_TIME = 12 * 1000;
const SNAP_SUSPENSION_TIME = 8 * 1000;
const LOOK_TIME = 8 * 1000;
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

    /** @type {Card} */
    this.blindSwapOwnChoiceCard;
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
      awaitingMateLookChoice: ["tapCard", "snap", "leave", "pass"],
      previewingCard: ["snap", "leave"],
      awaitingMineLookChoice: ["tapCard", "snap", "leave", "pass"],
      awaitingQueenLookChoice: ["tapCard", "snap", "leave", "pass"],
      awaitingQueenSwapOwnChoice: ["tapCard", "snap", "leave", "pass"],
      awaitingQueenSwapOtherChoice: ["tapCard", "leave", "pass"],
      awaitingBlindSwapOwnChoice: ["tapCard", "snap", "leave"],
      awaitingBlindSwapOtherChoice: ["tapCard", "leave", "pass"],
      gameOver: ["requestRematch", "leave"],
      exit: [],
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
    /** @type {CardPosition | null} */
    this.previewedCardOriginalPosition = null;
    this.previewedCardWasSnapped = false;
    /** @type {Card} */
    this.queenOwnChoiceCard;
    /** @type {CardPosition} */
    this.savedSnappedCardPosition;
    /** @type {null | Timer} */
    this.snapSuspensionTimer = null;
    /** @type {State} */
    this.state = "settingUp";
    /** @type {State} */
    this.stateBeforeSnapSuspension;
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
      const tappedCard = /** @type {Card} */ (
        this.positionedCards.find((card) =>
          isEqual(card.position, cardPosition)
        )
      );

      if (
        tappedCard.position.area === "table" &&
        tappedCard.position.player !== this.currentTurnTablePosition
      ) {
        resolve(null);
        return;
      }

      this.blindSwapOwnChoiceCard = tappedCard;
      this.state = "awaitingBlindSwapOtherChoice";
      this.setCanBeTapped(this.state);
      tappedCard.selected = true;
      this.events.push({
        type: "text",
        message: "Choose a card to swap with",
        recipientSessionIds: [this.currentTurnSessionId],
      });
      resolve(this.sendStateToAll());
    });
  }

  /** @param {CardPosition} cardPosition */
  blindSwapOtherChoice(cardPosition) {
    return new Promise((resolve) => {
      const tappedCard = /** @type {Card} */ (
        this.positionedCards.find((card) =>
          isEqual(card.position, cardPosition)
        )
      );

      if (
        tappedCard.position.area === "table" &&
        tappedCard.position.player === this.currentTurnTablePosition
      ) {
        resolve(null);
        return;
      }

      tappedCard.position = this.blindSwapOwnChoiceCard.position;
      this.blindSwapOwnChoiceCard.position = cardPosition;
      this.blindSwapOwnChoiceCard.selected = false;
      resolve(this.nextTurn());
    });
  }

  cambio() {
    return new Promise((resolve) => {
      this.isCambioRound = true;
      const currentPlayerData = this.players.get(this.currentTurnSessionId);
      if (currentPlayerData) {
        this.players.set(this.currentTurnSessionId, {
          ...currentPlayerData,
          hasTakenFinalTurn: true,
        });
        this.events.push({
          type: "graphic",
          name: "cambio",
        });
        this.events.push({
          type: "text",
          message: `${currentPlayerData.name} called Cambio!`,
        });
      }
      resolve(this.nextTurn());
    });
  }

  deal() {
    return new Promise((resolve) => {
      this.state = "dealing";
      // Make a array of indices for each table position and shuffle it
      /** @type {number[]} */
      const shuffledNumbers = shuffle(
        new Array(this.players.size).fill(null).map((_, i) => i)
      );
      this.hiddenDeck = shuffledDeck();
      for (const [key] of this.players.entries()) {
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
      console.log("Ending game");
      this.state = "gameOver";
      this.setCanBeTapped(this.state);
      this.canBeSnapped = false;
      /** @typedef {{tablePosition: number, name: string | null, sessionId: string, score: number}} ScoreData */
      /** @type {ScoreData[]} */
      const scores = [];

      for (const [sessionId, data] of this.players.entries()) {
        const playerTableCards = this.positionedCards.filter(
          (card) =>
            card.position.area === "table" &&
            data.tablePosition === card.position.player
        );
        let score = 0;

        if (this.options.riskyFives) {
          const numberOfFives = playerTableCards.filter(
            (c) => c.value === 5
          ).length;

          if (numberOfFives == 2) score = score - 25;
          if (numberOfFives == 1) score = score + 50;

          playerTableCards
            // Fives have already been counted
            .filter((c) => c.value !== 5)
            .forEach((c) => {
              score = score + c.value;
            });
        } else {
          playerTableCards.forEach((c) => {
            score = score + c.value;
          });
        }

        scores.push({
          tablePosition: data.tablePosition,
          name: data.name,
          sessionId,
          score,
        });
      }

      console.log(scores);

      const winner = scores.sort((a, b) => {
        return a.score - b.score;
      })[0];

      this.events.push({
        type: "text",
        message: `${winner.name} wins!`,
      });
      this.events.push({
        type: "graphic",
        name: "win",
      });

      resolve(this.sendStateToAll());
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
      const tappedCard = /** @type {Card} */ (
        this.positionedCards.find((card) =>
          isEqual(card.position, cardPosition)
        )
      );

      if (
        tappedCard.position.area === "table" &&
        tappedCard.position.player === this.currentTurnTablePosition
      ) {
        resolve(null);
        return;
      }

      this.previewedCardOriginalPosition = cardPosition;
      this.state = "previewingCard";
      this.setCanBeTapped(this.state);

      tappedCard.position = {
        area: "viewing",
        viewingSlot: 0,
        player: this.currentTurnTablePosition,
      };

      this.viewingTimer = new Timer(() => {
        if (!this.previewedCardWasSnapped) {
          tappedCard.position = cardPosition;
        }
        this.previewedCardWasSnapped = false;
        this.previewedCardOriginalPosition = null;

        this.viewingTimer = null;
        this.nextTurn();
      }, LOOK_TIME);

      resolve(this.sendStateToAll());
    });
  }

  /** @param {CardPosition} cardPosition */
  finishMineLook(cardPosition) {
    return new Promise((resolve) => {
      const tappedCard = /** @type {Card} */ (
        this.positionedCards.find((card) =>
          isEqual(card.position, cardPosition)
        )
      );

      if (
        tappedCard.position.area === "table" &&
        tappedCard.position.player !== this.currentTurnTablePosition
      ) {
        resolve(null);
        return;
      }

      this.previewedCardOriginalPosition = cardPosition;
      this.state = "previewingCard";
      this.setCanBeTapped(this.state);

      tappedCard.position = {
        area: "viewing",
        viewingSlot: 0,
        player: this.currentTurnTablePosition,
      };

      this.viewingTimer = new Timer(() => {
        if (!this.previewedCardWasSnapped) {
          tappedCard.position = cardPosition;
        }
        this.previewedCardWasSnapped = false;
        this.previewedCardOriginalPosition = null;

        this.viewingTimer = null;
        this.nextTurn();
      }, LOOK_TIME);

      resolve(this.sendStateToAll());
    });
  }

  /** @param {CardPosition} cardPosition */
  finishSnapResolution(cardPosition) {
    return new Promise((resolve) => {
      const snappingPlayerTablePosition = /** @type {number} */ (
        this.players.get(this.playerWhoSnapped)?.tablePosition
      );
      const tappedCard = /** @type {Card} */ (
        this.positionedCards.find((card) =>
          isEqual(card.position, cardPosition)
        )
      );

      // If the tapped card is in the snapping players table or viewing area, move it to the savedSnappedCardPosition that was just vacated
      if (
        (cardPosition.area === "table" || cardPosition.area === "viewing") &&
        cardPosition.player === snappingPlayerTablePosition
      ) {
        tappedCard.position = this.savedSnappedCardPosition;

        const snappersRemainingTableCards = this.positionedCards.filter(
          (c) =>
            c.position.area === "table" &&
            c.position.player === snappingPlayerTablePosition
        ).length;
        if (snappersRemainingTableCards === 0) {
          this.isCambioRound = true;
          const snapperData = this.players.get(this.playerWhoSnapped);
          if (snapperData) {
            this.players.set(this.playerWhoSnapped, {
              ...snapperData,
              hasTakenFinalTurn: true,
            });
            this.events.push({
              type: "graphic",
              name: "cambio",
            });
            this.events.push({
              type: "text",
              message: `Cambio! ${snapperData.name} has no cards`,
            });
          }
        }

        this.restorePresnapState();
      }

      resolve(this.sendStateToAll());
    });
  }

  /** @param {CardPosition} cardPosition */
  finishQueenLook(cardPosition) {
    return new Promise((resolve) => {
      const tappedCard = /** @type {Card} */ (
        this.positionedCards.find((card) =>
          isEqual(card.position, cardPosition)
        )
      );

      if (
        tappedCard.position.area === "table" &&
        tappedCard.position.player === this.currentTurnTablePosition
      ) {
        resolve(null);
        return;
      }

      this.previewedCardOriginalPosition = cardPosition;
      this.state = "previewingCard";
      this.setCanBeTapped(this.state);

      tappedCard.position = {
        area: "viewing",
        viewingSlot: 0,
        player: this.currentTurnTablePosition,
      };

      this.viewingTimer = new Timer(() => {
        if (!this.previewedCardWasSnapped) {
          tappedCard.position = cardPosition;
        }
        this.previewedCardWasSnapped = false;
        this.previewedCardOriginalPosition = null;

        this.viewingTimer = null;
        this.state = "awaitingQueenSwapOwnChoice";
        this.setCanBeTapped(this.state);
        this.events.push({
          type: "text",
          message: "Choose a card to swap",
          recipientSessionIds: [this.currentTurnSessionId],
        });
        this.sendStateToAll();
      }, LOOK_TIME);

      resolve(this.sendStateToAll());
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
        let cardInTableSlot = tableCards.some(
          (card) =>
            card.position.area === "table" && card.position.tableSlot === i
        );
        // Needed to prevent dropping a penalty card into a gap that
        // is home to a card being previewed
        if (
          this.stateBeforeSnapSuspension === "previewingCard" &&
          this.previewedCardOriginalPosition &&
          this.previewedCardOriginalPosition.area == "table" &&
          this.previewedCardOriginalPosition.tableSlot === i &&
          this.previewedCardOriginalPosition.player === playerTablePosition
        ) {
          cardInTableSlot = true;
        }
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

      if (this.options.openHands) {
        updatedCard.facedown = false;
      }

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
          if (this.viewingTimer) this.viewingTimer.remove();
          if (this.snapSuspensionTimer) this.snapSuspensionTimer.remove();
          resolve(this.sendStateToAll());
          break;

        case "snap":
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
            // This is an ugly if-else mess but switch is even more verbose
            if (
              this.state == "startingTurn" &&
              update.cardPosition.area === "deck"
            ) {
              resolve(this.startDeckSwap());
            } else if (
              this.state == "startingTurn" &&
              update.cardPosition.area === "pile"
            ) {
              resolve(this.startPileSwap());
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
            this.events.push({
              type: "text",
              message: `${rematchPlayerData?.name} wants a rematch`,
              recipientSessionIds: [...this.players.keys()].filter(
                (id) => id !== sessionId
              ),
            });
            resolve(this.sendStateToAll());
          }
          break;
      }

      resolve();
    });
  }

  initialViewing() {
    return new Promise((resolve) => {
      this.canBeSnapped = true;
      this.events.push({
        type: "text",
        message: "Memorise your cards",
      });
      // Move any card in tableSlot 5 or 6 to viewingSlot 1 and 2 respectively
      this.positionedCards.forEach((card) => {
        if (
          card.position.area == "table" &&
          (card.position.tableSlot == 5 || card.position.tableSlot == 6)
        ) {
          /** @type {import('./types').CardPosition} */
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
            /** @type {import('./types').CardPosition} */
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

        this.viewingTimer = null;
        this.nextTurn();
      }, INITIAL_VIEWING_TIME);

      this.state = "initialViewing";
      resolve(this.sendStateToAll());
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

      const currentPlayerData = this.players.get(this.currentTurnSessionId);
      if (currentPlayerData?.hasTakenFinalTurn) {
        resolve(this.nextTurn());
      } else {
        if (this.isCambioRound) {
          if (currentPlayerData) {
            this.players.set(this.currentTurnSessionId, {
              ...currentPlayerData,
              hasTakenFinalTurn: true,
            });
          }
          this.events.push({
            type: "text",
            message: "Your last turn",
            recipientSessionIds: [this.currentTurnSessionId],
          });
        } else {
          this.events.push({
            type: "text",
            message: "Your turn",
            recipientSessionIds: [this.currentTurnSessionId],
          });
        }

        this.state = "startingTurn";
        this.setCanBeTapped(this.state);
        resolve(this.sendStateToAll());
      }
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
    this.events.push({
      type: "graphic",
      name: "penalty",
    });
  }

  /** @param {CardPosition} cardPosition */
  queenOwnChoice(cardPosition) {
    return new Promise((resolve) => {
      const tappedCard = /** @type {Card} */ (
        this.positionedCards.find((card) =>
          isEqual(card.position, cardPosition)
        )
      );

      if (
        tappedCard.position.area === "table" &&
        tappedCard.position.player !== this.currentTurnTablePosition
      ) {
        resolve(null);
        return;
      }

      this.queenOwnChoiceCard = tappedCard;
      this.state = "awaitingQueenSwapOtherChoice";
      this.setCanBeTapped(this.state);
      tappedCard.selected = true;
      this.events.push({
        type: "text",
        message: "Choose a card to swap with",
        recipientSessionIds: [this.currentTurnSessionId],
      });
      resolve(this.sendStateToAll());
    });
  }

  /** @param {CardPosition} cardPosition */
  queenOtherChoice(cardPosition) {
    return new Promise((resolve) => {
      const tappedCard = /** @type {Card} */ (
        this.positionedCards.find((card) =>
          isEqual(card.position, cardPosition)
        )
      );

      if (
        tappedCard.position.area === "table" &&
        tappedCard.position.player === this.currentTurnTablePosition
      ) {
        resolve(null);
        return;
      }

      tappedCard.position = this.queenOwnChoiceCard.position;
      this.queenOwnChoiceCard.position = cardPosition;
      this.queenOwnChoiceCard.selected = false;
      resolve(this.nextTurn());
    });
  }

  rematch() {
    return new Promise((resolve) => {
      this.currentTurnTablePosition = 0;
      this.isCambioRound = false;
      this.hiddenDeck = [];
      this.hiddenPile = [];
      this.positionedCards = [];

      for (const [sessionId, data] of this.players.entries()) {
        this.players.set(sessionId, {
          ...data,
          ready: false,
          hasRequestedRematch: false,
          hasTakenFinalTurn: false,
        });
      }

      this.state = "settingUp";
      resolve(this.sendStateToAll());
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
      const pileCard = this.positionedCards.find(
        (card) => card.position.area === "pile"
      );
      const isValidSnap = pileCard && cardAtSnapPosition.rank === pileCard.rank;
      const snappingPlayerTablePosition = /** @type {number} */ (
        this.players.get(sessionId)?.tablePosition
      );

      this.previewedCardWasSnapped =
        snappedCardPosition.area === "viewing" &&
        snappedCardPosition.player === snappingPlayerTablePosition;

      let isAnotherPlayerCard =
        (snappedCardPosition.area === "viewing" ||
          snappedCardPosition.area === "table") &&
        snappedCardPosition.player !== snappingPlayerTablePosition;

      // If the snapped card was being previewed, assess whose it is
      // based on its position before previewing began
      if (this.previewedCardWasSnapped) {
        isAnotherPlayerCard =
          (this.previewedCardOriginalPosition?.area === "table" ||
            this.previewedCardOriginalPosition?.area === "viewing") &&
          this.previewedCardOriginalPosition.player !==
            snappingPlayerTablePosition;
      }

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

        this.events.push({
          type: "text",
          message: `${snappingPlayerName} snapped a ${cardTitle}`,
        });
        this.events.push({
          type: "text",
          message: `You get ${isAnotherPlayerCard ? "it & " : ""}a penalty`,
          recipientSessionIds: [sessionId],
        });
        this.events.push({
          type: "text",
          message: `They get ${isAnotherPlayerCard ? "it & " : ""}a penalty`,
          recipientSessionIds: [...this.players.keys()].filter(
            (id) => id !== sessionId
          ),
        });
      }

      if (isValidSnap && isAnotherPlayerCard) {
        this.state = "awaitingSnapResolutionChoice";
        this.savedSnappedCardPosition =
          this.previewedCardWasSnapped && this.previewedCardOriginalPosition
            ? this.previewedCardOriginalPosition
            : snappedCardPosition;
        const snappedOnName = [...this.players.values()].find(
          (p) => p.tablePosition === snappedCardPosition.player
        )?.name;
        this.events.push({
          type: "text",
          message: `Choose a card to give ${snappedOnName}`,
          recipientSessionIds: [this.playerWhoSnapped],
        });
        // Marking the snapping player's cards as canBeTapped here instead of
        // in `setCanBeTapped` to avoid passing `snappingPlayerTablePosition`
        this.positionedCards.forEach((card) => {
          card.canBeTapped =
            card.position.area === "table" &&
            card.position.player === snappingPlayerTablePosition;
        });
        resolve(this.sendStateToAll());
        return;
      }

      if (!isValidSnap && isAnotherPlayerCard) {
        // Further penalise the snapper by moving the snappedCard to their table area if they have room.
        const snappingPlayersTableCards = this.positionedCards.filter(
          (c) =>
            c.position.area === "table" &&
            c.position.player === snappingPlayerTablePosition
        );

        if (
          snappingPlayersTableCards.length >= TABLE_CARD_SLOTS &&
          this.previewedCardWasSnapped
        ) {
          // If we're here, you previewed another players card, incorrectly
          // snapped it, took a penalty that filled up your table area
          // so we now move the snapped card to the hidden pile so it doesn't linger
          this.hiddenPile.unshift(cardAtSnapPosition);
          this.positionedCards = this.positionedCards.filter(
            (card) => !isEqual(card.position, snappedCardPosition)
          );
        }

        if (snappingPlayersTableCards.length < TABLE_CARD_SLOTS) {
          cardAtSnapPosition.position = {
            area: "table",
            player: snappingPlayerTablePosition,
            tableSlot: this.getFirstAvailableTableSlot(
              snappingPlayerTablePosition
            ),
          };
        }
      } else if (!isValidSnap) {
        // This captures invalid snap while previewing one of your own cards
        const snappingPlayersTableCards = this.positionedCards.filter(
          (c) =>
            c.position.area === "table" &&
            c.position.player === snappingPlayerTablePosition
        );

        // The check for how many cards the snapping player has needs to add one
        // where an empty slot is usually occupied by the card you're previewing
        const snappingPlayersRealTableCardCount = this.previewedCardWasSnapped
          ? snappingPlayersTableCards.length + 1
          : snappingPlayersTableCards.length;
        if (snappingPlayersRealTableCardCount <= TABLE_CARD_SLOTS) {
          cardAtSnapPosition.position = this.previewedCardOriginalPosition || {
            area: "table",
            player: snappingPlayerTablePosition,
            tableSlot: this.getFirstAvailableTableSlot(
              snappingPlayerTablePosition
            ),
          };
        } else {
          // If we're here, you previewed one of your own cards, incorrectly
          // snapped it, took a penalty that overflowed your table (which shouldn't
          // happen in theory) so we now move the snapped card to the hidden pile
          this.hiddenPile.unshift(cardAtSnapPosition);
          this.positionedCards = this.positionedCards.filter(
            (card) => !isEqual(card.position, snappedCardPosition)
          );
        }
      }

      const snappersRemainingTableCards = this.positionedCards.filter(
        (c) =>
          c.position.area === "table" &&
          c.position.player === snappingPlayerTablePosition
      ).length;
      if (snappersRemainingTableCards === 0) {
        this.isCambioRound = true;
        const snapperData = this.players.get(this.playerWhoSnapped);
        if (snapperData) {
          this.players.set(this.playerWhoSnapped, {
            ...snapperData,
            hasTakenFinalTurn: true,
          });
          this.events.push({
            type: "text",
            message: `Cambio! ${snapperData.name} is out of cards`,
          });
        }
      }

      // You only get here if the snap was a valid one
      // of the player's own card or the snap was invalid
      this.restorePresnapState();
      resolve(this.sendStateToAll());
    });
  }

  restorePresnapState() {
    this.state = this.stateBeforeSnapSuspension;
    this.setCanBeTapped(this.stateBeforeSnapSuspension);

    if (this.viewingTimer) this.viewingTimer.start();
  }

  /** @param {State} state */
  setCanBeTapped(state) {
    if (state === "startingTurn") {
      // Deck and pile canBeTapped
      this.positionedCards.forEach((card) => {
        card.canBeTapped =
          card.position.area === "deck" || card.position.area === "pile";
      });
    } else if (state === "awaitingDeckSwapChoice") {
      //	Pile or any table cards of the current player
      this.positionedCards.forEach((card) => {
        card.canBeTapped =
          card.position.area === "pile" ||
          (card.position.area === "table" &&
            card.position.player === this.currentTurnTablePosition);
      });
    } else if (
      state === "awaitingPileSwapChoice" ||
      state === "awaitingMineLookChoice" ||
      state === "awaitingQueenSwapOwnChoice" ||
      state === "awaitingBlindSwapOwnChoice"
    ) {
      // Any table cards of the current player
      this.positionedCards.forEach((card) => {
        card.canBeTapped =
          card.position.area === "table" &&
          card.position.player === this.currentTurnTablePosition;
      });
    } else if (
      state === "awaitingMateLookChoice" ||
      state === "awaitingQueenLookChoice" ||
      state === "awaitingQueenSwapOtherChoice" ||
      state === "awaitingBlindSwapOtherChoice"
    ) {
      // Any table cards that aren't the current player
      this.positionedCards.forEach((card) => {
        card.canBeTapped =
          card.position.area === "table" &&
          card.position.player !== this.currentTurnTablePosition;
      });
    } else {
      // All can't be tapped
      this.positionedCards.forEach((card) => (card.canBeTapped = false));
    }
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

  startBlindSwap() {
    return new Promise((resolve) => {
      this.state = "awaitingBlindSwapOwnChoice";
      this.setCanBeTapped(this.state);
      this.events.push({
        type: "text",
        message: "Choose a card to swap",
        recipientSessionIds: [this.currentTurnSessionId],
      });
      resolve(this.sendStateToAll());
    });
  }

  startDeckSwap() {
    return new Promise((resolve) => {
      this.state = "awaitingDeckSwapChoice";
      // Move the deck card to the first open viewing slot of the current turn's player
      const currentDeckCard = this.positionedCards.find(
        (card) => card.position.area === "deck"
      );
      if (currentDeckCard) {
        currentDeckCard.position = {
          area: "viewing",
          viewingSlot: 0,
          player: this.currentTurnTablePosition,
        };
      }
      // Draw a new card for the deck card
      this.positionedCards.push({
        ...this.drawCard(),
        position: {
          area: "deck",
        },
      });

      this.setCanBeTapped(this.state);
      resolve(this.sendStateToAll());
    });
  }

  startMateLook() {
    return new Promise((resolve) => {
      this.state = "awaitingMateLookChoice";
      this.events.push({
        type: "graphic",
        name: "mateLook",
      });
      this.events.push({
        type: "text",
        message: "Choose a card to look at",
        recipientSessionIds: [this.currentTurnSessionId],
      });
      this.setCanBeTapped(this.state);
      resolve(this.sendStateToAll());
    });
  }

  startMineLook() {
    return new Promise((resolve) => {
      this.state = "awaitingMineLookChoice";
      this.events.push({
        type: "graphic",
        name: "mineLook",
      });
      this.events.push({
        type: "text",
        message: "Choose a card to look at",
        recipientSessionIds: [this.currentTurnSessionId],
      });
      this.setCanBeTapped(this.state);
      resolve(this.sendStateToAll());
    });
  }

  startPileSwap() {
    return new Promise((resolve) => {
      this.state = "awaitingPileSwapChoice";
      this.setCanBeTapped(this.state);
      resolve(this.sendStateToAll());
    });
  }

  /** @param {string} sessionId */
  startSnapSuspension(sessionId) {
    return new Promise((resolve) => {
      console.log("Starting snap suspension!");
      this.stateBeforeSnapSuspension = this.state;
      if (this.viewingTimer) this.viewingTimer.pause();
      this.state = "snapSuspension";
      this.canBeSnapped = false;
      this.playerWhoSnapped = sessionId;
      const snappingPlayerName = this.players.get(sessionId)?.name;

      this.events.push({
        type: "graphic",
        name: "snap",
      });

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
        this.events.push({
          type: "text",
          message: `${snappingPlayerName} didn't snap in time`,
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
        let canIt =
          (card.position.area === "table" ||
            card.position.area === "viewing") &&
          (this.options.canSnapOtherPlayers ||
            card.position.player === snappingPlayerTablePosition);

        if (
          card.position.area === "viewing" &&
          card.position.player !== snappingPlayerTablePosition
        ) {
          canIt = false;
        }

        card.canBeTapped = canIt;
      });
      resolve(this.sendStateToAll());
    });
  }

  startSpecialPower() {
    return new Promise((resolve) => {
      this.state = "startingSpecialPower";

      const pileCard = /** @type {Card} */ (
        this.positionedCards.find((c) => c.position.area === "pile")
      );

      if (pileCard.rank === "queen") {
        resolve(this.startQueenPower());
      } else if (pileCard.rank === "jack") {
        resolve(this.startBlindSwap());
      } else if (pileCard.rank === 7 || pileCard.rank === 8) {
        resolve(this.startMateLook());
      } else if (pileCard.rank === 9 || pileCard.rank === 10) {
        resolve(this.startMineLook());
      } else {
        resolve(this.nextTurn());
      }
    });
  }

  startQueenPower() {
    return new Promise((resolve) => {
      this.state = "awaitingQueenLookChoice";
      this.setCanBeTapped(this.state);
      this.events.push({
        type: "text",
        message: "Choose a card to look at",
        recipientSessionIds: [this.currentTurnSessionId],
      });
      resolve(this.sendStateToAll());
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
