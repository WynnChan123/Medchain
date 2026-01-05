'use client';

import Dropdown from '@/components/SignUp/dropdown';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { print } from '../../../utils/toast';
import Connect from '@/components/Connect';
import FileUploadField from '@/components/FileUploadField';
import {
  getRole,
  registerUser,
  userExists,
  getAdmins,
  getAdminPublicKey,
  submitRoleUpgradeRequest,
} from '@/lib/integration';
import { ethers } from 'ethers';
import { UserRole } from '../../../utils/userRole';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { API_URL } from '@/lib/config';

export default function CreateUser() {
  const [username, setUsername] = useState('');
  const [organization, setOrganization] = useState('');
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [signerAddress, setSignerAddress] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string>('');
  const [admins, setAdmins] = useState<string[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [files, setFiles] = useState<{
    license: File | null;
    id: File | null;
    proof: File | null;
  }>({
    license: null,
    id: null,
    proof: null,
  });

  // Dynamic total steps based on role
  const totalSteps = selectedRole === 'patient' ? 2 : 3;

  const getSteps = () => {
    if (selectedRole === 'patient') {
      return [
        { number: 1, title: 'Your Username' },
        { number: 2, title: 'Your Role' },
      ];
    } else {
      return [
        { number: 1, title: 'Your Username' },
        { number: 2, title: 'Your Role' },
        { number: 3, title: 'Share Your Info' },
      ];
    }
  };

  const steps = getSteps();

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const adminList = await getAdmins();
        setAdmins(adminList);
      } catch (error) {
        console.error('Failed to fetch admins', error);
      }
    };
    fetchAdmins();
  }, []);

  const handleSignUp = async () => {
    setErrorMessage('');
    if (!username) {
      setErrorMessage('Please fill in the username!');
      return false;
    }

    try {
      if (!window.ethereum) {
        setErrorMessage(
          'Ethereum provider not found. Please install MetaMask.'
        );
        return false;
      }

      const provider = new ethers.providers.Web3Provider(
        window.ethereum as ethers.providers.ExternalProvider
      );
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setSignerAddress(address);

      const network = await provider.getNetwork();
      if (network.chainId !== 11155111) {
        setErrorMessage('Please connect to the Sepolia network in MetaMask.');
        return false;
      }

      const response = await fetch(`${API_URL}/api/auth/signUp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: username,
          publicKey: address, // Add wallet address
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Signed up failed');
      }

      return true;
    } catch (error) {
      console.error('Sign up error:', error);
      if (error instanceof Error) {
        toast.error(error.message || 'An error occurred.');
      } else {
        toast.error('An error occurred.');
      }
      return false;
    }
  };

  useEffect(() => {
    if (!publicKey) {
      setErrorMessage('Please connect wallet');
      return;
    } else {
      setErrorMessage('');
    }
  }, [publicKey]);

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection('backward');
      setTimeout(() => setCurrentStep(currentStep - 1), 300);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setDirection('forward');
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    
    // Validate all required fields BEFORE calling handleSignUp
    try {
      // 1. Validate username
      if (!username || username.trim() === '') {
        setErrorMessage('Please fill in the username!');
        return;
      }

      // 2. Validate role selection
      if (!selectedRole) {
        setErrorMessage('Please select a role (Patient, Healthcare Provider, or Insurance Provider)!');
        return;
      }

      // 3. Validate wallet connection
      if (!window.ethereum) {
        setErrorMessage('Ethereum provider not found. Please install MetaMask.');
        return;
      }

      const provider = new ethers.providers.Web3Provider(
        window.ethereum as ethers.providers.ExternalProvider
      );
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setSignerAddress(address);

      const network = await provider.getNetwork();
      if (network.chainId !== 11155111) {
        setErrorMessage('Please connect to the Sepolia network in MetaMask.');
        return;
      }

      // 4. Validate role-specific requirements
      if (selectedRole === 'healthcare' || selectedRole === 'insurer') {
        // Validate documents
        if (!files.id || !files.license || !files.proof) {
          setErrorMessage('Please upload all required documents (ID, License, Proof).');
          return;
        }
        if (!files.id.name || !files.license.name || !files.proof.name) {
          setErrorMessage('One or more files are invalid. Please re-select the files.');
          return;
        }

        // Validate organization name
        if (!organization || organization.trim() === '') {
          setErrorMessage('Please enter Organization Name.');
          return;
        }

        // Validate doctor name for healthcare providers
        if (selectedRole === 'healthcare' && (!doctorName || doctorName.trim() === '')) {
          setErrorMessage('Please enter Doctor Name.');
          return;
        }

        // Validate admin selection
        if (selectedAdmin.length === 0) {
          setErrorMessage('Please select at least one admin to review your request.');
          return;
        }
      }
          const signUpSuccess = await handleSignUp();
          if (!signUpSuccess) return;

      // Proceed with blockchain registration
      const role = await getRole(address);

      if (role === UserRole.Unregistered) {
        setErrorMessage(
          'User role not found on blockchain. Processing registration...'
        );

        const alreadyExists = await userExists(address);

        if (alreadyExists) {
          throw new Error(
            'User already registered on blockchain. Please use a different wallet address.'
          );
        }

        if (selectedRole === 'patient') {
          const encryptedId = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(address)
          );
          await registerUser(address, encryptedId, 1);
          print('Blockchain Registration Successful!', 'success', () =>
            router.push('/')
          );
        } else {
          // Prepare Metadata
          let companyName = '';
          let finalDoctorName = '';

          if (selectedRole === 'insurance') {
            companyName = organization;
          } else if (selectedRole === 'healthcare') {
            finalDoctorName = doctorName;
          }


          // Get public keys for selected admins
          const selectedAdmins: string[] = [];
          const adminPublicKeys: string[] = [];

          for (const adminAddr of selectedAdmin) {
            try {
              const key = await getAdminPublicKey(adminAddr);
              if (key && key !== '0x') {
                selectedAdmins.push(adminAddr);
                adminPublicKeys.push(key);
              } else {
                throw new Error(
                  `Admin ${adminAddr.slice(0, 6)}...${adminAddr.slice(
                    -4
                  )} does not have a valid public key.`
                );
              }
            } catch (e) {
              console.error(`Error getting key for admin ${adminAddr}:`, e);
              throw new Error(
                `Failed to get public key for admin ${adminAddr.slice(
                  0,
                  6
                )}...${adminAddr.slice(-4)}. Please select a different admin.`
              );
            }
          }

          if (selectedAdmins.length === 0) {
            throw new Error(
              'No admins with valid public keys found. Cannot submit request.'
            );
          }

          // Submit Upgrade Request
          await submitRoleUpgradeRequest(
            address,
            { id: files.id!, license: files.license!, proof: files.proof! },
            {
              role: selectedRole,
              organization: organization,
              additionalInfo: additionalInfo,
              doctorName:
                selectedRole === 'healthcare' ? finalDoctorName : undefined,
            },
            selectedAdmins,
            adminPublicKeys,
            companyName,
            finalDoctorName
          );

          print('Registration Request Sent to Admins!', 'success', () =>
            router.push('/')
          );
        }
      } else {
        setErrorMessage('The wallet address has an existing account');
      }
    } catch (error: any) {
      console.error('Failed to register an account: ', error);
      toast.error(error.message || 'Registration failed');
    }
  };

  return (
    <div>
      <div className="min-h-screen flex items-center justify-center bg-gray-900 bg-dot-pattern relative px-4 sm:px-6 lg:px-8">
        <ToastContainer />
        <Connect
          onConnect={(account) => setPublicKey(account)}
          onError={(message) => setErrorMessage(message)}
        />
        <div className="bg-gray-800 mt-16 sm:mt-20 md:my-10 mx-2 sm:mx-4 md:mx-10 mb-4 sm:mb-10 rounded-lg shadow-lg w-full sm:w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 max-w-xl">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 bg-gray-700 rounded-2xl p-2">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`flex-1 flex items-center justify-center px-2 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 cursor-pointer ${
                  currentStep === step.number
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-400 hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm transition-all duration-300 flex-shrink-0 ${
                      currentStep === step.number
                        ? 'bg-white text-blue-500'
                        : 'bg-gray-600 text-gray-400'
                    }`}
                  >
                    {step.number}
                  </div>
                  <span className="font-medium text-xs sm:text-sm truncate">{step.title}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Form Content */}
          <div
            className="p-4 sm:p-6 md:p-8 relative overflow-hidden"
            style={{ minHeight: '400px' }}
          >
            {/* Step 1 - Username */}
            <div
              className={`absolute inset-0 px-8 transition-all duration-500 ease-in-out ${
                currentStep === 1
                  ? 'translate-x-0 opacity-100'
                  : direction === 'forward'
                  ? '-translate-x-full opacity-0'
                  : 'translate-x-full opacity-0'
              }`}
            >
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3 pt-3 sm:pt-5">
                  Welcome To MedChain
                </h2>
                <p className="text-sm sm:text-base text-gray-400">
                  To start utilizing MedChain please sign up with your personal
                  info
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    User Name*
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Step 2 - Role */}
            <div
              className={`absolute inset-0 px-8 transition-all duration-500 ease-in-out ${
                currentStep === 2
                  ? 'translate-x-0 opacity-100'
                  : direction === 'forward'
                  ? 'translate-x-full opacity-0'
                  : '-translate-x-full opacity-0'
              }`}
            >
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3 pt-3 sm:pt-5">
                  Select Your Role
                </h2>
                <p className="text-sm sm:text-base text-gray-400">
                  Choose the role that best describes you
                </p>
              </div>

              <div>
                <label className="text-white mb-2 sm:mb-3 block text-sm sm:text-base">
                  I want to register as:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition">
                    <input
                      type="radio"
                      name="role"
                      value="healthcare"
                      checked={selectedRole === 'healthcare'}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-white text-sm sm:text-base">
                      Healthcare Provider (Doctor/Nurse)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition">
                    <input
                      type="radio"
                      name="role"
                      value="insurance"
                      checked={selectedRole === 'insurance'}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-white text-sm sm:text-base">
                      Insurance Provider
                    </span>
                  </label>
                  <label className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition">
                    <input
                      type="radio"
                      name="role"
                      value="patient"
                      checked={selectedRole === 'patient'}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-white text-sm sm:text-base">
                      Patient
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Step 3 - Additional Info (Only for Healthcare/Insurer) */}
            {selectedRole !== 'patient' && (
              <div
                className={`absolute inset-0 px-8 transition-all duration-500 ease-in-out ${
                  currentStep === 3
                    ? 'translate-x-0 opacity-100'
                    : direction === 'forward'
                    ? 'translate-x-full opacity-0'
                    : '-translate-x-full opacity-0'
                }`}
              >
                <div className="text-center mb-6 sm:mb-8"> 
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3 pt-3 sm:pt-5">
                    Share Your Info
                  </h2>
                  <p className="text-sm sm:text-base text-gray-400">
                    Complete your profile with additional information
                  </p>
                </div>

                <div className="h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <h3 className="text-white font-semibold mb-3">
                      Verification Documents Required:
                    </h3>
                    <div className="space-y-3">
                      <FileUploadField
                        label="Medical License / Insurance License"
                        file={files.license}
                        onChange={(e) =>
                          setFiles({
                            ...files,
                            license: e.target.files?.[0] || null,
                          })
                        }
                        onRemove={() =>
                          setFiles({
                            ...files,
                            license: null,
                          })
                        }
                      />
                      <FileUploadField
                        label="Government ID"
                        file={files.id}
                        onChange={(e) =>
                          setFiles({
                            ...files,
                            id: e.target.files?.[0] || null,
                          })
                        }
                        onRemove={() =>
                          setFiles({
                            ...files,
                            id: null,
                          })
                        }
                      />
                      <FileUploadField
                        label="Proof of Practice/Organization"
                        file={files.proof}
                        onChange={(e) =>
                          setFiles({
                            ...files,
                            proof: e.target.files?.[0] || null,
                          })
                        }
                        onRemove={() =>
                          setFiles({
                            ...files,
                            proof: null,
                          })
                        }
                      />
                    </div>
                  </div>

                  {(selectedRole === 'insurance' ||
                    selectedRole === 'healthcare') && (
                    <div className="mt-4">
                      <label className="text-white mb-2 block text-sm sm:text-base">
                        Organization Name:{' '}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder={
                          selectedRole === 'insurance'
                            ? 'e.g., Medicare Insurance, Blue Cross'
                            : 'Hospital/Clinic/Organization name'
                        }
                        className="w-full p-2.5 sm:p-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <p className="text-gray-500 text-xs mt-1">
                        {selectedRole === 'insurance'
                          ? 'This will be your registered insurance company name'
                          : 'Organization information for the admin reviewer'}
                      </p>
                    </div>
                  )}
                  {selectedRole === 'healthcare' && (
                    <div className="mt-4">
                      <label className="text-white mb-2 block">
                        Doctor's Name: <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        placeholder="e.g., Dr. John Smith"
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <p className="text-gray-500 text-xs mt-1">
                        This will be your registered name as a healthcare
                        provider
                      </p>
                    </div>
                  )}

                  {/* Admin Selection */}
                  <div className="mt-4">
                    <label className="text-white mb-2 block">
                      Select Admin Reviewers:
                    </label>
                    <div className="space-y-2">
                      {admins.length === 0 ? (
                        <p className="text-gray-400">No admins available.</p>
                      ) : (
                        admins.map((adminAddr) => (
                          <label
                            key={adminAddr}
                            className="flex items-center gap-2 text-white"
                          >
                            <input
                              type="checkbox"
                              value={adminAddr}
                              checked={selectedAdmin.includes(adminAddr)}
                              onChange={(e) => {
                                const { checked, value } = e.target;
                                setSelectedAdmin((prev) =>
                                  checked
                                    ? [...prev, value]
                                    : prev.filter((a) => a !== value)
                                );
                              }}
                              className="w-4 h-4"
                            />
                            {adminAddr.slice(0, 6)}...{adminAddr.slice(-4)}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div>
                      <label className="text-white mb-2 block">
                        Additional Information:
                      </label>
                      <textarea
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                        placeholder="License number, years of practice, specialty..."
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center px-4 sm:px-6 md:px-8 py-4 sm:py-6 bg-gray-750 border-t border-gray-700">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-sm sm:text-base text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={() => handleNext()}
                className="flex items-center space-x-1 sm:space-x-2 px-4 sm:px-6 md:px-8 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r text-white rounded-lg font-medium hover:shadow-lg bg-blue-600 hover:bg-blue-700 transform hover:scale-105 transition-all"
              >
                <span>Next</span>
                <ChevronRight size={18} className="sm:w-5 sm:h-5" />
              </button>
            ) : (
              <button
                onClick={() => handleSubmit()}
                className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all"
              >
                <span className="hidden sm:inline">Create Account</span>
                <span className="sm:hidden">Create</span>
              </button>
            )}
          </div>
          {errorMessage && (
            <p className="text-red-400 text-center mt-2 text-sm sm:text-base px-4">{errorMessage}</p>
          )}
          <p className="mt-4 sm:mt-6 mb-4 sm:mb-6 text-center text-sm sm:text-base text-gray-400 px-4">
            Already have an account?{' '}
            <a href="/" className="text-blue-400 hover:underline">
              Login Now
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
    </div>
  );
}
