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

<main>
  <h1>Cambio Club</h1>
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
  main {
    max-width: 30em;
    margin: 0 auto 0;
  }

  section {
    margin: 0 0 4rem;
  }
</style>
