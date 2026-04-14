const mongoose = require("mongoose");

function isTransactionNotSupportedError(err) {
  const msg = String(err?.message || "");
  return (
    msg.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
    msg.includes("ReplicaSetNoPrimary") ||
    msg.includes("not supported") ||
    msg.includes("does not support retryable writes")
  );
}

async function runWithOptionalTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    try {
      let out;
      await session.withTransaction(async () => {
        out = await fn(session);
      });
      return out;
    } catch (err) {
      if (!isTransactionNotSupportedError(err)) throw err;
      return fn(null);
    }
  } finally {
    session.endSession();
  }
}

module.exports = { runWithOptionalTransaction };

