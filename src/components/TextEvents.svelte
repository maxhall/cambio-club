<script>
  /** @type {import('../types').Events} */
  export let events;

  const TIME_EVENT_IS_VISIBLE = 3500;
  const TIME_BETWEEN_EVENTS = 1500;

  /** @type {import('../types').Events} */
  let queue = [];
  /** @type {import('../types').Events} */
  let visibleEvents = [];
  /** @type {NodeJS.Timeout | undefined} */
  let queueTimer;
  let id = 0;

  $: if (events.length > 0) processEvents(events);

  /** @param {import('../types').Events} newEvents */
  function processEvents(newEvents) {
    newEvents.forEach((event) => {
      if (event.type === "text") queue.push(event);
    });

    runQueue();
  }

  function runQueue() {
    if (queueTimer) {
      return;
    }
    const event = queue.shift();
    if (event) {
      const currentEventId = id++;
      event.id = currentEventId;
      visibleEvents = [...visibleEvents, event];
      const eventTimer = setTimeout(() => {
        visibleEvents = visibleEvents.filter((e) => e.id !== currentEventId);
      }, TIME_EVENT_IS_VISIBLE);

      queueTimer = setTimeout(() => {
        queueTimer = undefined;
        runQueue();
      }, TIME_BETWEEN_EVENTS);
    }
  }
</script>

{#each visibleEvents as event (event.id)}
  <div class="event-text-wrapper">
    <p class="event-text">
      {event.message}
    </p>
  </div>
{/each}

<style>
  .event-text-wrapper {
    position: fixed;
    bottom: 50px;
    width: 100%;
    z-index: var(--z-text-events);
  }

  .event-text {
    font-size: 18px;
    line-height: 1.3;
    background-color: var(--white);
    border: 2px solid var(--game-bg);
    border-radius: 0.25rem;
    color: var(--game-bg);
    max-width: var(--controls-width);
    margin: 0.25rem auto;
    padding: 0.1rem 0.25rem;
    animation: 5s linear 0s infinite alternate rising_text;
  }

  @keyframes rising_text {
    from {
      transform: translateY(0px);
    }
    to {
      transform: translateY(-200px);
    }
  }
</style>
