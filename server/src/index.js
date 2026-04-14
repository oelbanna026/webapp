require("dotenv").config();

const http = require("http");
const { createServer } = require("./server");
const { attachWebsocketServer } = require("./realtime/wsServer");

async function main() {
  const { app, env } = await createServer();

  const server = http.createServer(app);
  attachWebsocketServer({ server, path: "/ws" });

  server.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("[server] fatal error", err);
  process.exit(1);
});
