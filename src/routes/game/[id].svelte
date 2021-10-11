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
  import Game from "../../components/Game.svelte";
  /** @type {string} */
  export let gameId;

  // Why an extra wrapper around the game logic?
  // https://github.com/sveltejs/kit/issues/552#issuecomment-714192401
</script>

{#key gameId}
  <Game {gameId} />
{/key}
