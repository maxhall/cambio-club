<script>
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import CardPath from "./CardPath.svelte";

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
    duration: 850,
    easing: cubicOut,
  });
  $: $tweenedTransforms = transforms;

  function handleClick() {
    console.log("Click before canBeTapped check...");
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
  class:selected
  class:canBeTapped
  style="height: {height}px; width: {width}px; transform: translate({$tweenedTransforms.xTranslation}px, {$tweenedTransforms.yTranslation}px) rotate({$tweenedTransforms.rotation}turn);"
>
  {#if !facedown}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class:red={suit === "hearts" || suit === "diamonds"}
      viewBox="0 0 500 700"
    >
      <CardPath {width} {rank} {suit} />
    </svg>
  {:else}
    <div class="chevron" />
  {/if}
</div>

<style>
  .card {
    box-sizing: border-box;
    background-color: white;
    border-radius: 2px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .chevron {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #eceddc 25%, transparent 25%) -50px 0,
      linear-gradient(225deg, #eceddc 25%, transparent 25%) -50px 0,
      linear-gradient(315deg, #eceddc 25%, transparent 25%),
      linear-gradient(45deg, #eceddc 25%, transparent 25%);
    background-size: 100px 100px;
    background-color: #ec173a;
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
