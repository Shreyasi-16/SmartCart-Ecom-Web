// src/api/chatApi.js
import axios from "axios";

const API_BASE =  "http://localhost:5000/api/messages";

// ✅ Fetch all messages for a chat (between buyer & seller, or by chatId)
export const getMessages = async (chatId) => {
  try {
    const res = await axios.get(`${API_BASE}/chat/${chatId}`);
    return res.data;
  } catch (err) {
    console.error("Error fetching messages:", err);
    throw err;
  }
};

// ✅ Send a new message
export const sendMessage = async (messageData) => {
  try {
    const res = await axios.post(API_BASE, messageData);
    return res.data;
  } catch (err) {
    console.error("Error sending message:", err);
    throw err;
  }
};
