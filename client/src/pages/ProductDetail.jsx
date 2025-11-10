// src/pages/ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "@google/model-viewer";
import "./ProductDetail.css"; // optional styling

export default function ProductDetail() {
  const { id } = useParams(); // product ID from URL
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`http://localhost:5000/products/${id}`);
        if (!res.ok) throw new Error("Failed to fetch product details");
        const data = await res.json();
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  if (loading) return <div className="loader">Loading product...</div>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!product) return <p>Product not found.</p>;

  // If model is ready, show model-viewer
  const modelUrl =
    product.modelStatus === "ready" && product.modelFileId
      ? `http://localhost:5000/api/models/${product.modelFileId}`
      : null;

  return (
    <div className="product-detail-page">
      <h1 className="product-title">{product.title}</h1>
      <p className="product-price">₹ {product.price}</p>
      <p className="product-description">{product.description}</p>

      {/* Photos carousel or first photo */}
      {product.photos?.length > 0 && (
        <img
          src={product.photos[0].url}
          alt={product.title}
          className="product-image"
        />
      )}

      {/* 3D Model Viewer Section */}
      {product.modelStatus === "processing" && (
        <p>⏳ Generating 3D model — please check back soon.</p>
      )}

      {product.modelStatus === "failed" && (
        <p>❌ Model generation failed. Try re-uploading.</p>
      )}

      {modelUrl && (
        <div className="model-viewer-wrapper">
          <model-viewer
            src={modelUrl}
            alt={`${product.title} 3D model`}
            camera-controls
            auto-rotate
            shadow-intensity="1"
            style={{
              width: "100%",
              height: "500px",
              borderRadius: "12px",
              background: "#f0f0f0",
            }}
          />
        </div>
      )}
    </div>
  );
}
