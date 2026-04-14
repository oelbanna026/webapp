const mongoose = require("mongoose");

let hasConnected = false;
let memoryServer = null;

async function connectToDatabase(mongoUri) {
  if (hasConnected) return;

  const options = {
    autoIndex: process.env.NODE_ENV !== "production",
    serverSelectionTimeoutMS: 1500,
  };

  try {
    await mongoose.connect(mongoUri, options);
  } catch (err) {
    if (process.env.NODE_ENV === "production") throw err;
    const { MongoMemoryServer } = require("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri("stadium_os");
    await mongoose.connect(uri, options);
  }

  hasConnected = true;
}

module.exports = { connectToDatabase };
