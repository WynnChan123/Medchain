import axios from 'axios';
import { blockchainConfig } from '../config/blockchain.config.js';

const abiCache = new Map();


export async function fetchContractABI(contractAddress) {
  try {
    if (abiCache.has(contractAddress)) {
      console.log("✅ Returning ABI from cache for", contractAddress);
      return abiCache.get(contractAddress);
    }

    const response = await axios.get(blockchainConfig.ETHERSCAN_BASE_URL, {
      params: {
        chainid: blockchainConfig.chainId,  
        module: 'contract',
        action: 'getabi',
        address: contractAddress,
        apikey: blockchainConfig.etherscanKey,
      },
    });
    
    if (response.data.status !== '1') {
      throw new Error(`Etherscan API error: ${response.data.result}`);
    }
    const abi = JSON.parse(response.data.result);
    abiCache.set(contractAddress, abi);
    console.log("✅ Fetched and cached ABI for", contractAddress);
    return abi;

  } catch (error) {
    console.error('Error fetching contract ABI:', error);
    throw error;
  }
}

// Example usage:
// (async () => {
//   const abi = await fetchContractABI('0xYourContractAddressHere');
//   console.log(abi);
// })();