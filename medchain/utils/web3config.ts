import {cookieStorage, createStorage, http} from "@wagmi/core";
import {WagmiAdapter} from "@reown/appkit-adapter-wagmi";
import {mainnet, arbitrum, hardhat} from "@reown/appkit/networks";

export const sepolia = {
    id: 11155111,
    name: "Sepolia",
    network: "sepolia",
    nativeCurrency: {
        name: "Sepolia Ether",
        symbol: "ETH",
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ["https://rpc.sepolia.org"],
        },
    },
    blockExplorers: {
        default: {
            name: "Etherscan",
            url: "https://sepolia.etherscan.io",
        },
    },
    contracts: {
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11' as const,
        },
    },
    testnet: true,
} as const;

// Get projectId from https://cloud.reown.com
if (!process.env.NEXT_PUBLIC_PROJECT_ID) {
  throw new Error("NEXT_PUBLIC_PROJECT_ID is not set");
}
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
    throw new Error("Project ID is not defined");
}

// Include Sepolia so AppKit & Wagmi know about the testnet we are using
export const networks = [sepolia, mainnet, arbitrum, hardhat];

export const wagmiAdapter = new WagmiAdapter({
    storage: createStorage({
        storage: cookieStorage,
    }),
    ssr: true,
    projectId,
    networks,
});

export const config = wagmiAdapter.wagmiConfig;