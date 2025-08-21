import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const ProductPage = () => {
    const [product, setProduct] = useState(null);
    const {productId} = useParams();
  
    useEffect(() => {
      fetch(`http://localhost:3000/products/${productId}`)
    .then((res) => res.json())
    .then((data) => {
      console.log("Fetched product:", data);
      setProduct(data); // not data.data
    })
    .catch((err) => console.error("Error fetching product details:", err));
    }, [productId]);
  
    if (!product) return <p>Loading...</p>;
  

    return (
      <div className="product-details">
        <h1>{product.name}</h1>
        {/* <img src={product.imageURL} alt={product.productName} className="product-image-large" /> */}
        <p>{product.description}</p>
        <p>Price: ₹{product.actual_price}</p>
        <p>Ratings: {product.ratings}</p>
        <p>Category: {product.sub_category}</p>
      </div>
    );
};


  export default ProductPage;