import React, { useEffect, useState, useRef } from 'react';
import { ethers } from 'ethers';

// TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface ConnectProps {
  onConnect: (account: string | null) => void;
  onError: (message: string) => void;
}

const Connect: React.FC<ConnectProps> = ({ onConnect, onError }) => {
  const [defaultAccount, setDefaultAccount] = useState<string | null>(null);
  const providerRef = useRef<ethers.providers.Web3Provider | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      providerRef.current = new ethers.providers.Web3Provider(window.ethereum);

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setDefaultAccount(accounts[0]);
          onConnect(accounts[0]);
        } else {
          setDefaultAccount(null);
          onConnect(null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      providerRef.current.listAccounts().then((accounts) => {
        if (accounts.length > 0) {
          setDefaultAccount(accounts[0]);
          onConnect(accounts[0]);
        }
      });

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    } else {
      onError('Please install MetaMask');
    }
  }, [onConnect, onError]);

  const connectwalletHandler = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        providerRef.current = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await providerRef.current.send('eth_requestAccounts', []);
        if (accounts.length > 0) {
          setDefaultAccount(accounts[0]);
          onConnect(accounts[0]);
        }
      } catch (error) {
        onError('Failed to connect wallet');
        console.error(error);
      }
    } else {
      onError('Please install MetaMask!');
    }
  };

  return (
    <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
      <button
        onClick={connectwalletHandler}
        disabled={!!defaultAccount}
        style={{
          background: defaultAccount ? '#A5CC82' : 'white',
          padding: '10px 20px',
          border: '1px solid #ccc',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        {defaultAccount ? 'Connected' : 'Connect Wallet'}
      </button>
      {defaultAccount && (
        <span style={{ marginLeft: '10px', color: '#A5CC82' }}>
          {defaultAccount.slice(0, 6)}...{defaultAccount.slice(-4)}
        </span>
      )}
    </div>
  );
};

export default Connect;