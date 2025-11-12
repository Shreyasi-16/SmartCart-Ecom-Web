import React from "react";
import { Link } from "react-router-dom";
import "../Component/SimilarProducts.css"; // create this CSS file if not yet

const SimilarProducts = ({ products, isLoading }) => {
  if (products === null) {
    return <p>Loading similar products...</p>; // show while fetching
  }

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
    </div>
  );
};

export default SimilarProducts;
