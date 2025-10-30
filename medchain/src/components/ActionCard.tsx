import React from 'react';

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  href?: string;
}

const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  title,
  description,
  buttonText,
  href
}) => {
  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 hover:border-blue-600 transition">
      <div className="text-blue-400 mb-3">{icon}</div>
      <h4 className="text-white font-semibold mb-2">{title}</h4>
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm hover:cursor-pointer"
        onClick = {() => {
          window.location.href = href!;
        }}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default ActionCard;
