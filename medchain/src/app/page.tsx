'use client';

import InputField from '@/components/InputField';
import Button from '@/components/Button';
import { useEffect, useState } from 'react';
import Connect from '@/components/Connect';
import useStore from '@/store/userStore';
import {
  getPendingRequestByUser,
  getRole,
  readContract,
  registerUser,
  userExists,
} from '@/lib/integration';
// import { User, UserSquare } from 'lucide-react';
import { UserRole } from '../../utils/userRole';
import { ethers } from 'ethers';
import { User } from '@reown/appkit';
import { toast } from 'react-toastify';

export default function Login() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const setRole = useStore((state) => state.setRole);
  const [name, setName] = useState<string>('');



  const handleLogin = async () => {
    // Clear previous error messages
    setErrorMessage('');

    if (!publicKey) {
      setErrorMessage('Please connect wallet');
      return;
    }


    try {
      const response = await fetch('http://localhost:8080/api/auth/logIn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
      });
      
      // Parse the response body first
      let data;
      try {
        data = await response.json();
      } catch {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        setErrorMessage(text || 'Login failed');
        return;
      }

      // Check if response is not ok and display the error message
      if (!response.ok) {
        const errorMsg = data.message || data.error || 'Login failed';
        console.error('Login failed:', errorMsg);
        setErrorMessage(errorMsg);
        return;
      }

      if (!window.ethereum) {
        setErrorMessage(
          'Ethereum provider not found. Please install MetaMask.'
        );
        return;
      }
      
      const provider = new ethers.providers.Web3Provider(
        window.ethereum as ethers.providers.ExternalProvider
      );
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const signerAddress = await signer.getAddress();
      const network = await provider.getNetwork();
      
      if (network.chainId !== 11155111) {
        setErrorMessage('Please connect to the Sepolia network in MetaMask.');
        return;
      }

      if (data.token) {
        setErrorMessage('Login successful');
        localStorage.setItem('token', data.token);

        // Fetch user profile with the token
        const profileRes = await fetch(
          'http://localhost:8080/api/user/profile',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.token}`,
            },
          }
        );
        const user = await profileRes.json();
        setName(user.name || '');

        try {
          const roleId = await getRole(signerAddress);
          const alreadyExists = await userExists(signerAddress);
          if (roleId === UserRole.Unregistered) {
            const pendingRequest = await getPendingRequestByUser(signerAddress);

            if(pendingRequest.length > 0){
              const requestedRole = pendingRequest[0].newRole;
              const roleName = UserRole[roleId] as keyof typeof UserRole;
              setRole(roleName);
              if(requestedRole === UserRole.HealthcareProvider){
                window.location.href = '/HealthcareProvider?verified=false'
              }else if (requestedRole === UserRole.Insurer){
                window.location.href = '/Insurer?verified=false'
              }
            }else{
              setErrorMessage('User not registered onchain. Please register an account first!');
            }
          } else {
            // User already exists, redirect based on existing role
            const roleName = UserRole[roleId] as keyof typeof UserRole;
            setRole(roleName);

            if (roleId === UserRole.Admin) {
              window.location.href = '/Admin';
            } else if (roleId === UserRole.Patient) {
              window.location.href = '/Patient';
            } else if (roleId === UserRole.Insurer) {
              window.location.href = '/Insurer';
            } else if (roleId === UserRole.HealthcareProvider) {
              window.location.href = '/HealthcareProvider';
            } else {
              throw new Error('Not a valid user role');
            }
          }
        } catch (error: any) {
          console.error('Error fetching role from blockchain:', error);
          const errorMsg = error.reason || error.message || 'An unknown blockchain error occurred.';
          setErrorMessage(errorMsg);
          return;
        }
      } else {
        setErrorMessage('Login failed: ' + (data.message || data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error during login:', error);
      const errorMsg = error.message || error.reason || 'Error during login';
      setErrorMessage(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 bg-dot-pattern relative">
      <Connect
        onConnect={(account) => setPublicKey(account)}
        onError={(message) => setErrorMessage(message)}
      />
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-1/2 max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 flex items-center justify-center">
          <span className="text-white">Welcome To MedChain</span>
        </h1>
        <p className="text-center mb-6 text-gray-400">
          To login, please connect your wallet
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <Button
            type="submit"
            disabled={!publicKey}
          >
            Login to your Account
          </Button>
          {errorMessage && (
            <p
              className={`text-center mt-2 ${
                errorMessage === 'Login successful'
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {errorMessage}
            </p>
          )}
        </form>
        <p className="mt-6 text-center text-gray-400">
          Don't have account?{' '}
          <a href="/SignUp" className="text-blue-400 hover:underline">
            Register Now
          </a>
        </p>
      </div>
      <div className="w-1/2 justify-center hidden md:flex overflow-hidden flex-col items-center">
        <div className="text-white justify-center flex mb-4 font-bold">
          "Specialized in keeping your medical data private"
        </div>
        <img
          src="/medchain.svg"
          alt="Login Illustration"
          className="w-1/2 h-auto object-contain"
          style={{ objectFit: 'contain' }}
          width={300}
          height={200}
        />
      </div>
    </div>
  );
}
