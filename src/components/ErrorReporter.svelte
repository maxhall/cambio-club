<script>
  /** @type {import('socket.io-client').Socket} */
  export let socket;
  /** @type {string} */
  export let gameId;

  let buttonText = "Report";

  function handleErrorReport() {
    buttonText = "Thanks!";
    setTimeout(() => {
      buttonText = "Report";
    }, 3000);
    socket.emit("update", {
      gameId,
      action: "errorReport",
    });
  }
</script>

<div>
  <h3>Did something go wrong?</h3>
  <p>Tap report to help fix any issues with the game</p>
  <button on:click={handleErrorReport}>{buttonText}</button>
</div>

<style>
  p,
  button {
    font-size: 14px;
    line-height: 18px;
  }

  p {
    margin-bottom: 0.25rem;
  }

  button {
    width: 3rem;
    padding: 0.25rem;
  }

  div {
    background: var(--game-bg-lightest);
    padding: 0.5rem;
    border-radius: 0.25rem;
    margin: 1rem 0 0 0;
  }
</style>
