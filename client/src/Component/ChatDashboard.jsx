import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ChatRoom from "../Component/ChatRoom";
import './ChatDashboard.css'; 

const API_URL = "http://localhost:5000/api/chats";

const generateChatId = (buyerId, sellerId, productId) => {
  return `${buyerId}_${sellerId}_${productId}`;
};

const ChatDashboard = ({ currentUserId }) => {
  const [chats, setChats] = useState([]);
  const [firebaseUid, setFirebaseUid] = useState(null);
  const [openChat, setOpenChat] = useState(null); // store selected chat
  
//for display buyer name on Dashboard
  const [userNames, setUserNames] = useState({});

const fetchUserName = async (userId) => {
  if (!userId || userNames[userId]) return;
  try {
    const res = await fetch(`http://localhost:5000/api/users/${userId}`);
    const user = await res.json();
    setUserNames((prev) => ({ ...prev, [userId]: user.name }));
  } catch (err) {
    console.error("Error fetching user:", err);
  }
};

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setFirebaseUid(user.uid);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUid) return;

    const fetchChats = async () => {
      try {
        const res = await fetch(`${API_URL}/user/${firebaseUid}`);
        if (!res.ok) throw new Error("Failed to fetch chats");
        const data = await res.json();
        setChats(data);
      } catch (err) {
        console.error("Error fetching chats:", err);
      }
    };

    if (currentUserId) fetchChats();
  }, [firebaseUid, currentUserId]);

  return (
    <div className="chat-dashboard" style={{ position: "relative", minHeight: "100vh" }}>
      <h2>Your Chats</h2>
      <ul className="chat-list">
        {chats.length === 0 ? (
          <li>No chats yet</li>
        ) : (
          chats.map((chat) => (
            <li
              key={generateChatId(chat.buyerId, chat.sellerId, chat.product._id)}
              onClick={() => setOpenChat(chat)}
              className="chat-item"
            >
              <strong>Product:</strong> {chat.product?.title || "Unknown"} <br />
              <strong>Buyer Name:</strong> {chat.buyerId?.name} <br />
            </li>
          ))
        )}
      </ul>

      {/* Floating ChatRoom */}
      {openChat && (
        <ChatRoom
          chatId={generateChatId(openChat.buyerId, openChat.sellerId, openChat.product._id)}
          chat={openChat}
          onClose={() => setOpenChat(null)}
        />
      )}
    </div>
  );
};

export default ChatDashboard;
