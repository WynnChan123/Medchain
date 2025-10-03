"use client";

import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config, projectId, wagmiAdapter } from "../../utils/web3config";
import { createAppKit } from "@reown/appkit/react";
import {mainnet, arbitrum, hardhat} from "@reown/appkit/networks";
import { sepolia } from "../../utils/web3config";

const queryClient = new QueryClient();

createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [sepolia, mainnet, arbitrum, hardhat],
    defaultNetwork: sepolia,
    features: {
        analytics: true,
    },
});

export default function AppKitContextProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
} 