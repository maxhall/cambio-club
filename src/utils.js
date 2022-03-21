import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});

/**
 * Shuffles array in place. ES6 version from
 * https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array/6274381#6274381
 * @param {Array<any>} givenA items An array containing the items.
 */
function shuffle(givenA) {
  const a = [...givenA];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** @typedef {import('./types').Card} Card */
/**
 * Shuffled deck
 * @returns {Card[]}
 */
function shuffledDeck() {
  /** @typedef {import('./types').Suit} Suit */
  /** @type {Suit[]} */
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  /** @typedef {import('./types').Rank} Rank */
  /** @type  {Rank[]} */
  const ranks = ["ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jack", "queen", "king"];
  const deck = [];
  let id = 0;

  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      /** @type {number} */
      let value;

      if (typeof rank === "number") {
        value = rank;
      } else if (rank === "king") {
        const isRed = suit === "hearts" || suit === "diamonds";
        value = isRed ? 40 : -1;
      } else {
        switch (rank) {
          case "ace":
            value = 1;
            break;
          default:
            value = 10;
            break;
        }
      }
      deck.push({
        rank,
        suit,
        value,
        id: id++,
      });
    });
  });

  deck.push({
    rank: "joker",
    suit: null,
    value: 0,
    id: id++,
  });

  deck.push({
    rank: "joker",
    suit: null,
    value: 0,
    id: id++,
  });

  return shuffle(deck);
}

class Timer {
  /**
   * @param {() => void} callback
   * @param {number} delay Time in milliseconds
   * 
   * This probably wouldn't respond well to `start()` being called several times 
   * nor does it prevent being restrated once it's finished
   */
  constructor(callback, delay) {
    this.callback = callback;
    this.remaining = delay;
    /** @type {number} */
    this.startedTime;
    /** @type {NodeJS.Timeout} */
    this.timeout;
    this.running = false;

    this.start();
  }

  start() {
    console.log('Timer started');
    this.running = true;
    this.startedTime = new Date().valueOf();
    this.timeout = setTimeout(this.callback, this.remaining);
  }

  pause() {
    console.log('Timer paused');
    this.running = false;
    clearTimeout(this.timeout);
    const timeElapsedSinceLastStart = new Date().valueOf() - this.startedTime;
    this.remaining = this.remaining - timeElapsedSinceLastStart;
  }

  remove() {
    console.log(`Removing timer`);
    this.running = false;
    clearTimeout(this.timeout);
  }

  getRemainingTime() {
    if (this.running) {
      this.pause();
      this.start();
    }

    return this.remaining;
  }

  isRunning() {
    return this.running;
  }
}

export { logger, Timer, shuffledDeck, shuffle };
