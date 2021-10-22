import { z } from "zod";
import { cardPositionSchema, gameOptionsSchema, updateSchema } from "./schemas";

// https://stackoverflow.com/questions/43159887/make-a-single-property-optional-in-typescript
type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

declare module "socket.io" {
    interface Socket {
        sessionId: string
    }
}

declare global {
    namespace NodeJS {
        interface Process {
            browser: boolean;
        }
    }
}

export type GameOptions = z.infer<typeof gameOptionsSchema>;

export type Update = z.infer<typeof updateSchema>;

export type CardPosition = z.infer<typeof cardPositionSchema>;

/**
 * Deck of cards basics
 */
export type Suit = 'diamonds' | 'hearts' | 'clubs' | 'spades' | null;

export type Rank = number | 'ace' | 'king' | 'queen' | 'jack' | 'joker';

type JokerCardDetails = { suit: null, rank: 'joker' };

type OrdinaryCardDetails = {
    suit: Suit,
    rank: Rank
};

export type Card = (OrdinaryCardDetails | JokerCardDetails) & {
    value: number,
    position: CardPosition,
    facedown: boolean,
    canBeTapped: boolean,
    selected: boolean,
};

export type MaskedCard = Optional<Card, "suit" | "rank" | "value">;

/**
 * Internal states and related
 */
type Actions = Update["action"];

export type State = "settingUp" |
    "dealing" |
    "initialViewing" |
    "snapSuspension" |
    "resolvingSnap" |
    "startingTurn" |
    "awaitingDeckSwapChoice" |
    "finishingDeckSwap" |
    "awaitingPileSwapChoice" |
    "finishingPileSwap" |
    "startingSpecialPower" |
    "awaitingMateLookChoice" |
    "previewingCard" |
    "awaitingMineLookChoice" |
    "awaitingQueenLookChoice" |
    "awaitingQueenSwapOwnChoice" |
    "awaitingQueenSwapOtherChoice" |
    "awaitingBlindSwapOwnChoice" |
    "awaitingBlindSwapOtherChoice" |
    "gameOver" |
    "exit";

export type PermittedUpdates = Record<State, Actions[]>;

export type PlayerData = {
    connected: boolean,
    name: string | null,
    ready: boolean,
    tablePosition: number,
    hasRequestedRematch: boolean,
    hasTakenFinalTurn: boolean
};

/**
 * State object sent to client and related
 */
type FlatPlayerData = PlayerData & { sessionId: string };

type Event = {
    recipientSessionIds?: string[],
    type: 'text',
    message: string,
}

export type Events = Event[];

export type Countdown = {
    subjectPlayer: string | null,
    type: 'viewing' | 'snap',
    remainingTime: number,
    totalTime: number
}

export type ClientState = {
    canBeSnapped: boolean,
    cards: MaskedCard[],
    clientStateId: number,
    countdown?: Countdown,
    currentTurnSessionId: string,
    events: Events,
    gameId: string,
    name: string | null,
    options: GameOptions,
    players: FlatPlayerData[],
    sessionId: string,
    state: State,
};

export type SendStateToSession = (sessionId: string, clientState: ClientState) => void;