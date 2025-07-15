import React from 'react';
import Modal from 'react-modal';

interface MyModalProps {
  isOpen: boolean;
  isClose: () => void;
  children: React.ReactNode;
}

const MyModal: React.FC<MyModalProps> = ({ isOpen, isClose, children }) => {
  return (
    <Modal
      onRequestClose={isClose}
      isOpen={isOpen}
      style={{
        content: {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '20px',
          position: 'relative',
          maxWidth: '500px', // Set a maximum width
          width: '90%', // Ensure it scales down on smaller screens
          display: 'block',
          backgroundColor: '#212529',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      }}
    >
      <button
        className="absolute top-2 right-2 text-white bg-red-500 p-2 rounded-lg"
        onClick={isClose}
      >
        Close
      </button>
      <div className="flex justify-center mt-10">
        {children}
      </div>
    </Modal>
  );
};

export default MyModal;