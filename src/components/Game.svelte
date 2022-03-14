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

  const actionButtonTransitionParameters = {
    y: 50,
    duration: 250,
  };

  $: isMyTurn = state.sessionId === state.currentTurnSessionId;
  // If events get funky, find a non-reactive approach to this
  $: if (state.events.length > 0) processEvents(state.events);
  $: if (state.state === "settingUp") hasRequestedRematch = false;
  $: showEndTurnButton = isEndTurnButtonVisible(state);
  $: showCountdownBar = isCountingDown(state);

  /** @param state {import('../types').ClientState} */
  function isEndTurnButtonVisible(state) {
    if (statesAllowingEndTurn.includes(state.state)) return true;

    const isTwoPlayerSpecialCase =
      state.players.length === 2 &&
      (state.state === "awaitingBlindSwapOtherChoice" ||
        state.state === "awaitingQueenSwapOtherChoice");
    const opponentTablePosition = state.players.find(
      (p) => p.sessionId !== state.sessionId
    )?.tablePosition;
    const opponentHasCards = state.cards.some(
      (c) =>
        c.position.area === "table" &&
        c.position.player === opponentTablePosition
    );

    if (isTwoPlayerSpecialCase && !opponentHasCards) return true;

    return false;
  }
  
  /** @param state {import('../types').ClientState} */
  function isCountingDown(state) {
    return (state.countdown) ? true : false;
  };

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
    <button class="lowkey-button" on:click={() => (showRulesModal = true)}>Rules</button>
    <p class="game-id">Game {state.gameId}</p>
    <button class="lowkey-button" on:click={() => (showLeaveModal = true)}
      >Leave</button
    >
  </header>
  <Table
    cards={state.cards}
    currentTurnSessionId={state.currentTurnSessionId}
    thisClientSessionId={state.sessionId}
    players={state.players}
    {socket}
    gameId={state.gameId}
  />
  <div class="event-text-wrapper">
    {#if eventText}
      <p
        class="event-text"
        in:fly={{ y: 10, duration: 100 }}
        out:fly={{ y: -20, duration: 1500 }}
      >
        {eventText}
      </p>
    {/if}
  </div>
  <footer class:counting-down={showCountdownBar}>
    <section class="controls">
      <div class="actions">
        <div class="slot-1">
          {#if isMyTurn && state.state === "startingTurn"}
            <button
              transition:fly={actionButtonTransitionParameters}
              class="actions-button"
              on:click={handleCambio}>Cambio</button
            >
          {/if}
        </div>
        <div class="slot-2">
          {#if state.canBeSnapped}
            <button
              transition:fly={actionButtonTransitionParameters}
              class="actions-button"
              on:click={handleSnap}>Snap</button
            >
          {/if}
          {#if state.state === "gameOver" && !hasRequestedRematch}
            <button
              transition:fly={actionButtonTransitionParameters}
              class="actions-button"
              on:click={handleRematch}>Play again</button
            >
          {/if}
        </div>
        <div class="slot-3">
          {#if isMyTurn && state.state === "startingTurn"}
            <button
              transition:fly={actionButtonTransitionParameters}
              class="actions-button"
              on:click={handlePass}>Pass</button
            >
          {/if}
          {#if isMyTurn && showEndTurnButton}
            <button
              transition:fly={actionButtonTransitionParameters}
              class="actions-button"
              on:click={handlePass}>End turn</button
            >
          {/if}
        </div>
      </div>
      <CountdownBar countdown={state.countdown} />
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
    width: 100%;
    position: fixed;
    top: 0;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    z-index: 100;
  }

  .game-id {
    font-weight: 800;
    color: white;
    margin: 0.5em 0 0;
    font-size: 20px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  footer {
    position: fixed;
    bottom: 0;
    width: 100%;
    transform: translateY(15px);
    transition: transform 0.2s ease-in-out;
  }

  .counting-down {
    transform: translateY(0px);
  }

  .event-text-wrapper {
    position: fixed;
    bottom: 70px;
    width: 100%;
  }

  .event-text {
    font-size: 18px;
    text-align: center;
    line-height: 1.3;
    background-color: white;
    color: orange;
    margin: 0 auto;
  }

  .controls {
    max-width: 14.5rem;
    margin: 0 auto;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    margin: 0 0.5rem 0;
  }

  .actions-button {
    margin: 0.125rem 0.125rem 0 0.125rem;
    height: calc(100% - 0.125rem);
    width: calc(100% - 0.25rem);
    font-family: Rubik, sans-serif;
    font-size: 18px;
    letter-spacing: 1px;
    font-weight: 800;
    border-width: 2px 2px 0px 2px;
    border-color: white;
    color: white;
    background-color: rgb(62, 91, 116);
    border-radius: 0.25rem 0.25rem 0 0;
  }

  .lowkey-button {
    color: white;
    background: none;
    border: none;
    padding: 0.5em 0 0;
    margin: 0 0.5em;
    line-height: 1;
    border-bottom: 4px solid white;
  }
</style>
