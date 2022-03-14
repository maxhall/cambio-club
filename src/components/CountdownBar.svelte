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
  $: statusClass = getStatusClass(countdown);

  /** @param countdown {Countdown | undefined} */
  function getStatusClass(countdown) {
    if (!countdown) return 'inactive';
    
    if (countdown.type === 'viewing') return 'viewing';

    return 'snap';
  }
</script>

<div class="wrapper {statusClass}">
    <div
      class="bar"
      style="width: {$barWidth}%;"
    />
</div>

<style>
  .wrapper {
    width: 100%;
    height: 15px;
    border-style: solid;
    border-width: 2px 2px 0 2px;
    border-radius: 0.25rem 0.25rem 0 0;
    /* box-shadow: inset 0 0 5px black; */
  }
  
  .bar {
    height: 100%;
    border-radius: 0.2rem 0 0 0;
  }
  
  .inactive {
    background-color: var(--game-bg);
    border-color: var(--white);
  }

  .viewing {
    background-color: var(--viewing-blue-light);
    border-color: var(--viewing-blue);
  }

  .viewing div {
    background-color: var(--viewing-blue);
  }

  .snap {
    background-color: var(--snap-orange-light);
    border-color: var(--snap-orange);
  }

  .snap div {
    background-color: var(--snap-orange);
  }
</style>
