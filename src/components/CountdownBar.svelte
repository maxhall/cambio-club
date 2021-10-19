<script>
  import { tweened } from "svelte/motion";
  /** @typedef {import('../types').Countdown} Countdown */
  /** @type {Countdown | undefined} */
  export let countdown;

  const barWidth = tweened(100, {
    duration: 0,
  });

  $: {
    const barPct = (countdown) ? (countdown.remainingTime / countdown.totalTime) * 100 : 0;
    // Take it to the updated point
    barWidth.set(barPct, { duration: 0 });
    // Then immediately set it counting down to zero
    barWidth.set(0, { duration: countdown?.remainingTime });
  }
</script>

<div class="wrapper">
    <div
      class="bar"
      style="width: {$barWidth}%; background-color: {countdown &&  countdown.type ===
      'viewing'
        ? 'hsl(210, 100%, 50%)'
        : 'hsl(16, 100%, 50%)'}"
    />
</div>

<style>
  .wrapper {
    width: 100%;
    height: 20px;
  }

  .bar {
    height: 100%;
  }
</style>
