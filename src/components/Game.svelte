<script>
  import Table from "./Table.svelte";
  import { fly } from "svelte/transition";
  import CountdownBar from "./CountdownBar.svelte";
  import Modal from "./Modal.svelte";
  import Rules from "./Rules.svelte";
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
  let hasRequestedRematch = false;
  let showRulesModal = false;
  let showLeaveModal = false;

  const eventTextTimeout = 3000;
  const statesAllowingEndTurn = [
    "awaitingMateLookChoice",
    "awaitingMineLookChoice",
    "awaitingQueenLookChoice",
    "awaitingQueenSwapOwnChoice",
  ];

  $: isMyTurn = state.sessionId === state.currentTurnSessionId;
  $: console.log(state);
  // If events get funky, find a non-reactive approach to this
  $: if (state.events.length > 0) processEvents(state.events);
  $: if (state.state === "settingUp") hasRequestedRematch = false;

  async function handleLeave() {
    console.log("Leaving");
    sendUpdate({
      gameId: state.gameId,
      action: "leave",
    });
    socket.disconnect();
    window.location.assign("/");
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

  function handleRematch() {
    hasRequestedRematch = true;
    sendUpdate({
      gameId: state.gameId,
      action: "requestRematch",
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
    <button on:click={() => (showLeaveModal = true)}>Leave</button>
    <p class="game-id">Cambio game {state.gameId}</p>
    <button on:click={() => (showRulesModal = true)}>Rules</button>
  </header>
  <Table
    cards={state.cards}
    currentTurnSessionId={state.currentTurnSessionId}
    thisClientSessionId={state.sessionId}
    players={state.players}
    {socket}
    gameId={state.gameId}
  />
  <footer>
    {#if eventText}
      <p
        class="event-text"
        in:fly={{ y: 10, duration: 500 }}
        out:fly={{ y: 10, duration: 1000 }}
      >
        {eventText}
      </p>
    {/if}
    <CountdownBar countdown={state.countdown} />
    <section class="button-wrapper">
      {#if isMyTurn && state.state === "startingTurn"}
        <button on:click={handleCambio}>Cambio</button>
      {/if}
      {#if state.canBeSnapped}
        <button on:click={handleSnap}>Snap</button>
      {/if}
      {#if isMyTurn && state.state === "startingTurn"}
        <button on:click={handlePass}>Pass</button>
      {/if}
      {#if isMyTurn && statesAllowingEndTurn.includes(state.state)}
        <button on:click={handlePass}>End turn</button>
      {/if}
      {#if state.state === "gameOver" && !hasRequestedRematch}
        <button on:click={handleRematch}>Play again</button>
      {/if}
    </section>
  </footer>
</div>

{#if showRulesModal}
  <Modal on:close={() => (showRulesModal = false)}><Rules /></Modal>
{/if}

{#if showLeaveModal}
  <Modal on:close={() => (showLeaveModal = false)}>
    <h2>Are you sure you want to leave?</h2>
    <p>This will end the game for everyone</p>
    <button on:click={handleLeave}>Leave</button>
  </Modal>
{/if}

<style>
  header {
    position: fixed;
    top: 0;
    padding: 0.25em;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    z-index: 100;
  }

  footer {
    position: fixed;
    bottom: 0;
    width: 100%;
  }

  .event-text {
    font-size: 35px;
    text-align: center;
    text-transform: uppercase;
    line-height: 40px;
    margin: 0 auto;
  }

  .button-wrapper {
    height: 50px;
    display: flex;
    justify-content: center;
  }
</style>
