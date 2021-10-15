<script>
  import Table from "./Table.svelte";
  import { fly } from "svelte/transition";
  /** @type {import('@sapper/app').goto } */
  import { goto } from "@sapper/app";
  /** @type {import('../types').ClientState} */
  export let state;
  /** @type {import('socket.io-client').Socket} */
  export let socket;
  /** @type {import('../types').Events} */
  let textEvents = [];
  let graphicEvents = [];
  let eventText = "";
  /** @type {NodeJS.Timeout | undefined} */
  let eventTextQueueTimer;

  const eventTextTimeout = 3000;
  const isMyTurn = state.sessionId === state.currentTurnSessionId;

  $: console.log(state);
  // TODO: If events get funky, find a non-reactive approach to this
  $: if (state.events.length > 0) processEvents(state.events);

  function handleLeave() {
    console.log("Leaving");
    sendUpdate({
      gameId: state.gameId,
      action: "leave",
    });
    socket.disconnect();
    goto("/");
  }

  function handleCambio() {
    sendUpdate({
      gameId: state.gameId,
      action: "cambio",
    });
  }

  function handlePass() {
    sendUpdate({
      gameId: state.gameId,
      action: "pass",
    });
  }

  function handleSnap() {
    sendUpdate({
      gameId: state.gameId,
      action: "snap",
    });
  }

  /** @param {KeyboardEvent} event */
  function handleKeydown(event) {
    if (event.key === "s") handleSnap();
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

<svelte:window on:keydown={(event) => handleKeydown(event)} />

<div style="height: 100%;">
  <header>
    <p>Game {state.gameId}</p>
    <button on:click={handleLeave}>Leave</button>
  </header>
  <Table
    cards={state.cards}
    currentTurnSessionId={state.currentTurnSessionId}
    players={state.players}
    {socket}
    gameId={state.gameId}
  />
  <section class="bottom-bar">
    {#if isMyTurn && state.state === "startingTurn"}
      <button on:click={handleCambio}>Cambio</button>
    {/if}
    {#if state.canBeSnapped}
      <button on:click={handleSnap}>Snap</button>
    {/if}
    {#if isMyTurn && state.state === "startingTurn"}
      <button on:click={handlePass}>Pass</button>
    {/if}
    {#if eventText}
      <p in:fly={{ y: 10, duration: 500 }} out:fly={{ y: -100, duration: 500 }}>
        {eventText}
      </p>
    {/if}
  </section>
</div>

<style>
  :global(html) {
    height: 100vh;
  }

  :global(body) {
    margin: 0;
    box-sizing: border-box;
    background-color: darkgreen;
  }

  header {
    position: fixed;
    top: 0;
    padding: 0.25em;
    display: flex;
  }

  .bottom-bar {
    width: 100%;
    height: 50px;
    display: flex;
    justify-content: center;
    background-color: white;
    position: fixed;
    bottom: 0;
  }
</style>
