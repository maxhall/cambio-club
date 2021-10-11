<script>
  // @ts-check
  import { goto } from "@sapper/app";
  let selectedOptions = ["Allow snapping others' cards"];
  const options = ["Allow snapping others' cards", "Show Cambio points on picture cards"];
  
  /** @type {import('../types').GameOptions} */
  $: optionsObject = {
    showValuesOnPictureCards: selectedOptions.includes("Show Cambio points on picture cards"),
    canSnapOtherPlayers: selectedOptions.includes("Allow snapping others' cards"),
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
  <h2>Start a new game</h2>
  {#each options as option}
    <label
      ><input
        type="checkbox"
        value={option}
        bind:group={selectedOptions}
      />{option}</label
    >
  {/each}
  <button on:click|preventDefault={newGame}>Create game</button>
</form>
