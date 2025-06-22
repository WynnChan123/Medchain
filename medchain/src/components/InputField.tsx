import React from 'react';

interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({ id, label, type, value, onChange }) => {
  return (
    <div>
      <input
        id={id}
        type={type}
        className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
        placeholder={label}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default InputField;