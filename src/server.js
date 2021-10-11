// @ts-check
import sirv from "sirv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import compression from "compression";
import * as sapper from "@sapper/server";
import gameManager from "./gameManager";
import { socketConnectionAuth, updateSchema } from "./schemas";

const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === "development";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(
  express.json(),
  compression({ threshold: 0 }),
  sirv("static", { dev }),
  sapper.middleware()
);

gameManager.attachIoServer(io);

io.on("connection", (socket) => {
  const result = socketConnectionAuth.safeParse(socket.handshake.auth);

  if (result.success) {
    const sessionConnection = gameManager.connectSocketToSession(
      result.data.sessionId,
      socket.id
    );

    socket.sessionId = sessionConnection.sessionId;

    if (sessionConnection.idStatus === "created") {
      socket.emit("session", { sessionId: sessionConnection.sessionId });
    }

    gameManager
      .tryJoiningGame(socket.sessionId, result.data.gameId)
      .catch((error) => {
        socket.emit("error", { message: error.message });
      });
  } else {
    socket.emit("error", { message: "Something went wrong. Try refreshing." });
  }

  socket.on("update", (update) => {
    const result = updateSchema.safeParse(update);
    if (result.success == false) {
      console.log(result.error);
    } else {
      gameManager.update(socket.sessionId, result.data);
    }
  });

  socket.on("disconnect", (reason) => {
    gameManager.disconnectSocketFromSession(socket.sessionId, socket.id);
  });
});

httpServer.listen(PORT);
