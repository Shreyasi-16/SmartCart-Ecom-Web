import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "../Component/ComparisonTable.css";

const ComparisonTable = ({ productId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const productHeaderRefs = useRef([]);

  useEffect(() => {
    if (!productId) return;
    const fetchData = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/compare/${productId}`);
        setData(res.data);
      } catch (err) {
        console.error("Error fetching comparison data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [productId]);

  // Adjust header height dynamically
  useEffect(() => {
    if (!data || !productHeaderRefs.current) return;

    const updateHeights = () => {
      const heights = productHeaderRefs.current.map((ref) =>
        ref ? ref.scrollHeight : 0
      );
      const maxHeight = Math.max(...heights);
      setHeaderHeight(maxHeight);
    };

    // Run once after render and again after small delay
    updateHeights();
    const timeoutId = setTimeout(updateHeights, 200);

    // Also recalc when images load
    const imgs = document.querySelectorAll(".comparison-product-image");
    imgs.forEach((img) => img.addEventListener("load", updateHeights));

    return () => {
      clearTimeout(timeoutId);
      imgs.forEach((img) => img.removeEventListener("load", updateHeights));
    };
  }, [data]);

  if (loading)
    return <div className="text-center py-8 text-gray-500">Loading comparison...</div>;
  if (!data)
    return <div className="text-center py-8 text-red-500">No data available</div>;

  const { features, products } = data;

  return (
    <div className="comparison-table-wrapper">
      <h2 className="comparison-title">Product Comparison</h2>

      <div className="comparison-table-scroll">
        <div className="comparison-table" style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "220px" }}>
          {/* Feature column */}
          <div className="features-column">
            <div
              className="feature-cell header-cell"
              style={{ minHeight: `250px` }}

            >
              Features
            </div>
            {features.map((feature, idx) => (
              <div key={idx} className="feature-cell"style={{background:'#f3f3f4'}}>
                {feature}
              </div>
            ))}
          </div>

          {/* Product columns */}
          {products.map((product, pIdx) => (
            <div key={pIdx} className="product-column">
              <div
                ref={(el) => (productHeaderRefs.current[pIdx] = el)}
                className="product-cell header-cell"
                style={{ minHeight: `250px` }}
              >
                <img
                  src={product.photo || "/defaultBG.jpg"}
                  alt={product.title}
                  className="comparison-product-image"
                />
                <Link
                  to={`/product/${product._id}`}
                  className="comparison-product-link"
                >
                  <p>{product.title}</p>
                </Link>
                <p style={{color:'#22145cff'}}>₹{product.price}</p>
              </div>

              {/* Feature values */}
              {features.map((feature, vIdx) => (
                <div key={vIdx} className="product-cell">
                  {product.values[vIdx] || "-"}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
    

    
    
  );
};

export default ComparisonTable;