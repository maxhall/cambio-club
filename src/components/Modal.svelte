<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  function clickOutside(node) {
    const handleClick = (event) => {
      if (!node.contains(event.target)) {
        node.dispatchEvent(new CustomEvent("outclick"));
      }
    };

    document.addEventListener("click", handleClick, true);

    return {
      destroy() {
        document.removeEventListener("click", handleClick, true);
      },
    };
  }
</script>

<div class="modal">
  <div class="inner" use:clickOutside on:outclick={() => dispatch("close")}>
    <div class="button-bar">
      <button class="exit" on:click={() => dispatch("close")}>
        <svg viewBox="0 0 100 100">
          <rect
            class="exit-cross"
            width="10"
            height="100"
            rx="5"
            transform="translate(45 0) rotate(45 5 50)"
            />
            <rect
            class="exit-cross"
            width="10"
            height="100"
            rx="5"
            transform="translate(45 0) rotate(-45 5 50)"
          />
        </svg>
      </button>
    </div>
    <div class="content">
      <slot />
    </div>
  </div>
</div>

<style>
  .modal {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: var(--z-modal);
    background-color: rgba(20, 20, 20, 0.8);
  }

  .inner {
    background-color: white;
    margin: 2rem auto;
    padding: 1rem;
    max-width: 20rem;
    min-width: 10rem;
    max-height: calc(100% - 2rem);
    border-radius: 0.25rem;
  }

  .content {
    overflow-y: scroll;
    max-height: 70vh;
  }

  .button-bar {
    display: flex;
    flex-direction: row;
    justify-content: end;
  }

  .exit {
    width: 1rem;
    height: 1rem;
    padding: 0 0 0.5rem;
    display: block;
    margin-bottom: 0.25rem;
  }

  svg {
    fill: var(--game-bg);
  }

  @media (max-width:500px) {
    .inner {
      margin: 1rem;
    }
  }
</style>
