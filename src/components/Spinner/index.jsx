import React from 'react';
import './Spinner.css'; // Import the CSS for the spinner

const Spinner = ({ size }) => (
    <div className="spinner" style={{ height: size, width: size }}></div>
  );

export default Spinner;