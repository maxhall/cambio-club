<script>
  import { slide } from "svelte/transition";
  import { shuffle } from "../utils";

  /** @type {import('../types').Events} */
  export let events;

  /** @type {import('../types').GraphicEvent[]} */
  const queue = [];
  const TIME_BETWEEN_EVENTS = 4000;

  /** @type {{[index: string]: string[]}} */
  const graphicTypes = {
    queensGambit: [
      "queensGambit1.webp",
      "queensGambit2.webp",
      "queensGambit3.webp",
      "queensGambit4.webp",
      "queensGambit5.webp",
    ],
    penalty: ["penalty-wasted.webp"],
  };

  /** @type {NodeJS.Timeout | undefined} */
  let queueTimer;
  /** @type {string | null}*/
  let graphicUrl = null;

  $: if (events.length > 0) processEvents(events);

  /** @param {import('../types').Events} newEvents */
  function processEvents(newEvents) {
    console.log("Processing graphics events");
    newEvents.forEach((event) => {
      if (event.type === "graphic") {
        console.log("Received graphic event:");
        console.log(event);
        queue.push(event);
      }
    });

    runQueue();
  }

  function runQueue() {
    console.log("Run queue called");
    if (queueTimer) {
      return;
    }
    console.log("Running graphic event queue");
    const event = queue.shift();
    console.log("Found event:");
    console.log(event);
    if (event) {
      console.log(`Taking event off the queue:`);
      console.log(event);
      if (graphicTypes[event.name] && graphicTypes[event.name].length > 0) {
        graphicUrl = shuffle(graphicTypes[event.name])[0];
        console.log(`Setting graphicUrl: ${graphicUrl}`);
      }
      queueTimer = setTimeout(() => {
        console.log(`Removing ${graphicUrl}`);
        graphicUrl = null;
        queueTimer = undefined;
        runQueue();
      }, TIME_BETWEEN_EVENTS);
    }
  }
</script>

<svelte:head>
  {#each Object.keys(graphicTypes) as key}
    {#each graphicTypes[key] as path}
      <link rel="preload" as="image" href="/events/{path}" />
    {/each}
  {/each}
</svelte:head>

<div>
  {#if graphicUrl}
    <img transition:slide src="/events/{graphicUrl}" alt="" />
  {/if}
</div>

<style>
  div {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  img {
    max-width: 80vw;
    max-height: 60vh;
  }
</style>
