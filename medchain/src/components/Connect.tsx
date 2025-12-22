"use client";

import React, { useEffect } from 'react';
import {
  useAppKit,
  useAppKitAccount,
  useDisconnect,
} from '@reown/appkit/react';

interface ConnectProps {
  onConnect: (account: string | null) => void;
  onError: (message: string) => void;
}

const Connect: React.FC<ConnectProps> = ({ onConnect, onError }) => {
  const { open, close } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    onConnect(isConnected ? address || null : null);
  }),
    [isConnected, address, onConnect];

  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      open({ view: 'Connect', namespace: 'eip155' });
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <button
        onClick={handleClick}
        className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg border border-gray-300 cursor-pointer font-medium text-sm sm:text-base transition-all hover:shadow-md ${
          isConnected 
            ? 'bg-green-400 text-gray-800 hover:bg-green-500' 
            : 'bg-white text-gray-800 hover:bg-gray-100'
        }`}
      >
        <span className="hidden sm:inline">{isConnected ? 'Connected' : 'Connect Wallet'}</span>
        <span className="sm:hidden">{isConnected ? '✓' : 'Connect'}</span>
      </button>
      {isConnected && (
        <span className="hidden md:inline text-green-400 font-mono text-sm">
          {address!!.slice(0, 6)}...{address!!.slice(-4)}
        </span>
      )}
    </div>
  );
};

export default Connect;
