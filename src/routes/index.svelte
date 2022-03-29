<script>
  // @ts-check
  import JoinGameForm from "../components/JoinGameForm.svelte";
  import NewGameForm from "../components/NewGameForm.svelte";
  import Rules from "../components/Rules.svelte";
  import Modal from "../components/Modal.svelte";

  let showRulesModal = false;
</script>

<svelte:head>
  <title>Cambio Club</title>
</svelte:head>

<div class="wrapper">
  <main class="pane">
    <h1>CAMBIO</h1>
    <video loop muted autoplay playsinline poster="/front-gameplay-poster.png">
      <source src="front-gameplay.webm" type="video/webm" />
      <source src="front-gameplay.mp4" type="video/mp4" />
    </video>
    <section class="centred-content">
      <NewGameForm />
    </section>
    <section class="centred-content">
      <JoinGameForm />
    </section>
    <section class="learn-wrapper">
      <button class="learn-button" on:click={() => (showRulesModal = true)}>Learn to play</button>
    </section>
  </main>
  <footer class="pane reset">
    <p class="credit">
      Made by <a href="https://twitter.com/maxjhall">Max Hall</a>
    </p>
  </footer>
</div>

{#if showRulesModal}
  <Modal on:close={() => (showRulesModal = false)}><Rules /></Modal>
{/if}

<style>
  :global(body) {
    height: 100%;
  }

  :global(.centred-content form) {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .wrapper {
    min-height: 100%;
    display: grid;
    grid-template-rows: 1fr auto;
  }

  h1 {
    text-align: center;
    margin: 0 0 -1rem 0;
    line-height: 0.9;
    z-index: 5;
    position: relative;
  }

  video {
    width: 100%;
  }
  
  section {
    margin: 0 0 1rem;
    width: 100%;
  }

  .reset {
    padding: 0;
  }

  .learn-wrapper {
    display: flex;
    justify-content: center;
  }

  .learn-button {
    margin-top: 0.5rem;
  }

  .credit {
    font-size: 16px;
    margin-bottom: 0.5rem;
    color: var(--game-bg);
  }
</style>
