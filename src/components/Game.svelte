<script>
  import { fly } from "svelte/transition";
  /** @type {import('@sapper/app').goto } */
  import { goto } from "@sapper/app";
  /** @type {import('../types').ClientState} */
  export let state;
  /** @type {import('socket.io-client').Socket}*/
  export let socket;
  /** @type {import('../types').Events} */
  let textEvents = [];
  let graphicEvents = [];
  let eventText = "";
  /** @type {NodeJS.Timeout | undefined} */
  let eventTextQueueTimer;

  const eventTextTimeout = 3000;

  $: console.log(state);
  // TODO: If events get funky, find a non-reactive approach to this
  $: if (state.events.length > 0) processEvents(state.events);

  // TODO: Remove function
  function handlePlusOne() {
    sendUpdate({
      gameId: state.gameId,
      action: "plusOne",
    });
  }

  function handleLeave() {
    sendUpdate({
      gameId: state.gameId,
      action: "leave",
    });
    socket.disconnect();
    goto("/");
  }

  /** @param {import('../types').Update} update*/
  function sendUpdate(update) {
    socket.emit("update", update);
  }

  /** @param {import('../types').Events} newEvents */
  function processEvents(newEvents) {
    newEvents.forEach((event) => {
      if (event.type === "text") {
        textEvents.push(event);
      }
      graphicEvents.push(event);
    });

    runTextEventQueue();
  }

  function runTextEventQueue() {
    if (eventTextQueueTimer) {
      return;
    }
    const event = textEvents.shift();
    if (event) {
      eventText = event.message;
      eventTextQueueTimer = setTimeout(() => {
        eventTextQueueTimer = undefined;
        eventText = "";
        runTextEventQueue();
      }, eventTextTimeout);
    }
  }
</script>

<h3>Game {state.gameId}</h3>
<p>Shared counter: {state.count}</p>
<button on:click={handlePlusOne}>Add one!</button>
<div class="event-bar">
  {#if eventText}
    <p in:fly={{ y: 10, duration: 500 }} out:fly={{ y: -10, duration: 500 }}>
      {eventText}
    </p>
  {/if}
</div>
<ol>
  People:
  {#each state.players as player}
    <li>{player.name} - Connected: {player.connected}</li>
  {/each}
</ol>
<button on:click={handleLeave}>Leave</button>

<style>
  .event-bar {
    height: 3em;
  }
</style>
