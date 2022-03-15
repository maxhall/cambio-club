<script>
    /** @type {string} */
    export let gameId;

    const canCopyToClipboard = navigator && navigator.clipboard && navigator.clipboard.writeText;
    const dev = process.env.NODE_ENV === "development";
    
    let buttonText = 'Copy game link'
    function handleClick() {
        // TODO: Update to actual production url
        const gameURL = dev ? `localhost:3000/game/${gameId}` : `https://cambio-club.herokuapp.com/game/${gameId}`;
        navigator.clipboard.writeText(gameURL);
        buttonText = 'Copied!';
        const timer = setTimeout(() => {
            buttonText = 'Copy game link';
        }, 1500);
    }
</script>

{#if canCopyToClipboard}
    <button on:click="{handleClick}">{buttonText}</button>
{/if}

<style>
    button {
        display: block;
        min-width: 7rem;
    }
</style>