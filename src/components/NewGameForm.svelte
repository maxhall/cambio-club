<script>
  // @ts-check
  import { goto } from "@sapper/app";
  import { slide } from "svelte/transition";

  let showOptions = false;
  let selectedOptions = ["Allow snapping others' cards"];
  const options = [
    "Allow snapping others' cards",
    "Open hands",
    "Risky fives: -25 for two, +50 for one"
  ];
  
  /** @type {import('../types').GameOptions} */
  $: optionsObject = {
    canSnapOtherPlayers: selectedOptions.includes("Allow snapping others' cards"),
    riskyFives: selectedOptions.includes("Risky fives: -25 for two, +50 for one"),
    openHands: selectedOptions.includes("Open hands"),
  };

  function newGame() {
    fetch("/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(optionsObject),
    })
      .then((res) => res.json())
      .then((json) => {
        goto(`/game/${json.gameId}`);
      });
  }
</script>

<form>
  <button class="primary-button" on:click|preventDefault={newGame}>Start new game</button>
  <button class="toggle" on:click|preventDefault="{() => (showOptions = !showOptions)}">
    <span><svg class:toggled={showOptions} viewBox="0 0 12 12"><path d="M0 0 0 12 10 6Z"/></svg></span>
    Options
  </button>
  {#if showOptions}
  <div transition:slide class="options">
    {#each options as option}
      <label
        ><input
          type="checkbox" 
          value={option}
          bind:group={selectedOptions}
        />{option}</label
      >
    {/each}
  </div>
  {/if}
</form>

<style>
  label {
    display: block;
  }
  
  .primary-button {
    margin-bottom: 0.25rem;
  }

  span {
    display: inline-block;
    width: 0.4rem;
    height: 0.4rem;
    transform-origin: 50% 50%;
  }
  
  svg {
    transition: transform 0.2s ease-in-out;
  }

  .toggled {
    transform: rotate(0.25turn);
  }

  .toggle {
    font-size: 16px;
    display: block;
    border: none;
    margin: 0 0 0.5rem;
    padding: 0.25rem;
  }

  .options {
    margin: 0 0 1rem;
    padding-left: 0.5rem;
    border-left: 2px solid var(--game-bg);
  }

  input {
    margin-right: 0.25rem;
  }
</style>
