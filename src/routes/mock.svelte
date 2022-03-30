<script>
  import Game from "../components/Game.svelte";

  const state = {
    canBeSnapped: true,
    cards: [
      {
        rank: "jack",
        suit: "clubs",
        value: 10,
        id: 36,
        position: {
          player: 0,
          area: "table",
          tableSlot: 1,
        },
        facedown: true,
        canBeTapped: false,
        selected: false,
      },
      {
        rank: 7,
        suit: "spades",
        value: 7,
        id: 45,
        position: {
          player: 0,
          area: "table",
          tableSlot: 2,
        },
        facedown: false,
        canBeTapped: false,
        selected: false,
      },
      {
        rank: 5,
        suit: "clubs",
        value: 5,
        id: 30,
        position: {
          player: 0,
          area: "table",
          tableSlot: 5,
        },
        facedown: false,
        canBeTapped: false,
        selected: false,
      },
      {
        rank: "ace",
        suit: "clubs",
        value: 1,
        id: 26,
        position: {
          player: 0,
          area: "table",
          tableSlot: 6,
        },
        facedown: true,
        canBeTapped: false,
        selected: false,
      },
      {
        rank: 2,
        suit: "diamonds",
        value: 2,
        id: 14,
        position: {
          player: 1,
          area: "table",
          tableSlot: 1,
        },
        facedown: false,
        canBeTapped: false,
        selected: false,
      },
      {
        rank: 8,
        suit: "diamonds",
        value: 8,
        id: 20,
        position: {
          player: 1,
          area: "table",
          tableSlot: 2,
        },
        facedown: false,
        canBeTapped: false,
        selected: false,
      },
      {
        rank: 6,
        suit: "diamonds",
        value: 6,
        id: 18,
        position: {
          player: 1,
          area: "table",
          tableSlot: 5,
        },
        facedown: false,
        canBeTapped: false,
        selected: false,
      },
      {
        rank: 8,
        suit: "hearts",
        value: 8,
        id: 7,
        position: {
          player: 1,
          area: "table",
          tableSlot: 6,
        },
        facedown: false,
        canBeTapped: false,
        selected: true,
      },
      {
        rank: 9,
        suit: "spades",
        value: 9,
        id: 47,
        position: {
          area: "deck",
        },
        facedown: false,
        canBeTapped: true,
        selected: false,
      },
      {
        rank: "queen",
        suit: "diamonds",
        value: 10,
        id: 24,
        position: {
          area: "pile",
        },
        facedown: false,
        canBeTapped: true,
        selected: false,
      },
    ],
    clientStateId: 10,
    currentTurnSessionId: "b89aff88fa3a33f3",
    events: [
      {
        type: "text",
        message: "Initial viewing over!",
      },
      {
        type: "text",
        message: "MMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      {
        type: "text",
        message: "Hi there",
      },
      {
        type: "text",
        message: "LOL",
      },
      {
        type: "text",
        message: "Your turn",
        recipientSessionIds: ["b89aff88fa3a33f3"],
      },
    ],
    gameId: "2152",
    name: "ASD",
    options: {
      canSnapOtherPlayers: true,
      openHands: true,
      riskyFives: false,
    },
    players: [
      {
        sessionId: "76fb15917934b9df",
        name: "😈😈😈",
        connected: true,
        ready: true,
        tablePosition: 0,
      },
      {
        sessionId: "b89aff88fa3a33f3",
        name: "GoughWhitlam69",
        connected: true,
        ready: true,
        tablePosition: 1,
      },
    ],
    sessionId: "b89aff88fa3a33f3",
    state: "startingTurn",
  };
</script>

<Game {state} />
