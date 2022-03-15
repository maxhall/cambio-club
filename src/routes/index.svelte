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

{#if showRulesModal}
  <Modal on:close={() => (showRulesModal = false)}><Rules /></Modal>
{/if}

<style>
  section {
    margin: 0 0 3rem;
  }
</style>
