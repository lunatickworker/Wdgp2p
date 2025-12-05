/**
 * Web3 Mock Utilities
 * Figma Make 환경에서 ethers 패키지 로드 실패 시 사용할 모킹 함수들
 */

export const mockProvider = {
  getNetwork: async () => ({ chainId: 8453, name: 'base' }),
  getSigner: () => mockSigner,
  listAccounts: async () => [],
  send: async (method: string, params: any[]) => {
    console.log('[Mock Provider]', method, params);
    return null;
  },
};

export const mockSigner = {
  getAddress: async () => '0x0000000000000000000000000000000000000000',
  signMessage: async (message: string) => {
    console.log('[Mock Signer] Signing:', message);
    return '0xmocksignature';
  },
  getChainId: async () => 8453,
};

/**
 * 안전한 ethers import
 * ethers 패키지 로드 실패 시 mock 객체 반환
 */
export async function safeImportEthers() {
  try {
    const ethers = await import('ethers');
    return ethers;
  } catch (error) {
    console.warn('[Web3 Mock] ethers 패키지 로드 실패, mock 사용:', error);
    return {
      ethers: {
        providers: {
          Web3Provider: class MockWeb3Provider {
            constructor() {}
            getSigner() { return mockSigner; }
            getNetwork() { return Promise.resolve({ chainId: 8453 }); }
            listAccounts() { return Promise.resolve([]); }
          },
        },
        utils: {
          parseUnits: (value: string, decimals: number) => value,
          formatUnits: (value: string, decimals: number) => value,
          parseEther: (value: string) => value,
          formatEther: (value: string) => value,
        },
      },
    };
  }
}

/**
 * MetaMask 연결 가능 여부 확인
 */
export function isMetaMaskAvailable(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
}

/**
 * 체인 ID 가져오기 (MetaMask에서)
 */
export async function getChainId(): Promise<number | null> {
  if (!isMetaMaskAvailable()) return null;
  
  try {
    const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16);
  } catch (error) {
    console.error('[Web3] Chain ID 가져오기 실패:', error);
    return null;
  }
}

/**
 * 계정 주소 가져오기 (MetaMask에서)
 */
export async function getAccounts(): Promise<string[]> {
  if (!isMetaMaskAvailable()) return [];
  
  try {
    const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
    return accounts;
  } catch (error) {
    console.error('[Web3] 계정 가져오기 실패:', error);
    return [];
  }
}

/**
 * 메시지 서명 (MetaMask 직접 호출)
 */
export async function signMessage(message: string, address: string): Promise<string> {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask가 설치되지 않았습니다');
  }
  
  try {
    const signature = await (window as any).ethereum.request({
      method: 'personal_sign',
      params: [message, address],
    });
    return signature;
  } catch (error) {
    console.error('[Web3] 서명 실패:', error);
    throw error;
  }
}
