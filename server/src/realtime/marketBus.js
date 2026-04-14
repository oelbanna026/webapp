const { EventEmitter } = require("events");

const marketBus = new EventEmitter();

module.exports = { marketBus };

