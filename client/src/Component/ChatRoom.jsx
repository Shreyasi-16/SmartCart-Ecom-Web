import { useEffect, useState, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./ChatRoom.css";

const API_URL = "http://localhost:5000/api/messages";

const ChatRoom = ({ chatId, chat, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [firebaseUid, setFirebaseUid] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) setFirebaseUid(user.uid);
    });
  }, []);

  useEffect(() => {
    if (!firebaseUid || !chatId) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/chat/${chatId}`);
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();
        setMessages(data);
        scrollToBottom();
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [firebaseUid, chatId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const res = await fetch(`${API_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          senderId: firebaseUid,
          receiverId:
            chat.sellerId === firebaseUid ? chat.buyerId : chat.sellerId,
          productId: chat.product._id,
          buyerId: chat.buyerId,
          sellerId: chat.sellerId,
          message: newMessage,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const savedMessage = await res.json();
      setMessages((prev) => [...prev, savedMessage]);
      setNewMessage("");
      scrollToBottom();
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="chat-room-popup">
      <div className="chat-room-header">
        <span>{chat?.product?.title || "Chat"}</span>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="chat-room-messages">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`chat-message ${
              msg.senderId === firebaseUid ? "sent" : "received"
            }`}
          >
            <span>{msg.message}</span>
            <div className="message-time">{formatTime(msg.createdAt)}</div>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      <div className="chat-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatRoom;
