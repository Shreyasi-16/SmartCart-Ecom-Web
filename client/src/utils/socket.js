// src/utils/socket.js
import { io } from "socket.io-client";

// Use your backend server URL
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

// Create socket instance
const socket = io(SOCKET_URL, {
  transports: ["websocket"], // ensures WebSocket connection
  reconnection: true,        // auto reconnect on disconnect
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
