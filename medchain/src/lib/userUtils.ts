// userUtils.ts - Helper functions for user data management

interface UserProfile {
  name: string;
  email: string;
  publicKey: string;
}

// Cache to store wallet address to username mappings
const usernameCache = new Map<string, string>();

/**
 * Fetch username by wallet address from backend
 * Uses caching to minimize API calls
 */
export async function getUsernameByWallet(walletAddress: string): Promise<string> {
  // Check cache first
  if (usernameCache.has(walletAddress.toLowerCase())) {
    return usernameCache.get(walletAddress.toLowerCase())!;
  }

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return ''; // Return empty if no token
    }

    const response = await fetch(`http://localhost:8080/api/user/getByWallet/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch username for ${walletAddress}`);
      return '';
    }

    const data: UserProfile = await response.json();
    const username = data.name || '';
    
    // Cache the result
    usernameCache.set(walletAddress.toLowerCase(), username);
    
    return username;
  } catch (error) {
    console.error('Error fetching username:', error);
    return '';
  }
}

/**
 * Fetch multiple usernames in batch
 * More efficient than calling getUsernameByWallet multiple times
 */
export async function getUsernamesByWallets(walletAddresses: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  
  // Separate cached and uncached addresses
  const uncachedAddresses: string[] = [];
  
  for (const address of walletAddresses) {
    const lowerAddress = address.toLowerCase();
    if (usernameCache.has(lowerAddress)) {
      result.set(address, usernameCache.get(lowerAddress)!);
    } else {
      uncachedAddresses.push(address);
    }
  }

  // Fetch uncached addresses
  if (uncachedAddresses.length > 0) {
    await Promise.all(
      uncachedAddresses.map(async (address) => {
        const username = await getUsernameByWallet(address);
        result.set(address, username);
      })
    );
  }

  return result;
}

/**
 * Clear the username cache
 * Useful when switching accounts or after logout
 */
export function clearUsernameCache() {
  usernameCache.clear();
}

/**
 * Format wallet address with username if available
 * Returns: "Username (0x1234...5678)" or just "0x1234...5678" if no username
 */
export function formatAddressWithUsername(address: string, username?: string): string {
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  return username ? `${username} (${shortAddress})` : shortAddress;
}
