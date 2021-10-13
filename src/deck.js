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
      });
    });
  });

  const joker = {
    rank: "joker",
    suit: null,
    value: 0,
  };

  deck.push(joker);
  deck.push(joker);

  return shuffle(deck);
}

export { shuffledDeck, shuffle };
