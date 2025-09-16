import React, { useEffect, useState } from "react";
import "./Hero.css";

const slides = [
  {
    image:
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1920&q=80",
    title: "Family Fashion",
    subtitle: "Trendy outfits for men, women, and kids",
  },
  {
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1920&q=80",
    title: "Electronics & Appliances",
    subtitle: "Shop TVs, laptops, and home essentials",
  },
  {
    image:
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/283976935.jpg?k=bbf0062899f3c2460b1fddae015ad008e90434f45af7798c83419cd321231f03&o=&hp=1",
    title: "Modern Apartments",
    subtitle: "Find your dream home today",
  },
  {
    image:
      "https://www.lapanddado.com/wp-content/uploads/2022/09/DSC_0113-copy1.png",
    title: "Furniture",
    subtitle: "Desks, chairs & workspace essentials",
  },
  {
    image:
      "https://cdn.home-designing.com/wp-content/uploads/2019/03/wooden-wall-decor-1024x614.jpg",
    title: "Home Decor",
    subtitle: "Elegant designs to beautify your living space",
  },
  {
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1920&q=80",
    title: "Books, Sports & Hobbies",
    subtitle: "Explore learning and fun activities",
  },
  {
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1920&q=80",
    title: "Headphones & Gadgets",
    subtitle: "Experience the best sound and technology",
  },
  {
    image:
      "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1920&q=80",
    title: "Smartphones",
    subtitle: "Latest devices at the best prices",
  },
  {
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1920&q=80",
    title: "Shoes Collection",
    subtitle: "Step into style with trendy footwear",
  },
];

export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

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
        <button className="hero-button">Explore Now</button>
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
