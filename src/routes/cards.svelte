<script>
  import Card from "../components/Card.svelte";

  const sizes = [15, 20, 30, 40, 50, 80];
  const socket = /** @type {import('socket.io-client').Socket} */ ({});
</script>

<main>
  {#each sizes as size}
    <article>
      <Card
        rank="joker"
        facedown={true}
        suit={undefined}
        width={size}
        height={size * 1.4}
        position={{ area: "deck" }}
        {socket}
        gameId={"1111"}
      />
      <p>{size}</p>
    </article>
  {/each}
</main>
<div class="overlay" />

<style>
  main {
    background-color: slategray;
    width: 100%;
    height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    padding: 4rem;
  }
</style>
