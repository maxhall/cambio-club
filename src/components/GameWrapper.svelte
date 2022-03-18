<script>
  // @ts-check
  import { io } from "socket.io-client";
  import { onMount } from "svelte";
  import NewGameForm from "./NewGameForm.svelte";
  import Game from "./Game.svelte";
  import LinkShare from "./LinkShare.svelte";
  import Logo from "./Logo.svelte";

  /** @type {string} */
  export let gameId;
  /** @type {'starting' | 'error' | 'creatingName' | 'waitingForReady' | 'playing' | 'exit'} */
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
  /** @type {import('svelte').SvelteComponent}*/
  let gameComponent;

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

        if (data.state == "exit") {
          status = "exit";
          // This is gross, but the component was not being destroyed automatically.
          // Likely related to: https://github.com/sveltejs/svelte/issues/5268
          gameComponent.$destroy();
        } else if (data.name && data.state !== "settingUp") {
          status = "playing";
        } else if (data.name) {
          status = "waitingForReady";
          // Same as above, but necessary at this point for when player's are rematching
          if (gameComponent) gameComponent.$destroy();
        } else {
          status = "creatingName";
        }

        console.log(data);
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

{#if status === "playing"}
  <Game bind:this={gameComponent} {state} {socket} />
{:else}
  <div class="pane">
    <Logo />
    {#if status === "error"}
      <h1>{errorMessage}</h1>
      <NewGameForm />
    {:else if status === "starting"}
      <p>Loading...</p>
    {:else if status === "creatingName"}
      <h1>Game {gameId}</h1>
      <form on:submit|preventDefault={handleNameChoice}>
        <label for="choose-name">Choose a name:</label>
        <div class="input-pair">
          <input
            type="text"
            bind:value={name}
            name="choose-name"
            id="choose-name"
          />
          <button on:click={handleNameChoice}>Submit</button>
        </div>
        {#if nameError}
          <p>{nameError}</p>
        {/if}
      </form>
    {:else if status === "waitingForReady"}
      <h1>Game {gameId}</h1>
      <ol>
        {#each state.players as player}
          <li>{player.name} is {player.ready ? "ready" : "not ready"}</li>
        {/each}
      </ol>
      {#if !hasIndicatedReady}
        <button class="ready-button" on:click={handleReady}>I'm ready to play</button>
      {/if}
      <LinkShare {gameId} />
    {:else if status === "exit"}
      <h1>Game over</h1>
      <p>Another player exited the game</p>
      <NewGameForm />
    {/if}
  </div>
{/if}

<style>
  .ready-button {
    margin-bottom: 2rem;
  }
</style>