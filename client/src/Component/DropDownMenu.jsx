import React, { useState } from 'react';

const DropDownMenu = () => {
  const [category, setCategory] = useState('');

  const categories = ['Fruits', 'Vegetables', 'Dairy'];

  return (
    <div className='select-div'>
      <select
        className='form-select'
        id='category'
        onChange={(e) => setCategory(e.target.value)}
        value={category}
      >
        <option value="">Select Category</option>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DropDownMenu;
