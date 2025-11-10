import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import ChatRoom from "../Component/ChatRoom";
import "./ChatDashboard.css";

const API_URL = "http://localhost:5000/api/chats";

// ✅ Proper template literal for unique chat ID
const generateChatId = (buyerId, sellerId, productId) => {
  return `${buyerId}_${sellerId}_${productId}`;
};

const ChatDashboard = ({ currentUserId }) => {
  const [chats, setChats] = useState([]);
  const [firebaseUid, setFirebaseUid] = useState(null);
  const [openChat, setOpenChat] = useState(null);
  const [userNames, setUserNames] = useState({}); // for buyer/seller names

  // ✅ Fetch user names only when needed
  const fetchUserName = async (userId) => {
    if (!userId || userNames[userId]) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch user");
      const user = await res.json();
      setUserNames((prev) => ({ ...prev, [userId]: user.name }));
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  // ✅ Get Firebase UID
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setFirebaseUid(user.uid);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Fetch chats for the logged-in user
  useEffect(() => {
    if (!firebaseUid || !currentUserId) return;

    const fetchChats = async () => {
      try {
        const res = await fetch(`${API_URL}/user/${firebaseUid}`);
        if (!res.ok) throw new Error("Failed to fetch chats");
        const data = await res.json();
        setChats(data);

        // Preload user names
        data.forEach((chat) => {
          fetchUserName(chat.buyerId);
          fetchUserName(chat.sellerId);
        });
      } catch (err) {
        console.error("Error fetching chats:", err);
      }
    };

    fetchChats();
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
              key={generateChatId(chat.buyerId, chat.sellerId, chat.product?._id)}
              onClick={() => setOpenChat(chat)}
              className="chat-item"
            >
              <strong>Product:</strong> {chat.product?.title || "Unknown"} <br />
              <strong>Buyer:</strong>{" "}
              {userNames[chat.buyerId] || chat.buyerId || "Loading..."}
            </li>
          ))
        )}
      </ul>

      {/* ✅ Floating Chat Room */}
      {openChat && (
        <ChatRoom
          chatId={generateChatId(openChat.buyerId, openChat.sellerId, openChat.product?._id)}
          chat={openChat}
          onClose={() => setOpenChat(null)}
        />
      )}
    </div>
  );
};

export default ChatDashboard;
