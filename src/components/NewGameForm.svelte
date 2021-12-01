<script>
  // @ts-check
  import { goto } from "@sapper/app";
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
  <button on:click|preventDefault={newGame}>Start a new game</button>
  {#each options as option}
    <label
      ><input
        type="checkbox"
        value={option}
        bind:group={selectedOptions}
      />{option}</label
    >
  {/each}
</form>

<style>
  label {
    display: block;
  }
</style>
