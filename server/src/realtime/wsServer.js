const jwt = require("jsonwebtoken");
const { WebSocketServer } = require("ws");
const { getEnv } = require("../config/env");
const { marketBus } = require("./marketBus");
const { attachMatchEngine } = require("./matchEngine");

function safeSend(ws, message) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(message));
}

function parseTokenFromRequest(req) {
  try {
    const url = new URL(req.url, "http://localhost");
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}

function verifyToken(token) {
  const env = getEnv();
  const payload = jwt.verify(token, env.jwtSecret);
  return { userId: payload.sub };
}

function attachWebsocketServer({ server, path = "/ws" }) {
  const wss = new WebSocketServer({ server, path });
  const clients = new Set();
  const socketsByUserId = new Map();

  const matchEngine = attachMatchEngine({
    tickMs: 1000,
    sendToUsers(userIds, message) {
      for (const userId of userIds || []) {
        const set = socketsByUserId.get(String(userId));
        if (!set) continue;
        for (const ws of set) safeSend(ws, message);
      }
    },
  });

  function handleUpsert(listing) {
    const msg = { type: "market.upsert", listing };
    for (const ws of clients) safeSend(ws, msg);
  }

  marketBus.on("market.upsert", handleUpsert);

  wss.on("connection", (ws, req) => {
    const token = parseTokenFromRequest(req);
    if (!token) {
      ws.close(1008, "Missing token");
      return;
    }

    try {
      const auth = verifyToken(token);
      ws.userId = auth.userId;
    } catch {
      ws.close(1008, "Invalid token");
      return;
    }

    clients.add(ws);
    const set = socketsByUserId.get(String(ws.userId)) || new Set();
    set.add(ws);
    socketsByUserId.set(String(ws.userId), set);
    safeSend(ws, { type: "hello", userId: ws.userId });

    ws.on("message", async (raw) => {
      let msg = null;
      try {
        msg = JSON.parse(String(raw || ""));
      } catch {
        return;
      }

      const type = String(msg?.type || "");
      if (type === "match.queue") {
        try {
          await matchEngine.queueUser({ userId: ws.userId, ws });
          safeSend(ws, { type: "match.queued" });
        } catch (err) {
          safeSend(ws, { type: "match.error", message: err?.message || "Failed to queue" });
        }
        return;
      }

      if (type === "match.tactics") {
        matchEngine.setTactics({ userId: ws.userId, tactics: msg?.tactics || {} });
        return;
      }

      if (type === "match.substitute") {
        matchEngine.substitute({ userId: ws.userId, outPlayerId: msg?.outPlayerId, inPlayerId: msg?.inPlayerId });
        return;
      }

      if (type === "match.leave") {
        matchEngine.leave({ userId: ws.userId });
        safeSend(ws, { type: "match.left" });
        return;
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      const u = String(ws.userId);
      const s = socketsByUserId.get(u);
      if (s) {
        s.delete(ws);
        if (s.size === 0) socketsByUserId.delete(u);
      }
      matchEngine.leave({ userId: ws.userId });
    });

    ws.on("error", () => {
      clients.delete(ws);
      const u = String(ws.userId);
      const s = socketsByUserId.get(u);
      if (s) {
        s.delete(ws);
        if (s.size === 0) socketsByUserId.delete(u);
      }
      matchEngine.leave({ userId: ws.userId });
    });
  });

  return {
    wss,
    close() {
      marketBus.off("market.upsert", handleUpsert);
      matchEngine.close();
      wss.close();
    },
  };
}

module.exports = { attachWebsocketServer };
