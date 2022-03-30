<script>
  import { tweened } from "svelte/motion";
  import { arc } from "d3-shape";
  import { fade } from "svelte/transition";

  /** @typedef {import('../types').Countdown} Countdown */
  /** @type {Countdown | undefined} */
  export let countdown;

  const arcFn = arc();
  const pieDegrees = tweened(360, {
    duration: 0,
  });
  const backgroundArcPath =
    arcFn({
      innerRadius: 0,
      outerRadius: 48,
      startAngle: Math.PI * 2,
      endAngle: 0,
    }) ?? undefined;

  /** @type {string | undefined} */
  let arcPath;
  /** @type {NodeJS.Timeout | undefined}*/
  let textInterval;
  /** @type {number} */
  let textTime;

  $: {
    const elapsedDegrees = countdown
      ? countdown.remainingTime / countdown.totalTime
      : 0;
    // When the props change set the pit to the latest progress point...
    pieDegrees.set(elapsedDegrees, { duration: 0 });
    // ...then immediately set it counting down to zero
    pieDegrees.set(0, { duration: countdown?.remainingTime });
    if (countdown?.remainingTime) {
      setTextTimer(countdown.remainingTime);
    }
  }

  /** @param {number} msRemaining */
  function setTextTimer(msRemaining) {
    if (textInterval) clearInterval(textInterval);
    textTime = Math.ceil(msRemaining / 1000);

    textInterval = setInterval(() => {
      if (textInterval && textTime <= 0) {
        clearInterval(textInterval);
      } else {
        textTime = textTime - 1;
      }
    }, 1000);
  }

  $: arcPath = getArcString($pieDegrees);

  /** @param {number} degrees */
  function getArcString(degrees) {
    const string = arcFn({
      innerRadius: 0,
      outerRadius: 48,
      startAngle: Math.PI * 2 * degrees,
      endAngle: 0,
    });
    return string ?? undefined;
  }
</script>

{#if countdown && textTime > 0}
  <div transition:fade class="timer">
    <div class="arc">
      <svg viewBox="0 0 100 100">
        <g transform="translate(50,50)">
          <path
            d={backgroundArcPath}
            fill={countdown && countdown.type === "viewing"
              ? "hsl(210, 100%, 70%)"
              : "hsl(16, 100%, 70%)"}
          />
          <path
            d={arcPath}
            fill={countdown && countdown.type === "viewing"
              ? "hsl(210, 100%, 50%)"
              : "hsl(16, 100%, 50%)"}
          />
        </g>
      </svg>
    </div>
    <div class="text">
      {#if textInterval}
        <p>{textTime}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .timer {
    width: 4em;
    height: 4em;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    align-items: center;
  }

  .arc,
  .text {
    justify-self: center;
    grid-row: 1 / 2;
    grid-column: 1 / 2;
  }

  .text p {
    color: white;
    font-family: monospace;
    font-size: 2em;
    margin: 0;
    padding: 0;
    line-height: 0;
  }
</style>
