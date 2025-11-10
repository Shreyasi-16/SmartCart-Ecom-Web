// Server/utils/updates.js
const { EventEmitter } = require("events");
const emitter = new EventEmitter();
// avoid memory leak if many listeners
emitter.setMaxListeners(1000);
module.exports = emitter;
