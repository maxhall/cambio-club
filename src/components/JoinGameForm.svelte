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
  <div class="input-wrapper">
    <input bind:value={gameId} type="text" name="room" id="game-id" />
    <label for="game-id">Enter a game code</label>
  </div>
  <button on:click|preventDefault={joinGame}>Join game</button>
</form>
<div class="error-wrapper">
  {#if joinError}
    <p class="error">{joinError}</p>
  {/if}
</div>

<style>
  form {
    position: relative;
    display: flex;
    align-items: center;
    max-width: 25rem;
    margin-top: 1rem;
  }

  form:hover input,
  form:hover > button {
    border-color: seagreen;
  }

  label,
  .input-wrapper,
  input,
  button {
    margin: 0;
    padding: 0;
    border: none;
    display: inline-block;
  }

  .input-wrapper {
    flex: 1;
  }

  input {
    width: 100%;
    border: 6px solid grey;
    border-width: 6px 0px 6px 6px;
    padding: 0.4rem;
    font-size: 25px;
    font-weight: bold;
    line-height: 1;
  }

  input:focus {
    border-color: sandybrown;
    outline: none;
  }

  label {
    position: absolute;
    left: 1rem;
    top: 0.35rem;
    font-size: 1.5rem;
    transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1),
      color 150ms cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: top left;
  }

  button {
    border: 6px solid grey;
    padding: 0.5rem;
    font-size: 25px;
    font-weight: bold;
    line-height: 1;
    height: 100%;
  }

  button:hover,
  button:focus {
    outline: none;
    background-color: red;
    color: white;
  }

  button:active {
    background-color: blueviolet;
  }

  input:focus + label {
    transform: scale(60%) translate(-1.75rem, -2.25rem);
  }

  .error {
    color: red;
  }
</style>
