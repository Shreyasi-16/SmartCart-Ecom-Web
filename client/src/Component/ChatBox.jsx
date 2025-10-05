import { useEffect, useState, useRef } from "react";
import socketIOClient from "socket.io-client";
import "./ChatBox.css"

const SOCKET_SERVER_URL = "http://localhost:5000"; // your backend socket URL

const ChatBox = ({ chatId, product, sellerId, buyerId, currentUserId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const socketRef = useRef();
  const messagesEndRef = useRef(null);

  // Scroll to bottom on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  //  Initialize Socket.IO connection
  useEffect(() => {
    socketRef.current = socketIOClient(SOCKET_SERVER_URL);

    // Listen for incoming messages for this chatId
    socketRef.current.on("receive_message", (msg) => {
      if (msg.chatId === chatId) {
        setMessages((prev) => [...prev, msg]);
      }
    });
    
    return () => {
      socketRef.current.disconnect();
    };
  }, [chatId]);

  // Fetch previous messages from backend
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${SOCKET_SERVER_URL}/api/messages/chat/${chatId}`);
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();
        setMessages(data); // array of messages
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };
     fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    if (chatId) fetchMessages();
  }, [chatId]);

  useEffect(() => scrollToBottom(), [messages]);

  //  Handle sending message
  const sendMessage = async () => {
    if (!text.trim()) return;

    const newMessage = {
      chatId,
      productId: product._id,
      buyerId,
      sellerId,
      senderId: currentUserId,
      receiverId: currentUserId === buyerId ? sellerId : buyerId,
      message: text.trim(),
    };

    try {
      // Send to backend to save in MongoDB
      const res = await fetch(`${SOCKET_SERVER_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMessage),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const savedMsg = await res.json();

      // Emit via Socket.IO to the other user
      socketRef.current.emit("send_message", savedMsg);

      // Update local messages
      setMessages((prev) => [...prev, savedMsg]);
      setText("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="chatbox-container">
      <div className="chatbox-header">
        <h4>Chat about: {product.title}</h4>
        <button onClick={onClose}>X</button>
      </div>

      <div className="chatbox-messages">
        {messages.map((msg, idx) => (
          <div className={`chat-message ${msg.senderId === currentUserId ? "sent" : "received"}`}>
          <p>{msg.message}</p>
          <span className="time">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>

        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbox-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button onClick={sendMessage}>Send</button>
      </div>

    </div>
  );
};

export default ChatBox;
