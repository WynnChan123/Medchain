declare global {
  interface EthereumProvider {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    // add other properties if needed
  }

  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};