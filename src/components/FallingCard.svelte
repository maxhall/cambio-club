<script>
	import { tweened } from 'svelte/motion';
	
    // export let suit;
    // export let rank;
	export let initial = {
		x: 0,
		y: -100,
		r: 0.1
	};
	export let final = {
		x: 50,
		y: 400,
		r: 0.6
	};
	export let duration = 10000;
	export let width = 100;
	
	const tween = tweened(initial, {
		duration: duration,
	});
	const randomHue = Math.random() * 360;
	
	$tween = final;
</script>

<rect transform="rotate({$tween.r*360},{$tween.x + width / 2},{$tween.y + width * 1.5 / 2})" x="{$tween.x}" y="{$tween.y}" width="{width}" height="{width*1.5}" rx="10" fill="hsl({randomHue}, 100%, 50%)" />