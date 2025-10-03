import React from "react";
import "./AboutUs.css";
import Slider from "react-slick"; // Carousel library
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Team data
const teamMembers = [
  {
    id: 1,
    name: "Saema Patel",
    role: "ET23BTCO815",
    description:
      "",
    image: "mypic.jpeg",
  },
  {
    id: 2,
    name: "Tanzim Mansoori",
    enroll: "ET22BTCO130",
    description:
      "",
    image: "mypic.jpeg",
  },
  {
    id: 3,
    name: "Shreyasi Vasava",
    enroll: "ET22BTCO141",
    description:
      "",
    image: "mypic.jpeg",
  },
  {
    id: 4,
    name: "Jiya Patel",
    enroll: "ET22BTCO092",
    description:
      "",
    image: "mypic.jpeg",
  },
  {
    id: 5,
    name: "Vidhi Patel",
    enroll: "ET22BTCO103",
    description:
      "",
    image: "mypic.jpeg",
  },
];

const AboutUs = () => {
  const settings = {
  dots: true,
  infinite: true,
  speed: 800,
  slidesToShow: 3,
  slidesToScroll: 1,
  centerMode: true,
  centerPadding: "0px",
  autoplay: true,
  autoplaySpeed: 2500, // slide every 2.5s
  pauseOnHover: true,   // pause when hovering
  responsive: [
    {
      breakpoint: 1024,
      settings: {
        slidesToShow: 3,
        slidesToScroll: 1,
        centerMode: true,
      },
    },
    {
      breakpoint: 768,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
        centerMode: true,
      },
    },
  ],
};


  return (
    <div className="aboutus-container">
      <div className="headersection">
        <p className="small-text">ABOUT</p>
        <h1>SmartCart – AI Powered Buy & Sell Marketplace</h1>
        <p className="subtitle">
          SmartCart is an advanced e-commerce platform designed for users who
          want a smarter and faster way to buy and sell products. Our goal is
          to simplify buying and selling while making it intelligent using AI.
        </p>
        <p className="small-text">Our Team</p>
      </div>

      <Slider {...settings} className="team-carousel">
        {teamMembers.map((member) => (
          <div key={member.id} className="team-card">
            <div className="team-img-container">
              <img src={member.image} alt={member.name} className="team-img" />
            </div>
            <div className="team-info">
              <h3>{member.name}</h3>
              <p>{member.description}</p>
              <span className="team-name">{member.enroll}</span>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default AboutUs;
