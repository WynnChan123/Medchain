import { X } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { createAdmin } from '../lib/integration';
import { print } from '../../utils/toast';
import { API_URL } from '@/lib/config';

interface createAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateAdminModal = ({ isOpen, onClose }: createAdminModalProps) => {
  const [name, setName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filled, setFilled] = useState({ name: false, walletAddress: false });

  if (!isOpen) return null;

  // Validate Ethereum address format
  const isValidAddress = (address: string): boolean => {
    if (!address) return false;
    // Check if it starts with 0x and has 42 characters total (0x + 40 hex chars)
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  };

  // Validation errors
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    
    if (filled.name && !name.trim()) {
      errors.push('Admin name is required');
    }
    
    if (filled.walletAddress && !walletAddress.trim()) {
      errors.push('Wallet address is required');
    } else if (filled.walletAddress && walletAddress.trim() && !isValidAddress(walletAddress)) {
      errors.push('Invalid wallet address format');
    }
    
    return errors;
  }, [name, walletAddress, filled]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return name.trim() !== '' && 
           walletAddress.trim() !== '' && 
           isValidAddress(walletAddress);
  }, [name, walletAddress]);

  const handleCreate = async () => {
    // Mark all fields as filled
    setFilled({ name: true, walletAddress: true });

    if (!name.trim() || !walletAddress.trim()) {
      print('Please fill in all fields', 'error', () => {});
      return;
    }

    if (!isValidAddress(walletAddress)) {
      print('Invalid wallet address format', 'error', () => {});
      return;
    }

    try {
      setIsLoading(true);
      await createAdmin(walletAddress);

      // Persist the admin name in the backend
      const response = await fetch(`${API_URL}/api/auth/signUp`, {
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
      setFilled({ name: false, walletAddress: false });
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
              onBlur={() => setFilled(prev => ({ ...prev, name: true }))}
              placeholder="e.g., John Doe"
              className={`w-full p-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                filled.name && !name.trim()
                  ? 'border-red-500 focus:ring-red-600'
                  : 'border-gray-700 focus:ring-blue-600'
              }`}
            />
            {filled.name && !name.trim() && (
              <p className="text-red-400 text-sm mt-2">Admin name is required</p>
            )}
          </div>
          <div className="mt-4 p-4">
            <label className="text-white mb-2 block">
              Wallet Address: <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              onBlur={() => setFilled(prev => ({ ...prev, walletAddress: true }))}
              placeholder="0x..."
              className={`w-full p-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                filled.walletAddress && (!walletAddress.trim() || !isValidAddress(walletAddress))
                  ? 'border-red-500 focus:ring-red-600'
                  : 'border-gray-700 focus:ring-blue-600'
              }`}
            />
            {filled.walletAddress && !walletAddress.trim() && (
              <p className="text-red-400 text-sm mt-2">Wallet address is required</p>
            )}
            {filled.walletAddress && walletAddress.trim() && !isValidAddress(walletAddress) && (
              <p className="text-red-400 text-sm mt-2">Invalid wallet address format (must start with 0x and be 42 characters)</p>
            )}
          </div>
          
          {/* Summary of validation errors */}
          {validationErrors.length > 0 && (
            <div className="mx-4 mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm font-medium mb-1">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-red-400 text-sm space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
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
            disabled={isLoading || !isFormValid}
            className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-medium transition-colors ${
              isLoading || !isFormValid
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-700'
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
