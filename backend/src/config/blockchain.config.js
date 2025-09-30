import 'dotenv/config';

export const blockchainConfig = {
  ETHERSCAN_BASE_URL: "https://api.etherscan.io/v2/api",
  etherscanKey: process.env.ETHERSCAN_API_KEY || '',
  chainId: process.env.BLOCKCHAIN_CHAIN_ID
}