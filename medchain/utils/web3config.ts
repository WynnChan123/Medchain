import { createAppKit } from '@reown/appkit/react';
import { Ethers5Adapter } from '@reown/appkit-adapter-ethers5';
import { mainnet, arbitrum, hardhat } from '@reown/appkit/networks';
import { createConfig, http } from 'wagmi';

// Get projectId from https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error('Project ID is not defined');
}

// 2. Create a metadata object
const metadata = {
  name: 'MedChain',
  description: 'My Website description',
  url: 'http://localhost:3000/', // origin must match your domain & subdomain
  icons: ['https://avatars.mywebsite.com/'],
};

// 3. Create the AppKit instance
export const ethers5adapter = new Ethers5Adapter();

export const appKitConfig = createAppKit({
  adapters: [ethers5adapter],
  metadata: metadata,
  networks: [mainnet, arbitrum, hardhat],
  projectId,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
});

// 4. Create a valid wagmi config for WagmiProvider
export const wagmiConfig = createConfig({
  chains: [mainnet, arbitrum, hardhat],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [hardhat.id]: http(),
  },
});
