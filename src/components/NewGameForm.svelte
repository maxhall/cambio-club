<script>
  // @ts-check
  import { goto } from "@sapper/app";
  import { slide } from "svelte/transition";

  let showOptions = false;
  let selectedOptions = ["Allow snapping others' cards"];
  const options = [
    "Allow snapping others' cards",
    "Open hands",
    "Risky fives: -25 for two, +50 for one",
  ];

  /** @type {import('../types').GameOptions} */
  $: optionsObject = {
    canSnapOtherPlayers: selectedOptions.includes(
      "Allow snapping others' cards"
    ),
    riskyFives: selectedOptions.includes(
      "Risky fives: -25 for two, +50 for one"
    ),
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
  <button class="primary-button" on:click|preventDefault={newGame}
    >Start new game</button
  >
  <button
    class="toggle"
    class:toggled={showOptions}
    on:click|preventDefault={() => (showOptions = !showOptions)}
  >
    <span
      ><svg class:icon-toggled={showOptions} viewBox="0 0 12 12"
        ><path d="M0 0 0 12 10 6Z" /></svg
      ></span
    >
    Options
  </button>
</form>
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

<style>
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

  .icon-toggled {
    transform: rotate(0.25turn);
  }

  .toggle {
    font-size: 16px;
    display: block;
    border: none;
    margin: 0;
    padding: 0rem 0.25rem;
  }

  .toggled {
    margin: 0 0 0.5rem;
  }

  .options {
    margin: 0 0 1rem;
    padding: 0.25rem 0 0.25rem 0.5rem;
    border-left: 2px solid var(--game-bg);
  }

  label {
    display: grid;
    grid-template-columns: 1rem auto;
    gap: 0.5rem;
    margin: 0;
  }

  label + label {
    margin: 0.5rem 0 0 0;
  }

  input[type="checkbox"] {
    /* margin-right: 0.25rem; */
    -webkit-appearance: none;
    appearance: none;
    /* For iOS < 15 to remove gradient background */
    background-color: #fff;
    margin: 0;
    padding: 0;
    width: 1rem;
    height: 1rem;
    transform: translateY(-1px);
    display: grid;
    place-content: center;
  }

  input[type="checkbox"]:hover {
    background-color: var(--game-bg-lightest);
  }

  input[type="checkbox"]::before {
    content: "";
    width: 0.65em;
    height: 0.65em;
    transform: scale(0);
    transition: 120ms transform ease-in-out;
    box-shadow: inset 1em 1em var(--game-bg);
    transform-origin: bottom left;
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  }

  input[type="checkbox"]:checked::before {
    transform: scale(1);
  }
</style>
