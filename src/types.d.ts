import { z } from "zod";
import { gameOptionsSchema, updateSchema } from "./schemas";

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

type FlatPlayerData = {
    connected: boolean;
    name: string | null;
    sessionId: string;
};

type ClientState = {
    clientStateId: number
    gameId: string,
    name: string | null,
    count: number,
    players: FlatPlayerData[],
    options: GameOptions,
    events: Events
};

export type SendStateToSession = (sessionId: string, clientState: ClientState) => void;

export type State = "settingUp" | "exit";

type Event = {
    type: 'text'
    message: string,
}

export type Events = Event[];