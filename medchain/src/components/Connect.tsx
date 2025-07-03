"use client";

import React, { useEffect, useState, useRef } from 'react';
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
    <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
      <button
        onClick={handleClick}
        style={{
          background: isConnected ? '#A5CC82' : 'white',
          padding: '10px 20px',
          border: '1px solid #ccc',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        {isConnected ? 'Connected' : 'Connect Wallet'}
      </button>
      {isConnected && (
        <span style={{ marginLeft: '10px', color: '#A5CC82' }}>
          {address!!.slice(0, 6)}...{address!!.slice(-4)}
        </span>
      )}
    </div>
  );
};

export default Connect;
