import { useState, useEffect, useRef } from "react";
import "./ChatBox.css";

const ChatBox = ({ chatId, product, sellerId, buyerId, currentUserId, onClose, initialMessages = [] }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Fetch messages on load
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/chats/${chatId}/messages`);
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Fetch messages error:", err);
      }
    };
    fetchMessages();
  }, [chatId]);

  const handleSend = async () => {
    if (!text.trim() && !file) return;

    const formData = new FormData();
    formData.append("senderId", currentUserId);
    if (text) formData.append("text", text);
    if (file) formData.append("file", file);

    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/chats/${chatId}/message`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to send message");

      const newMsg = await res.json();
      setMessages((prev) => [...prev, newMsg]);
      setText("");
      setFile(null);
    } catch (err) {
      console.error("Send message error:", err);
      alert("Failed to send message. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbox-overlay">
      <div className="chatbox">
        {/* Header */}
        <div className="chatbox-header">
          <h3>Chat ({product?.title})</h3>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>

        {/* Messages */}
        <div className="chatbox-messages">
          {messages.length === 0 && (
            <p className="empty-chat">No messages yet. Start chatting!</p>
          )}

          {messages.map((msg, index) => {
            const isMe = msg.sender === currentUserId;
            const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg._id || index}
                className={`message ${isMe ? "sent" : "received"}`}
              >
                {msg.text && <p>{msg.text}</p>}

                {msg.fileUrl && (
                  msg.fileType?.startsWith("image/") ? (
                    <img src={msg.fileUrl} alt="upload" className="chat-img" />
                  ) : (
                    <a href={msg.fileUrl} download className="chat-file">
                      📎 {msg.fileName || "File"}
                    </a>
                  )
                )}

                <span className="msg-time">{formattedTime}</span>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chatbox-input">
          <input
            type="text"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <label className="file-label">
          📎
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ display: "none" }}
          />
          </label>
          <button onClick={handleSend} disabled={loading}>
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
