'use client';

import InputField from '@/components/InputField';
import Button from '@/components/Button';
import { useState } from 'react';
import Connect from '@/components/Connect';
import useStore from "@/store/userStore";

export default function Login() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const setRole = useStore((state) => state.setRole);
  const [name, setName] = useState<string>("");

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
        if(!response.ok){
          const text = await response.text();
          throw new Error(text);
        }
      
      const data = await response.json();
      if (data.token) {
        setErrorMessage('Login successful');
        localStorage.setItem('token', data.token);
        // Fetch user profile with the token
        const profileRes = await fetch('http://localhost:8080/api/user/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.token}`,
          },
        });
        const user = await profileRes.json();
        if (user.role) {
          console.log('User role: ',user.role);
          setRole(user.role);
          setName(user.name || "");
          if (user.role === 'Admin') {
            window.location.href = '/Admin';
          } else if(user.role === 'Patient'){
            window.location.href = '/Patient';
          }else if(user.role = 'Insurer'){
            window.location.href = '/Insurer'
          }else if(user.role = 'HealthcareProvider'){
            window.location.href = '/HealthcareProvider'
          }else{
            throw new Error("Not a valid user role");
          }
        }
      } else {
        setErrorMessage('Login failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setErrorMessage('Error during login');
      console.error(error);
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
            {emailError && <p className="text-red-400 text-sm mt-1">{emailError}</p>}
          </div>
          <InputField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="text-blue-400" />
              <span className="text-white">Remember Me</span>
            </label>
            <a href="#" className="text-blue-400 hover:underline">
              Forgot Password?
            </a>
          </div>
          <Button type="submit" disabled={!publicKey || !username || !password || !!emailError}>
            Login to your Account
          </Button>
          {errorMessage && <p className={`${errorMessage == "Login Successful"} ?? text-red-400 text-center mt-2: `}>{errorMessage}</p>}
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
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-1.337-.026-3.06-1.872-3.06-1.872 0-2.159 1.452-2.159 2.956v5.708h-3v-11h2.879v1.548h.041c.398-.753 1.369-1.548 2.817-1.548 3.018 0 3.579 1.985 3.579 4.567v6.433z"/>
              </svg>
            </a>
          </div>
        </div>
        <p className="mt-6 text-center text-gray-400">
          Don't have account? <a href="/SignUp" className="text-blue-400 hover:underline">Register Now</a>
        </p>
      </div>
      <div className="w-1/2 justify-center hidden md:flex overflow-hidden flex-col items-center">
        <div className="text-white justify-center flex mb-4 font-bold">"Specialized in keeping your medical data private"</div>
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