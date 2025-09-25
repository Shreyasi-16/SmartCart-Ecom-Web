import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const ProductPage = () => {
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const { productId } = useParams();

  useEffect(() => {
  fetch(`http://localhost:5000/products/${productId}`)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch product details");
      return res.json();
    })
    .then((data) => {
      console.log("Fetched product:", data);
      setProduct(data.data); // ✅ unwrap
    })
    .catch((err) => {
      console.error("Error fetching product details:", err);
      setError(err.message);
    });
}, [productId]);


  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!product) return <p>Loading...</p>;

  return (
    <div className="product-details">
      <h1>{product.title}</h1>
          {/* ✅ Display all product photos */}
      {product.photos?.length > 0 && (
        <div className="product-images-gallery">
          {product.photos.map((photo, index) => (
            <img
              key={index}
              src={photo}
              alt={`${product.title} - ${index + 1}`}
              className="product-image-large"
              onError={(e) => {
                e.target.src = "/defaultBG.jpg"; // fallback
              }}
            />
          ))}
        </div>
      )}
      
      <p>{product.description}</p>
      <p>Price: ₹{product.price}</p>
      {product.ratings && <p>Ratings: {product.ratings}</p>}
      {product.sub_category && <p>Category: {product.sub_category}</p>}
    </div>
  );
};

export default ProductPage;
