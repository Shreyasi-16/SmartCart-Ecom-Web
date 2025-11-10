import React from "react";
import { Link } from "react-router-dom";
import "../Component/SimilarProducts.css"; // create this CSS file if not yet

const SimilarProducts = ({ products }) => {
  if (!products || products.length === 0) {
    return (
      <div className="similar-products-empty">
        <h3>No Similar Products Found</h3>
      </div>
    );
  }

  return (
    <div className="similar-products-container">
      <h3 className="similar-title">Similar Products</h3>
      {/* <div className="similar-products-grid">
        {products.map((item) => (
          <Link
            to={`/product/${item._id}`}
            key={item._id}
            className="similar-product-card"
          >
            <img
              src={item.photos && item.photos[0] ? item.photos[0] : "/default.jpg"}
              alt={item.title || "Product"}
              className="similar-product-image"
            />
            <div className="similar-product-info">
              <h4>{item.title}</h4>
              <p>₹{item.price}</p>
            </div>
          </Link>
        ))}
      </div> */}
    </div>
  );
};

export default SimilarProducts;
