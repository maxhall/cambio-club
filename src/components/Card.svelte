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
    <div
      class="back"
      style="background: repeating-linear-gradient( -45deg, #444cf7, #444cf7 {width /
        6.4}px, var(--white) {width / 6.4}px, var(--white) {width /
        4}px ); border-width: {width / 10}px"
    />
  {/if}
</div>

<style>
  .card {
    box-sizing: border-box;
    background-color: var(--white);
    border-radius: 2px;
    z-index: var(--z-game-card);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .back {
    height: 100%;
    border-radius: 2px;
    border: 4px solid var(--white);
  }

  .canBeTapped {
    border: 1px solid orange;
    animation: can-be-tapped-shadow ease-in-out 2s infinite;
  }

  @keyframes can-be-tapped-shadow {
    0% {
      box-shadow: none;
    }
    33% {
      box-shadow: 0px 0px 2px 2px orange;
    }
    66% {
      box-shadow: 0px 0px 2px 2px orange;
    }
    100% {
      box-shadow: none;
    }
  }

  .selected {
    border: 1px solid var(--viewing-blue-light);
    box-shadow: 0px 0px 2px 2px var(--viewing-blue-light);
  }
</style>
