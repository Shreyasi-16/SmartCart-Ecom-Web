import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ProductsCollection.css";

export default function ProductsCollection() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch all products
  const fetchProducts = async () => {
    try {
      const res = await axios.get("http://localhost:5000/products/fetchProducts");
      if (res.data.ok) setProducts(res.data.data);
    } catch (err) {
      console.log("Error fetching products:", err);
    }
  };

  // Delete product
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await axios.delete(`http://localhost:5000/products/${id}`);
      setProducts(products.filter((p) => p._id !== id));
    } catch (err) {
      console.log("Delete error:", err);
    }
  };

  // Filter products by title
  const filteredProducts = products.filter((product) =>
    product.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="products-container">
      <h2>Products Collection</h2>

      {/* ---- Search Box ---- */}
      <input
        type="text"
        placeholder="Search product by title..."
        className="product-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* ---- Products Box ---- */}
      <div className="products-box">
        {filteredProducts.length === 0 ? (
          <p className="no-products">No products found</p>
        ) : (
          filteredProducts.map((product) => (
            <div key={product._id} className="product-card">
              <div className="product-info">
                <h4>{product.title || "No Title"}</h4>
                <p>Price: ₹{product.price}</p>
                <p>{product.city}, {product.state}</p>
                <p className="date">
                  Added: {new Date(product.createdAt).toLocaleDateString()}
                </p>
              </div>

              <button
                className="delete-btn"
                onClick={() => handleDelete(product._id)}
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
