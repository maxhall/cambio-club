<script>
  // @ts-check
  import { goto } from "@sapper/app";
  let selectedOptions = ["Sound effects"];
  const options = ["Cool explosions", "Sound effects"];

  /** @type {import('../types').GameOptions} */
  $: optionsObject = {
    explosions: selectedOptions.includes("Cool explosions"),
    soundEffects: selectedOptions.includes("Sound effects"),
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
