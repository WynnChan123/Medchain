'use client';

import InputField from '@/components/InputField';
import Button from '@/components/Button';
import { useEffect, useState } from 'react';
import Connect from '@/components/Connect';
import useStore from '@/store/userStore';
import {
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
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const setRole = useStore((state) => state.setRole);
  const [name, setName] = useState<string>('');
  // const [role, setRole] = useState<string>("");

  useEffect(() => {
    console.log('Public Key: ', publicKey);
  }, [publicKey]);
  // Email validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const emailValue = e.target.value;
    setUsername(emailValue);

    // Clear error when email is empty
    if (!emailValue) {
      setEmailError('');
      return;
    }

    // Validate email format
    if (!validateEmail(emailValue)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleLogin = async () => {
    // Clear previous error messages
    setErrorMessage('');

    if (!publicKey || !username || !password) {
      setErrorMessage('Please connect wallet and enter username/password');
      return;
    }

    // Validate email format before submission
    if (!validateEmail(username)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Clear email error if validation passes
    setEmailError('');

    try {
      const response = await fetch('http://localhost:8080/api/auth/logIn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password, publicKey }),
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

          if (roleId === UserRole.Unregistered) {
            setErrorMessage(
              'User role not found on blockchain. Registering user on chain...'
            );

            const encryptedId = ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes(user.id)
            );
            console.log('Signer address:', signerAddress);
            console.log('Public key (from backend or UI):', publicKey);
            const alreadyExists = await userExists(signerAddress);
            console.log('User already exists on blockchain?', alreadyExists);

            if (alreadyExists) {
              throw new Error(
                'User already registered on blockchain. Please use a different wallet address.'
              );
            }
            
            const txReceipt = await registerUser(signerAddress, encryptedId, 1);
            console.log('Transaction mined:', txReceipt);

            await new Promise((resolve) => setTimeout(resolve, 2000));
            toast.success('Registration on blockchain is successful');

            // Get the role again after registration
            const finalRole = await getRole(signerAddress);
            if (finalRole === UserRole.Unregistered) {
              throw new Error('Failed to get role after registration');
            }

            const roleName = UserRole[finalRole] as keyof typeof UserRole;
            setRole(roleName);

            if (finalRole === UserRole.Admin) {
              window.location.href = '/Admin';
            } else if (finalRole === UserRole.Patient) {
              window.location.href = '/Patient';
            } else if (finalRole === UserRole.Insurer) {
              window.location.href = '/Insurer';
            } else if (finalRole === UserRole.HealthcareProvider) {
              window.location.href = '/HealthcareProvider';
            } else {
              throw new Error('Not a valid user role');
            }
          } else {
            // User already exists, redirect based on existing role
            const roleName = UserRole[roleId] as keyof typeof UserRole;
            console.log('Existing role from enum:', roleName);
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
        console.log('Login failed: ', data);
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
          To keep connected with us please login with your personal info
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <div>
            <InputField
              id="username"
              label="Email"
              type="email"
              value={username}
              onChange={handleEmailChange}
            />
            {emailError && (
              <p className="text-red-400 text-sm mt-1">{emailError}</p>
            )}
          </div>
          <InputField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex items-center justify-end">
            <a href="/forgot-password" className="text-blue-400 hover:underline">
              Forgot Password?
            </a>
          </div>
          <Button
            type="submit"
            disabled={!publicKey || !username || !password || !!emailError}
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
        <div className="mt-6 text-center">
          <p className="text-white">or Sign in with</p>
          <div className="flex justify-center space-x-4 mt-2">
            <a href="#" className="text-gray-400 hover:text-blue-400">
              <span className="sr-only">Google</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,9.999,10c8.396,0,10-6.597,10-10.417c0-0.568-0.068-1.126-0.189-1.665H12.545z" />
              </svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-blue-400">
              <span className="sr-only">Facebook</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89c1.094 0,2.238.195,2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.991 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
            <a href="#" className="text-blue-400 hover:underline">
              <span className="sr-only">LinkedIn</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-1.337-.026-3.06-1.872-3.06-1.872 0-2.159 1.452-2.159 2.956v5.708h-3v-11h2.879v1.548h.041c.398-.753 1.369-1.548 2.817-1.548 3.018 0 3.579 1.985 3.579 4.567v6.433z" />
              </svg>
            </a>
          </div>
        </div>
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
