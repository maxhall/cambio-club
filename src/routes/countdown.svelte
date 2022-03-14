<script>
  import CountdownBar from "../components/CountdownBar.svelte";
  import CountdownPie from "../components/CountdownPie.svelte";

  /** @typedef {import('../types').Countdown} Countdown */
  /** @type {Countdown | undefined} */
  const c1 = {
    type: "viewing",
    remainingTime: 60000,
    totalTime: 60000,
    subjectPlayer: null,
  };

  /** @type {Countdown | undefined} */
  const c2 = {
    type: "viewing",
    remainingTime: 2500,
    totalTime: 10000,
    subjectPlayer: null,
  };

  /** @type {Countdown | undefined} */
  const c3 = {
    type: "snap",
    remainingTime: 4000,
    totalTime: 5000,
    subjectPlayer: null,
  };

  /** @type {Countdown | undefined} */
  const c4 = undefined;

  /** @type {Countdown | undefined} */
  let countdown = c1;

  /** @param {Countdown | undefined} countdownRef */
  function updateCountdown(countdownRef) {
    countdown = countdownRef;
  }
</script>

<div class="bar-container">
  <CountdownBar {countdown} />
</div>
<CountdownPie {countdown} />

<button on:click={() => updateCountdown(c1)}>60 seconds</button>
<button on:click={() => updateCountdown(c2)}>3 seconds</button>
<button on:click={() => updateCountdown(c3)}>4 seconds orange</button>
<button on:click={() => updateCountdown(c4)}>Remove</button>

<style>
  .bar-container {
    width: 14.5rem;
    margin: 0 auto;
  }
</style>