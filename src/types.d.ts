import { z } from "zod";
import { cardPositionSchema, gameOptionsSchema, updateSchema } from "./schemas";

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
export type Suit = 'diamonds' | 'hearts' | 'clubs' | 'spades';

export type Rank = number | 'ace' | 'king' | 'queen' | 'jack' | 'joker';

type JokerCardDetails = { suit: null, rank: 'joker' };

type OrdinaryCardDetails = {
    suit: Suit,
    rank: Rank
};

type FacedownCardDetails = {
    suit: null,
    rank: null
};

export type Card = (OrdinaryCardDetails | JokerCardDetails | FacedownCardDetails) & {
    position: CardPosition,
    canBeTapped: boolean,
    selected: boolean,
};

/**
 * Internal states and related
 */
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

export type PlayerData = {
    connected: boolean,
    name: string | null,
    ready: boolean
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

export type ClientState = {
    clientStateId: number
    gameId: string,
    state: State,
    name: string | null,
    count: number,
    players: FlatPlayerData[],
    options: GameOptions,
    events: Events,
    countdown?: {
        subjectPlayer: string,
        type: 'viewing' | 'snap',
        remainingTime: number,
        totalTime: number
    },
    // TODO: Should I make this required
    removeExistingTimers?: boolean
};

export type SendStateToSession = (sessionId: string, clientState: ClientState) => void;