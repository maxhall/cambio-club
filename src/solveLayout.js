/**
 * Solve layout
 * @param {number} availableHeight
 * @param {number} availableWidth
 * @param {number} numberOfPlayers
 * @param {number} labelMargin
 */
export default function solveLayout(
  availableHeight,
  availableWidth,
  numberOfPlayers,
  labelMargin
) {
  let cardWidth = 1;
  const INCREMENT_AMOUNT = 1;

  /**
   * @param {number} width
   * @param {number} numberOfPlayers
   * @param {number} labelMargin
   **/
  const dimensionsGivenCardWidth = (width, numberOfPlayers, labelMargin) => {
    const cardHeight = width * 1.4;
    const cardGap =
      availableHeight > 1000 || availableWidth > 1000
        ? width * 0.15
        : width * 0.25;
    const side = 4 * width + 3 * cardGap;
    // For 2 players, there's no apothem so cardHeight * 2 gives enough room
    // Otherwise calculate the apothem or inradius of the polygon and add cardHeight / 2
    // to account for card transforms starting half their height above the origin point
    const offsetFromCentre =
      numberOfPlayers === 2
        ? cardHeight * 2 + labelMargin
        : side / (2 * Math.tan(Math.PI / numberOfPlayers)) +
          cardHeight / 2 +
          labelMargin;
    return { cardHeight, cardGap, side, offsetFromCentre };
  };

  /** @param {number} increment */
  const tryIncrementingWidth = (increment) => {
    const newCardWidth = cardWidth + increment;
    const { cardHeight, cardGap, side, offsetFromCentre } =
      dimensionsGivenCardWidth(newCardWidth, numberOfPlayers, labelMargin);

    // Calculate the coordinates of of a rectangle enclosing the table
    // and viewing areas of the player at position 0
    const tableAreaCoords = [
      [-side / 2, -offsetFromCentre],
      [side / 2, -offsetFromCentre],
      [side / 2, -offsetFromCentre - (3 * cardHeight + 2 * cardGap)],
      [-side / 2, -offsetFromCentre - (3 * cardHeight + 2 * cardGap)],
    ];

    // Rotate those numberOfPlayers times, adding each point to the array
    // so we have all candidates for extreme points of the card layout
    /** @type {[number, number][]} */
    const rotatedTableAreaCoords = [];
    for (let i = 0; i < numberOfPlayers; i++) {
      const rotationDecimal = i * (1 / numberOfPlayers);
      const rotationRadians = rotationDecimal * 360 * (Math.PI / 180);
      tableAreaCoords.forEach((coord) => {
        rotatedTableAreaCoords.push([
          coord[0] * Math.cos(rotationRadians) -
            coord[1] * Math.sin(rotationRadians),
          coord[1] * Math.cos(rotationRadians) +
            coord[0] * Math.sin(rotationRadians),
        ]);
      });
    }

    // Find the four extreme points and calculate the occupied height and width
    const minX = Math.min(...rotatedTableAreaCoords.map((c) => c[0]));
    const maxX = Math.max(...rotatedTableAreaCoords.map((c) => c[0]));
    const minY = Math.min(...rotatedTableAreaCoords.map((c) => c[1]));
    const maxY = Math.max(...rotatedTableAreaCoords.map((c) => c[1]));

    const occupiedWidth = maxX - minX;
    const occupiedHeight = maxY - minY;

    if (occupiedHeight < availableHeight && occupiedWidth < availableWidth) {
      cardWidth = newCardWidth;
      tryIncrementingWidth(INCREMENT_AMOUNT);
    }
  };

  tryIncrementingWidth(INCREMENT_AMOUNT);

  return {
    cardWidth,
    ...dimensionsGivenCardWidth(cardWidth, numberOfPlayers, labelMargin),
  };
}
