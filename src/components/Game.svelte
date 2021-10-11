<script>
  // @ts-check
  import { io } from "socket.io-client";
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  /** @type {import('@sapper/app').goto } */
  import { goto } from "@sapper/app";
  import NewGameForm from "./NewGameForm.svelte";

  /** @type {string} */
  export let gameId;
  /** @type {'starting' | 'error' | 'creatingName' | 'playing'} */
  let status = "starting";
  let count = 0;
  /** @typedef {import('../types').FlatPlayerData} Player */
  /** @type {Player[]} */
  let players = [];
  /** @type {string} */
  let errorMessage;
  /** @type {string} */
  let name;
  /** @type {string} */
  let nameError;
  /** @type {import('../types').Events} */
  let textEvents = [];
  let graphicEvents = [];
  let eventText = "";
  /** @type {NodeJS.Timeout | undefined} */
  let eventTextQueueTimer;

  const eventTextTimeout = 3000;
  const socket = io({ autoConnect: false });

  if (process.browser) {
    const sessionId = localStorage.getItem("sessionId");
    socket.auth = { sessionId, gameId };
    socket.connect();
  }

  onMount(() => {
    socket.on("update", (data) => {
      console.log(data);
      // There's a chance a client will have two games going in different tabs
      // so we check that the update provided matches the game being played
      if (data.gameId != gameId) return;
      if (data.name) {
        status = "playing";
      } else {
        status = "creatingName";
      }
      count = data.count;
      players = data.players;
      if (data.events.length > 0) processEvents(data.events);
    });

    socket.on("error", (data) => {
      console.log(data);
      status = "error";
      errorMessage = data.message;
    });

    socket.on("session", (data) => {
      console.log(data);
      socket.auth = { sessionId: data.sessionId };
      localStorage.setItem("sessionId", data.sessionId);
    });

    socket.on("connection_error", (error) => {
      status = "error";
      errorMessage = "Try refreshing";
      console.log(error);
    });
  });

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

  // TODO: Remove function
  function handlePlusOne() {
    sendUpdate({
      gameId: gameId,
      action: "plusOne",
    });
  }

  function handleNameChoice() {
    nameError = "";
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 15) {
      nameError = "Your name must be between 1 and 15 characters";
    } else {
      sendUpdate({
        gameId: gameId,
        action: "setName",
        name: trimmedName,
      });
    }
  }

  function handleLeave() {
    sendUpdate({
      gameId: gameId,
      action: "leave",
    });
    socket.disconnect();
    goto("/");
  }

  /** @param {import('../types').Update} update*/
  function sendUpdate(update) {
    socket.emit("update", update);
  }
</script>

<p>Session id: {gameId}</p>

{#if status === "error"}
  <h1>Error</h1>
  <p>{errorMessage}</p>
  <NewGameForm />
{:else if status === "starting"}
  <p>Loading...</p>
{:else if status === "creatingName"}
  <form on:submit|preventDefault={handleNameChoice}>
    <label for="choose-name"
      >Choose a name:<input
        type="text"
        bind:value={name}
        name="choose-name"
        id="choose-name"
      /></label
    >
    <button on:click={handleNameChoice}>Submit</button>
    {#if nameError}
      <p>{nameError}</p>
    {/if}
  </form>
{:else if status === "playing"}
  <h3>In session</h3>
  <p>Shared counter: {count}</p>
  <div class="event-bar">
    {#if eventText}
      <p in:fly={{ y: 10, duration: 500 }} out:fly={{ y: -10, duration: 500 }}>
        {eventText}
      </p>
    {/if}
  </div>
  <button on:click={handlePlusOne}>Add one!</button>
  <ol>
    People:
    {#each players as player}
      <li>{player.name} - Connected: {player.connected}</li>
    {/each}
  </ol>
  <button on:click={handleLeave}>Leave</button>
{/if}

<style>
  .event-bar {
    height: 3em;
  }
</style>
