import React, { useState } from 'react';
import './DropDownMenu.css';   // ✅ import css
import { FaCar, FaMobileAlt, FaBicycle, FaTv, FaCouch, FaTshirt, FaBook, FaDog } from "react-icons/fa";

const DropDownMenu = () => {
  const [category, setCategory] = useState('');

  const categories = [
    { id: 1, icon: <FaCar />, name: "Cars" },
    { id: 2, icon: <FaMobileAlt />, name: "Mobiles" },
    { id: 3, icon: <FaBicycle />, name: "Bikes" },
    { id: 4, icon: <FaTv />, name: "Electronics & Appliances" },
    { id: 5, icon: <FaCouch />, name: "Furniture and Decor" },
    { id: 6, icon: <FaTshirt />, name: "Fashion" },
    { id: 7, icon: <FaBook />, name: "Books, Sports & Hobbies" },
    { id: 8, icon: <FaDog />, name: "Pets" },
  ];

  return (
    <div className="select-div">
      <select
        className="form-select"
        id="category"
        onChange={(e) => setCategory(e.target.value)}
        value={category}
      >
        <option value="">Select Category</option>
        {categories.map((item) => (
          <option key={item.id} value={item.name}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DropDownMenu;
