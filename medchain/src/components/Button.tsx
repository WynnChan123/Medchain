import React from 'react';

interface ButtonProps {
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ type = 'button', children, disabled = false }) => {
  return (
    <button
      type={type}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors"
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;