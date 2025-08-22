// Product.jsx
import React from "react";
import { Link } from "react-router-dom";

export function Product() {
  // Dummy product data
  const products = [
    { id: 1, name: "Laptop" },
    { id: 2, name: "Phone" },
    { id: 3, name: "Tablet" },
  ];

  return (
    <div>
      <h2>Products</h2>
      <p>Browse our product catalog.</p>

      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <Link to={`/product/${product.id}`}>{product.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
