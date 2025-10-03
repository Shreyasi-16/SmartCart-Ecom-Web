import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; 
import "./Hero.css";

const slides = [
  {
    image:
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1920&q=80",
    title: "Women Fashion",
    subtitle: "Trendy outfits nas accessories for Women",
    category: "Women Clothing",
    categoryId:601,
  },
  {
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1920&q=80",
    title: "Electronics & Appliances",
    subtitle: "Shop TVs, laptops, and home essentials",
    category: "Laptops",
    categoryId:402,
  },
 
  {
    image:
      "https://www.lapanddado.com/wp-content/uploads/2022/09/DSC_0113-copy1.png",
    title: "Furniture",
    subtitle: "Desks, chairs & workspace essentials",
    category: "Furniture",
    categoryId:5,
  },
  {
    image:
      "https://cdn.home-designing.com/wp-content/uploads/2019/03/wooden-wall-decor-1024x614.jpg",
    title: "Home Decor",
    subtitle: "Elegant designs to beautify your living space",
    category: "Furniture",
    categoryId:5,
  },
  {
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1920&q=80",
    title: "Books, Sports & Hobbies",
    subtitle: "Explore learning and fun activities",
    category:"Books",
    categoryId:701,
  },

  
];


export default function Hero() {


  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  const handleExplore = () => {
    // Navigate to /product and pass category as state
    navigate("/product", { state: { selectedCategory: slides[currentIndex].category } });
  };

  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Navigate slides manually
  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="hero">
      {/* Background slides */}
      {slides.map((slide, index) => (
        <img
          key={index}
          src={slide.image}
          alt={slide.title}
          className={`hero-slide ${index === currentIndex ? "active" : ""}`}
        />
      ))}

      {/* Dynamic Content */}
      <div className="hero-content">
        <h1 className="hero-title">{slides[currentIndex].title}</h1>
        <p className="hero-subtitle">{slides[currentIndex].subtitle}</p>
        <button className="hero-button" onClick={handleExplore}>Explore Now</button>
      </div>

      {/* Navigation Arrows */}
<div className="hero-arrow left-arrow" onClick={prevSlide}>
  &#10094;
</div>
<div className="hero-arrow right-arrow" onClick={nextSlide}>
  &#10095;
</div>

    </section>
  );
}
