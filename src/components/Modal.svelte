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
            <circle class="exit-bg" r="80" cx="50" cy="50" />
            <rect
              class="exit-cross"
              width="10"
              height="100"
              transform="translate(45 0) rotate(45 5 50)"
            />
            <rect
              class="exit-cross"
              width="10"
              height="100"
              transform="translate(45 0) rotate(45 5 50)"
            />
            <rect
              class="exit-cross"
              width="10"
              height="100"
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
    z-index: 1000;
    background-color: rgba(20, 20, 20, 0.8);
  }

  .inner {
    background-color: white;
    margin: 2rem auto;
    padding: 1rem;
    max-width: 20rem;
    min-width: 10rem;
    max-height: calc(100% - 2rem);
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
    width: 1.5rem;
    height: 1.5rem;
    padding: 0 0 0.5rem;
    display: block;
    background: none;
    border: 2px solid black;
  }

  .exit > svg {
    display: block;
  }

  .exit-bg {
    fill: white;
  }

  .exit:hover .exit-bg {
    fill: black;
  }

  .exit:hover .exit-cross {
    fill: white;
  }

  .exit:active,
  .exit:focus {
    border: 2px solid white;
  }
</style>
