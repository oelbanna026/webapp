const { createClient } = require("redis");

let client = null;
let connecting = null;

async function getRedisClient() {
  const url = process.env.REDIS_URL || "";
  if (!url) return null;

  if (client) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    const c = createClient({ url });
    c.on("error", () => void 0);
    await c.connect();
    client = c;
    return client;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

module.exports = { getRedisClient };

