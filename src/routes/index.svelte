<script>
  // @ts-check
  import { goto } from "@sapper/app";
  import NewGameForm from "../components/NewGameForm.svelte";
  /** @type {string} */
  let gameId;
  let joinError = '';

  function joinGame() {
    const regex = /^[0-9]{4}$/;
    if (regex.test(gameId)) {
      joinError = '';
      goto(`/game/${gameId}`);
    } else {
      joinError = 'A game id is four numbers, like 1234';
    }
  }
</script>

<svelte:head>
  <title>Session management test</title>
</svelte:head>

<h1>Front page</h1>

<form>
  <h2>Join a game</h2>
  <label for="game-id">Enter your code:</label>
  <input bind:value={gameId} type="text" name="room" id="game-id" />
  <button on:click|preventDefault={joinGame}>Join</button>
  {#if joinError}
    <p class="error">{joinError}</p>
  {/if}
</form>

<NewGameForm />

<style>
  form {
    margin: 0 0 3rem 0;
  }

  .error {
    color: red;
  }
</style>
