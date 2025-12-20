import { X } from 'lucide-react';
import React, { useState } from 'react';
import { createAdmin } from '../lib/integration';
import { print } from '../../utils/toast';

interface createAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateAdminModal = ({ isOpen, onClose }: createAdminModalProps) => {
  const [name, setName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name || !walletAddress) {
      print('Please fill in all fields', 'error', () => {});
      return;
    }

    try {
      setIsLoading(true);
      await createAdmin(walletAddress);

      // Persist the admin name in the backend
      const response = await fetch('http://localhost:8080/api/auth/signUp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name,
          publicKey: walletAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('Backend registration warning:', errorData.message);
        print('Admin created (Name sync warning)', 'warning', () => {});
      } else {
        print('Admin created successfully!', 'success', () => {});
      }

      setName('');
      setWalletAddress('');
      onClose();
    } catch (error: any) {
      console.error('Failed to create admin:', error);
      print(error.message || 'Failed to create admin', 'error', () => {});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex justify-between items-center z-10">
          <h2 className="text-white text-xl font-semibold flex items-center">
            Create Admin
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div>
          <div className="mt-4 p-4">
            <label className="text-white mb-2 block">
              Admin Name: <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="mt-4 p-4">
            <label className="text-white mb-2 block">
              Wallet Address: <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-700 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading}
            className={`px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Creating...' : 'Create Admin'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAdminModal;
