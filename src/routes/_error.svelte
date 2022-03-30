<script>
  import Logo from "../components/Logo.svelte";
  import NewGameForm from "../components/NewGameForm.svelte";
  /** @type {number} */
  export let status;
  /** @type {Error} */
  export let error;

  const dev = process.env.NODE_ENV === "development";
</script>

<svelte:head>
  <title>{status}</title>
</svelte:head>

<div class="pane">
  <Logo />
  <h1>{status}</h1>
  <p>{error.message}</p>
  <NewGameForm />
  {#if dev && error.stack}
    <pre>{error.stack}</pre>
  {/if}
</div>
