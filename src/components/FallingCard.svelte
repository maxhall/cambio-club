<script>
  import { tweened } from "svelte/motion";
  import CardPath from "./CardPath.svelte";

  export let stroked = false;
  export let suit;
  export let rank;
  export let initial = {
    x: 0,
    y: -100,
    r: 0.1,
  };
  export let final = {
    x: 50,
    y: 400,
    r: 0.6,
  };
  export let duration = 10000;
  export let width = 100;

  const tween = tweened(initial, {
    duration: duration,
  });
  const randomHue = Math.random() * 360;

  $tween = final;

  let cardPathFill = suit === "hearts" || suit === "diamonds" ? "red" : "black";
  $: if (stroked) {
    cardPathFill = "none";
  }
</script>

<!-- rx="10" fill="hsl({randomHue}, 100%, 50%)" -->
<g
  transform="rotate({$tween.r * 360},{$tween.x + width / 2},{$tween.y +
    (width * 1.4) / 2}) translate({$tween.x} {$tween.y})"
>
  <rect
    width="100"
    height="140"
    rx="5"
    fill="white"
    stroke={suit === "hearts" || suit === "diamonds" ? "red" : "black"}
    stroke-width={stroked ? 1.5 : 0}
  />
  <g
    transform="scale(0.2)"
    fill={cardPathFill}
    stroke={suit === "hearts" || suit === "diamonds" ? "red" : "black"}
    stroke-width={stroked ? 7.5 : 0}
  >
    <CardPath {rank} {suit} />
  </g>
</g>
