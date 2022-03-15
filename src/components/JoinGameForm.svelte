<script>
  // @ts-check
  import { goto } from "@sapper/app";
  import { slide } from "svelte/transition";

  /** @type {string} */
  let gameId;
  let joinError = "";

  function joinGame() {
    const regex = /^[0-9]{4}$/;
    if (regex.test(gameId)) {
      joinError = "";
      goto(`/game/${gameId}`);
    } else {
      joinError = "A game code is four numbers, like 1234";
    }
  }
</script>

<form>
  <label for="game-id">Join with a game code:</label>
  <div class="input-pair">
    <input
      bind:value={gameId}
      type="text"
      name="room"
      id="game-id"
      placeholder="e.g. 1042"
    />
    <button on:click|preventDefault={joinGame}>Join game</button>
  </div>
</form>
<div class="error-wrapper">
  {#if joinError}
    <p transition:slide class="error">{joinError}</p>
  {/if}
</div>

<style>
  .error-wrapper {
    height: 1rem;
    margin: 0.25rem 0 0;
  }

  .error {
    color: red;
  }
</style>
