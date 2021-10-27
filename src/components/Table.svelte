<script>
  // @ts-check
  import Card from "./Card.svelte";
  import { fade } from "svelte/transition";

  /** @typedef {import('../types').MaskedCard} MaskedCardType */
  /** @type {MaskedCardType[]} */
  export let cards;
  /** @type {string} */
  export let currentTurnSessionId;
  /** @typedef {import('../types').FlatPlayerData} FlatPlayerData */
  /** @type {FlatPlayerData[]} */
  export let players;
  /** @type {import('socket.io-client').Socket} */
  export let socket;
  /** @type {string} */
  export let gameId;
  /** @type {string} */
  export let thisClientSessionId;

  const cardWidth = 25;
  const cardHeight = cardWidth * 1.4;
  const cardGap = 7;
  const margin = 50;
  const playerLabelSize = 12;
  const centreToTablePositionLowerBound = 125;
  // TODO: Do these need to be reactive?
  const currentTurnPlayer = players.find((p) => {
    p.sessionId === currentTurnSessionId;
  });
  const currentTurnPosition = currentTurnPlayer
    ? currentTurnPlayer.tablePosition
    : 0;
  const thisPlayer = players.find((p) => {
    return thisClientSessionId === p.sessionId;
  });
  // This is subtracted from each rotation calculation so the player's browser always
  // shows their cards and info at the bottom
  const localTablePositionOffset = thisPlayer ? thisPlayer.tablePosition : 0;

  /** @type {number | undefined} */
  let clientHeight;
  /** @type {number | undefined} */
  let clientWidth;

  $: verticalSpaceForCards =
    numberOrZero(clientHeight) - 6 * (cardHeight + cardGap) - 2 * margin;
  $: horizontalSpaceForCards =
    numberOrZero(clientWidth) - 6 * (cardHeight + cardGap);
  $: computedCentreToTablePositionOffset =
    verticalSpaceForCards > horizontalSpaceForCards
      ? horizontalSpaceForCards / 2
      : verticalSpaceForCards / 2;
  $: centreToTablePositionOffset =
    computedCentreToTablePositionOffset > centreToTablePositionLowerBound
      ? computedCentreToTablePositionOffset
      : centreToTablePositionLowerBound;
  $: playerLabelOffset = centreToTablePositionOffset - 25;
  $: cardsWithTransforms = addTransformsToCards(
    cards,
    players.length,
    cardWidth,
    cardGap,
    centreToTablePositionOffset
  );

  /**
   * @param {number | undefined} maybeNumber
   */
  function numberOrZero(maybeNumber) {
    if (Number.isNaN(maybeNumber) || maybeNumber === undefined) {
      return 0;
    }
    return maybeNumber;
  }

  /**
   * @param {MaskedCardType[]} cards
   * @param {number} numberOfPlayers
   * @param {number} cardWidth
   * @param {number} cardGap
   * @param {number} centreToTablePositionOffset
   */
  function addTransformsToCards(
    cards,
    numberOfPlayers,
    cardWidth,
    cardGap,
    centreToTablePositionOffset
  ) {
    return cards.map((card) => {
      return {
        ...card,
        transforms: getTransformsFromPositions(
          card.position,
          numberOfPlayers,
          cardWidth,
          cardGap,
          centreToTablePositionOffset
        ),
      };
    });
  }

  /**
   * @param {import('../types').CardPosition} position
   * @param {number} numberOfPlayers
   * @param {number} cardWidth
   * @param {number} cardGap
   * @param {number} centreToTablePositionOffset
   */
  function getTransformsFromPositions(
    position,
    numberOfPlayers,
    cardWidth,
    cardGap,
    centreToTablePositionOffset
  ) {
    let rotation = 0;
    let xLocal = 0;
    let yLocal = 0;
    let xGlobal = 0;
    let yGlobal = 0;

    switch (position.area) {
      case "deck":
        xGlobal = (cardWidth + cardGap) / 2;
        break;

      case "pile":
        xGlobal = (-1 * (cardWidth + cardGap)) / 2;
        break;

      case "table":
        // The 'table' area for each player has 2 rows of 4 cards so initially move the card left
        // so it's in slot 0 and we can move it between slots from there
        xLocal += (cardWidth + cardGap) * -1.5;
        xLocal += (position.tableSlot % 4) * (cardWidth + cardGap);
        yLocal += centreToTablePositionOffset;
        if (position.tableSlot > 3) yLocal += cardHeight + cardGap;
        rotation =
          (1 / numberOfPlayers) * (position.player - localTablePositionOffset);
        const tableRotationRadians = rotation * 360 * (Math.PI / 180);
        // Get the final positions https://academo.org/demos/rotation-about-point/
        xGlobal =
          xLocal * Math.cos(tableRotationRadians) -
          yLocal * Math.sin(tableRotationRadians);
        yGlobal =
          yLocal * Math.cos(tableRotationRadians) +
          xLocal * Math.sin(tableRotationRadians);
        break;

      case "viewing":
        xLocal += -0.5 * (cardWidth + cardGap);
        xLocal += position.viewingSlot * (cardWidth + cardGap);
        yLocal += centreToTablePositionOffset + 2 * (cardHeight + cardGap);
        rotation =
          (1 / numberOfPlayers) * (position.player - localTablePositionOffset);
        const viewingRotationRadians = rotation * 360 * (Math.PI / 180);
        xGlobal =
          xLocal * Math.cos(viewingRotationRadians) -
          yLocal * Math.sin(viewingRotationRadians);
        yGlobal =
          yLocal * Math.cos(viewingRotationRadians) +
          xLocal * Math.sin(viewingRotationRadians);
        break;
    }

    return {
      rotation,
      xTranslation: xGlobal,
      yTranslation: yGlobal,
    };
  }

  /**
   * @param {number} position
   */
  function correctNameOrientation(position) {
    // TODO: Check this is correct
    const positionRotation =
      (1 / players.length) * (position - localTablePositionOffset);
    if (positionRotation > 0.25 && positionRotation < 0.75) return true;
    return false;
  }
</script>

<div class="wrapper" bind:clientHeight bind:clientWidth>
  {#if clientHeight && clientWidth}
    <div class="card-area" transition:fade>
      {#each cardsWithTransforms as card (card.id)}
        <Card
          height={cardHeight}
          width={cardWidth}
          rank={card.rank}
          suit={card.suit}
          transforms={card.transforms}
          selected={card.selected}
          canBeTapped={card.canBeTapped}
          facedown={card.facedown}
          position={card.position}
          {socket}
          {gameId}
        />
      {/each}
      {#each players as player}
        <div
          style="transform: rotate({(1 / players.length) *
            (player.tablePosition -
              localTablePositionOffset)}turn); font-size: {playerLabelSize}px;"
        >
          <div
            style="transform: translateY({playerLabelOffset}px) {correctNameOrientation(
              player.tablePosition
            )
              ? 'rotate(0.5turn)'
              : ''};"
          >
            <p
              class="label"
              class:current-player={player.tablePosition ===
                currentTurnPosition}
            >
              {player.name}
            </p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .wrapper {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .card-area {
    line-height: 0;
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .label {
    font-weight: bold;
    color: white;
  }

  .current-player {
    text-decoration: underline solid red 2px;
  }

  :global(.card-area div) {
    grid-column: 1 / 2;
    grid-row: 1 / 2;
  }
</style>
