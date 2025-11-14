import React, { useEffect, useState } from "react";
import axios from "axios";
import "./UsersCollection.css";

export default function UsersCollection() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users/all");
      if (res.data.success) setUsers(res.data.data);
    } catch (err) {
      console.log("Error fetching users:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/users/delete/${id}`);
      setUsers(users.filter((u) => u._id !== id));
    } catch (err) {
      console.log("Delete error:", err);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="users-container">
      <h2>User Collection</h2>

      {/* ---- Search Box ---- */}
      <input
        type="text"
        placeholder="Search user by name..."
        className="user-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* ---- Users Table Box ---- */}
      <div className="users-box">
        {filteredUsers.length === 0 ? (
          <p className="no-users">No users found</p>
        ) : (
          filteredUsers.map((user) => (
            <div key={user._id} className="user-card">
              <div className="user-info">
                <h4>{user.name || "No Name"}</h4>
                <p>{user.email}</p>
                <p className="date">
                  Joined: {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>

              <button
                className="delete-btn"
                onClick={() => handleDelete(user._id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
