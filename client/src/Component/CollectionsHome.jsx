import React, { useEffect, useState } from "react";
import axios from "axios";
import "./CollectionsHome.css"; // optional CSS file

export default function CollectionsHome() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/collections/all-collections");
      setCollections(res.data.collections);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="collections-container">
      <h2>Available Collections</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="collections-table">
          <thead>
            <tr>
              <th>Collection Name</th>
              <th>Total Documents</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((col, index) => (
              <tr key={index}>
                <td>{col.name}</td>
                <td>{col.documentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
