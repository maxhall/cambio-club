<script>
  // @ts-check
  import { io } from "socket.io-client";
  import { onMount } from "svelte";
  import NewGameForm from "./NewGameForm.svelte";
  import Game from "./Game.svelte";

  /** @type {string} */
  export let gameId;
  /** @type {'starting' | 'error' | 'creatingName' | 'waitingForReady' | 'playing'} */
  let status = "starting";
  /** @type {string} */
  let errorMessage;
  /** @type {string} */
  let name;
  /** @type {string} */
  let nameError;
  /** @type {import('../types').ClientState} */
  let state;
  let hasIndicatedReady = false;

  const socket = io({ autoConnect: false });

  if (process.browser) {
    const sessionId = localStorage.getItem("sessionId");
    socket.auth = { sessionId, gameId };
    socket.connect();
  }

  $: if (state && state.state === "settingUp") hasIndicatedReady = false;

  onMount(() => {
    socket.on(
      "update",
      (/** @type {import('../types').ClientState} */ data) => {
        // There's a chance a client will have two games going in different tabs
        // so we check that the update provided matches the game being played
        if (data.gameId != gameId) return;

        state = data;

        if (data.name && data.state !== "settingUp") {
          status = "playing";
        } else if (data.name) {
          status = "waitingForReady";
        } else {
          status = "creatingName";
        }
      }
    );

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

  function handleReady() {
    hasIndicatedReady = true;
    sendUpdate({
      gameId,
      action: "indicateReady",
    });
  }

  /** @param {import('../types').Update} update*/
  function sendUpdate(update) {
    socket.emit("update", update);
  }
</script>

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
{:else if status === "waitingForReady"}
  <ol>
    {#each state.players as player}
      <li>{player.name} is {player.ready ? "ready" : "not ready"}</li>
    {/each}
  </ol>
  {#if !hasIndicatedReady}
    <button on:click={handleReady}>I'm ready to play</button>
  {/if}
{:else if status === "playing"}
  <Game {state} {socket} />
{/if}
