<script>
  // @ts-check
  import { goto } from "@sapper/app";

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
  <button on:click|preventDefault={newGame}>Start new game</button>
  <button class="toggle" on:click|preventDefault="{() => (showOptions = !showOptions)}">
    Options
  </button>
  {#if showOptions}
    {#each options as option}
      <label
        ><input
          type="checkbox" 
          value={option}
          bind:group={selectedOptions}
        />{option}</label
      >
    {/each}
  {/if}
</form>

<style>
  label {
    display: block;
  }
  
  .toggle {
    display: block;
    border: none;
    margin: 0;
    padding: 0;
  }
</style>
