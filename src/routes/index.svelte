<script>
  // @ts-check
  import JoinGameForm from "../components/JoinGameForm.svelte";
  import NewGameForm from "../components/NewGameForm.svelte";
  import Rules from "../components/Rules.svelte";
  import Modal from "../components/Modal.svelte";
  import SpinningCard from "../components/SpinningCard.svelte";

  let showRulesModal = false;
</script>

<svelte:head>
  <title>Cambio Club</title>
  <meta property="og:title" content="Cambio Club" />
  <meta property="og:url" content="https://cambioclub.online" />
</svelte:head>

<div class="wrapper">
  <main class="pane front-pane">
    <h1>Cambio Club</h1>
    <video loop muted autoplay playsinline poster="/front-gameplay-poster.png">
      <source src="front-gameplay.webm" type="video/webm" />
      <source src="front-gameplay.mp4" type="video/mp4" />
    </video>
    <section class="centred-content">
      <NewGameForm />
    </section>
    <SpinningCard />
    <section class="centred-content">
      <JoinGameForm />
    </section>
    <SpinningCard />
    <section class="learn-wrapper">
      <button class="learn-button" on:click={() => (showRulesModal = true)}
        >Learn to play</button
      >
    </section>
    <p class="credit">
      By <a href="https://twitter.com/maxjhall">Max Hall</a>
    </p>
  </main>
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
    grid-template-rows: auto 1fr;
    background-color: var(--game-bg);
  }

  .front-pane {
    margin: 1rem auto;
    padding: 1rem;
    background: var(--white);
    border-radius: 0.5rem;
  }

  @media (max-width: 500px) {
    .front-pane {
      border-radius: 0;
      margin: 0;
    }

    .wrapper {
      background: var(--white);
    }
  }

  h1 {
    text-align: center;
    margin: 0 0 -1rem 0;
    line-height: 0.9;
    z-index: 1;
    position: relative;
    text-transform: uppercase;
    letter-spacing: -1px;
  }

  video {
    width: 100%;
  }

  section {
    margin: 0 0 1rem;
    width: 100%;
  }

  .learn-wrapper {
    display: flex;
    justify-content: center;
  }

  .credit {
    font-size: 16px;
    color: var(--game-bg);
    margin-bottom: 0;
    text-align: center;
  }
</style>
