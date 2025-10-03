'use client';

import Button from '@/components/Button';
import InputField from '@/components/InputField';
import Dropdown from '@/components/SignUp/dropdown';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Select from 'react-select';
import { print } from '../../../utils/toast';

export default function CreateUser(){
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [role, setRole] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const router = useRouter();

  const sampleOrganizations = [
    'Sunway Medical Centre',
    'Kuala Lumpur General Hospital',
    'Malaysia Insurance Co.',
    'MediLab Services',
    'Other (Enter manually)'
  ];

  const orgOptions = sampleOrganizations.map(org => ({ value: org, label: org }));


  // Email validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const emailValue = e.target.value;
    setEmail(emailValue);
    
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

  const handleSignUp = async() => {
    // Clear previous error messages
    setErrorMessage('');
    
    // Check if all fields are filled
    if(!username || !email || !password || !organizationName || !role){
      setErrorMessage('Please fill in all the fields!');
      return;
    }

    // Validate email format before submission
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Clear email error if validation passes
    setEmailError('');

    try{
      const response = await fetch('http://localhost:8080/api/auth/signUp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: username,
          email,
          password,
          // organizationName,
          // role,
        }),
      });

      const data = await response.json();
      if (!response.ok){
        throw new Error(data.message || 'Signed up failed')
      }

      print('Signed Up Successfully!', 'success', () => router.push('/'));

    }catch(error){
      console.error('Sign up error:', error);
      if (error instanceof Error) {
        toast.error(error.message || 'An error occurred.');
      } else {
        toast.error('An error occurred.');
      }
    }
  }

  const handleRoleChange = (e: any)=> {
    setRole(e.target.value);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 bg-dot-pattern relative">
      <ToastContainer />
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-1/2 max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 flex items-center justify-center">
          <span className="text-white">Welcome To MedChain</span>
        </h1>
        <p className="text-center mb-6 text-gray-400">
          To start utilizing MedChain please sign up with your personal info
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSignUp();
          }}
        >
          <InputField
            id="username"
            label="User Name"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <div>
            <InputField
              id="email"
              label="Email"
              type="email"
              value={email}
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
          {/* <div>
            <Select
              options={orgOptions}
              value={orgOptions.find(option => option.value === organizationName) || null}
              onChange={option => setOrganizationName(option ? option.value : '')}
              placeholder="Select or search organization..."
              isClearable
              className="w-full text-gray-600"
              styles={{
                control: (provided, state) => ({   // (part (default styles), state(e.g, focused, selected, disabled))    
                  ...provided,
                  backgroundColor: '#374151', // Tailwind bg-gray-700
                  borderColor: '#4B5563',     // Tailwind border-gray-600
                  color: '#D1D5DB',           // Tailwind text-gray-300
                  boxShadow: state.isFocused ? '0 0 0 2px #3B82F6' : provided.boxShadow, // Tailwind ring-blue-500
                }),
                menu: (provided) => ({
                  ...provided,
                  backgroundColor: '#374151', // Tailwind bg-gray-700
                  color: '#D1D5DB',           // Tailwind text-gray-300
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isFocused
                    ? '#1F2937' // Tailwind bg-gray-800 for hover
                    : state.isSelected
                    ? '#3B82F6' // Tailwind blue-500 for selected
                    : '#374151', // Tailwind bg-gray-700 for default
                  color: state.isSelected ? '#FFF' : '#D1D5DB', // White for selected, gray-300 for others
                  cursor: 'pointer',
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: '#D1D5DB',           // Tailwind text-gray-300
                }),
                input: (provided) => ({
                  ...provided,
                  color: '#D1D5DB',           // Tailwind text-gray-300
                }),
                placeholder: (provided) => ({
                  ...provided,
                  color: '#9CA3AF',           // Tailwind text-gray-400
                }),
              }}
            />
          </div> */}
          {/* <Dropdown 
            className="flex w-1/3 rounded-full h-8 bg-gray-700 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-400"
            color="secondary"
            onChange={handleRoleChange}
            value={role}
          /> */}
          <Button type="submit" disabled={!email || !username || !password || !role || !organizationName || !!emailError}>
            Create Account
          </Button>
          {errorMessage && <p className="text-red-400 text-center mt-2">{errorMessage}</p>}
        </form>
        <p className="mt-6 text-center text-gray-400">
          Already have an account? <a href="/" className="text-blue-400 hover:underline">Login Now</a>
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
  )
}

