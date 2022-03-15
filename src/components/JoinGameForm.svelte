<script>
  // @ts-check
  import { goto } from "@sapper/app";

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

  // TODO: Fixed height for the error wrapper
  // Hover state
  // Focus state :focus
  //
</script>

<form>
  <label for="game-id">Join with a game code:</label>
  <input bind:value={gameId} type="text" name="room" id="game-id" placeholder="e.g. 1042"/>
  <button on:click|preventDefault={joinGame}>Join game</button>
</form>
<div class="error-wrapper">
  {#if joinError}
    <p class="error">{joinError}</p>
  {/if}
</div>

<style>
  .error {
    color: red;
  }
</style>
