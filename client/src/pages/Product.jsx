import React, { useEffect, useState } from "react";

export default function Product() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);   // ✅ handle loading state
  const [error, setError] = useState(null);       // ✅ handle errors

  useEffect(() => {
     fetch("http://localhost:5000/products/fetchProducts")
 // ✅ matches your backend route
      .then(res => {
        if (!res.ok) {
          throw new Error("Failed to fetch products");
        }
        return res.json();
      })
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading products...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        products.map(p => (
          <div 
            key={p._id} 
            style={{ border: "1px solid #ddd", padding: "15px", borderRadius: "10px" }}
          >
            {/* ✅ If product has photos, show first; else show SmartCart logo */}
            <img
            src={p.photos && p.photos.length > 0 ? p.photos[0] : "/defaultBG.jpg"}
            alt={p.title}
            style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "8px" }}
            onError={(e) => { e.target.src = "/defaultBG.jpg"; }}
          />

            <h3>{p.title}</h3>
            <p>₹ {p.price}</p>
          </div>
        ))
      )}
    </div>
  );
}
