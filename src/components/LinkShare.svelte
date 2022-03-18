<script>
  /** @type {string} */
  export let gameId;

  const dev = process.env.NODE_ENV === "development";
  // TODO: Update to actual production url
  const gameURL = dev
    ? `localhost:3000/game/${gameId}`
    : `https://cambio-club.herokuapp.com/game/${gameId}`;
  const canCopyToClipboard = (navigator.clipboard && navigator.clipboard.writeText) ? true : false;
  let canShare = (navigator.share) ? true : false;

  let buttonText = (canShare) ? "Share game link" : "Copy game link";

  function handleCopy() {
    navigator.clipboard.writeText(gameURL);
    buttonText = "Copied!";
    const timer = setTimeout(() => {
      buttonText = "Copy game link";
    }, 1500);
  }

  function handleShare() {
    navigator
      .share({
        title: "Let's play Cambio!",
        text: "Follow the link to join the game",
        url: gameURL,
      })
      .then(() => {
        buttonText = "Shared!";
        const timer = setTimeout(() => {
          buttonText = "Share game link";
        }, 1500);
      })
      .catch(() => {
        canShare = false;
      });
  }
</script>

<h3>Invite other players</h3>
<div class="wrapper">
  {#if canShare}
    <button on:click={handleShare}>{buttonText}</button>
  {:else if canCopyToClipboard}
    <button on:click={handleCopy}>{buttonText}</button>
  {:else}
    <p class="share-link">Share the game link:</p>
  {/if}
  <div class="url-wrapper">
    <p class="url">{gameURL}</p>
  </div>
</div>

<style>
  button {
    display: block;
    min-width: 7rem;
    margin-bottom: 0.5rem;
  }

  .wrapper {
    background: var(--game-bg-lightest);
    padding: 0.5rem;
    border-radius: 0.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .share-link {
    margin-bottom: 0.5rem;
  }
  
  .url-wrapper {
    width: 100%;
    white-space: nowrap;
    overflow-x: scroll;
    text-align: center;
  }

  .url {
    opacity: 0.65;
    font-size: 18px;
    margin: 0;
  }
</style>
