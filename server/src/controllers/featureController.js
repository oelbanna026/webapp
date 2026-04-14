function notImplemented(feature) {
  return (_req, res) => {
    res.status(501).json({ error: { message: "Not implemented", feature } });
  };
}

module.exports = { notImplemented };
