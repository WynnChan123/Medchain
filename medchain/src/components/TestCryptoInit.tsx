'use client';

import { useEffect } from 'react';

export default function TestCryptoInit() {
  useEffect(() => {
    // Dynamically import the test script to ensure it runs on the client
    import('../test-crypto').then(() => {
    }).catch(err => {
      console.error("Failed to load Test Crypto System:", err);
    });
  }, []);

  return null;
}
