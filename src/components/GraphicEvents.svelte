<script>
  import { slide } from "svelte/transition";
  import { shuffle } from "../utils";

  /** @type {import('../types').Events} */
  export let events;

  /** @type {import('../types').GraphicEvent[]} */
  const queue = [];
  const TIME_BETWEEN_EVENTS = 4000;

  /** @type {Record<import('../types').GraphicEventName, string[]>} */
  const graphicTypes = {
    queensGambit: [
      "queensGambit1.webp",
      "queensGambit2.webp",
      "queensGambit3.webp",
      "queensGambit4.webp",
      "queensGambit5.webp",
    ],
    penalty: ["penalty-wasted.webp", "penalty-ref.webp", "penalty-kid.webp"],
    mineLook: [
      "mineLook-SpiderMan.webp",
      "mineLook-Puppy.webp",
      "mineLook-Portman.webp",
    ],
    mateLook: ["mateLook-SideEye.webp", "mateLook-MrBean.webp"],
    joker: ["joker-heath.webp"],
    win: ["win-fireworks.webp", "win-streamers.webp"],
    gough: ["gough-and-patty.jpg", "gough.jpg", "whitlam-dismissal.jpg"],
    snap: ["snap-explosion.webp", "snap-the-rock.webp"],
    cambio: ["cambio-yelling.webp", "cambio-rolling.webp"],
  };

  /** @type {NodeJS.Timeout | undefined} */
  let queueTimer;
  /** @type {string | null}*/
  let graphicUrl = null;

  $: if (events.length > 0) processEvents(events);

  /** @param {import('../types').Events} newEvents */
  function processEvents(newEvents) {
    newEvents.forEach((event) => {
      if (event.type === "graphic") {
        queue.push(event);
      }
    });

    runQueue();
  }

  function runQueue() {
    if (queueTimer) {
      return;
    }
    const event = queue.shift();
    if (event) {
      if (graphicTypes[event.name] && graphicTypes[event.name].length > 0) {
        graphicUrl = shuffle(graphicTypes[event.name])[0];
      }
      queueTimer = setTimeout(() => {
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
