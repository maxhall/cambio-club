<script>
  // @ts-check
  import { goto } from "@sapper/app";
  import NewGameForm from "../components/NewGameForm.svelte";
  import Logo from "../components/Logo.svelte";

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
  <title>Cambio Club</title>
</svelte:head>

<Logo />

<main>
  <form>
    <label for="game-id">Enter a game code:</label>
    <input bind:value={gameId} type="text" name="room" id="game-id" />
    <button on:click|preventDefault={joinGame}>Join</button>
    {#if joinError}
      <p class="error">{joinError}</p>
    {/if}
  </form>
  <NewGameForm />
  <p>What is Cambio?</p>
</main>

<style>
  label, button {
    display: block;
  }
  form {
    margin: 0 0 3rem 0;
  }

  main {
    max-width: 30em;
    margin: 0 auto;
  }

  .error {
    color: red;
  }
</style>
