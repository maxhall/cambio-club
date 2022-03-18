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
    <h1>Cambio Club</h1>
    <p>An online multi-player card game</p>
    <section>
      <NewGameForm />
    </section>
    <section>
      <JoinGameForm />
    </section>
    <section>
      <button on:click={() => (showRulesModal = true)}>Learn to play</button>
    </section>
  </main>
  <footer class="pane reset">
    <p class="credit">Made by <a href="https://twitter.com/maxjhall">Max Hall</a></p>
  </footer>
</div>

{#if showRulesModal}
  <Modal on:close={() => (showRulesModal = false)}><Rules /></Modal>
{/if}

<style>
  :global(body) {
    height: 100%;
  }

  .wrapper {
    min-height: 100%;
    display: grid;
    grid-template-rows: 1fr auto;
  }

  section {
    margin: 0 0 3rem;
  }

  .reset {
    padding: 0;
  }

  .credit {
    font-size: 16px;
    margin-bottom: 0.5rem;
    color: var(--game-bg);
  }
</style>
