<script context="module">
  // @ts-check
  /** @type {import('@sapper/common').Preload} */
  export async function preload(page) {
    const { id } = page.params;

    const gameId = id;
    return { gameId };
  }
</script>

<script>
  // @ts-check
  import GameWrapper from "../../components/GameWrapper.svelte";
  /** @type {string} */
  export let gameId;

  // Why an extra wrapper around the game logic?
  // https://github.com/sveltejs/kit/issues/552#issuecomment-714192401
</script>

<svelte:head>
  <title>Cambio {gameId}</title>
  <meta property="og:title" content="Play Cambio game {gameId}" />
  <meta property="og:url" content="https://cambioclub.online/game/{gameId}" />
</svelte:head>
{#key gameId}
  <GameWrapper {gameId} />
{/key}
