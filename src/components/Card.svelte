<script>
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";

  /** @typedef {import('../types').Rank} Rank */
  /** @type {Rank | undefined} */
  export let rank;
  /** @typedef {import('../types').Suit} Suit */
  /** @type {Suit | undefined} */
  export let suit;
  /** @type {number} */
  export let width;
  /** @type {number} */
  export let height;
  export let selected = false;
  export let canBeTapped = false;
  export let facedown = false;
  export let transforms = {
    rotation: 0,
    xTranslation: 0,
    yTranslation: 0,
  };
  /** @type {import('../types').CardPosition}*/
  export let position;
  /** @type {import('socket.io-client').Socket} */
  export let socket;
  /** @type {string} */
  export let gameId;

  const tweenedTransforms = tweened(transforms, {
    duration: 3000,
    easing: cubicOut,
  });
  $: $tweenedTransforms = transforms;

  const suitSymbols = {
    clubs: "&clubs;",
    hearts: "&hearts;",
    diamonds: "&diams;",
    spades: "&spades;",
  };
  $: suitSymbol = (suit && typeof suit == 'string') ? suitSymbols[suit] : "&starf;";
  
  const rankCharacters = {
    ace: "A",
    king: "K",
    queen: "Q",
    jack: "J",
    joker: "Jo",
  };
  $: rankCharacter = (rank && typeof rank == 'string') ? rankCharacters[rank] : rank;

  function handleClick() {
    console.log('Click before canBeTapped check...');
    if (canBeTapped) {
      /** @type {import('../types').Update} */
      const update = {
        gameId,
        action: "tapCard",
        cardPosition: position,
      };
      console.log(update);
      socket.emit("update", update);
    }
  }
</script>

<div
  on:click={handleClick}
  class="card"
  class:red={suit === "hearts" || suit === "diamonds"}
  class:facedown
  class:selected
  class:canBeTapped
  style="height: {height}px; width: {width}px; padding: {width /
    8}px; transform: translate({$tweenedTransforms.xTranslation}px, {$tweenedTransforms.yTranslation}px) rotate({$tweenedTransforms.rotation}turn);"
>
  {#if !facedown}
    <p class="rank">{rankCharacter}</p>
    <p class="suit">{@html suitSymbol}</p>
  {/if}
</div>

<style>
  .card {
    box-sizing: border-box;
    background-color: white;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 1000;
  }

  p {
    margin: 0;
    padding: 0;
    line-height: 1;
    font-weight: bold;
    font-size: 12px;
    text-align: center;
  }

  .red p {
    color: red;
  }

  .facedown {
    background-color: purple;
  }

  .canBeTapped {
    border: 2px solid orange;
  }

  @keyframes selected-shadow {
    0% {
      box-shadow: none;
    }
    33% {
      box-shadow: 0px 0px 3px 3px rgba(255, 208, 0, 0.8);
    }
    66% {
      box-shadow: 0px 0px 3px 3px rgba(255, 208, 0, 0.8);
    }
    100% {
      box-shadow: none;
    }
  }
  .selected {
    animation: selected-shadow ease-in-out 1.5s infinite;
  }
</style>
