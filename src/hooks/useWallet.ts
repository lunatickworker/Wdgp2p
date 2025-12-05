import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { BICONOMY_CONFIG, CHAIN_IDS, getNetworkByChainId, debugLog, errorLog } from '../utils/config';
import { supabase } from '../utils/supabase/client';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const useWallet = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    checkConnection();
    
    // 계정 변경 감지
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAddress(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const signer = provider.getSigner();
          const network = await provider.getNetwork();
          
          setProvider(provider);
          setSigner(signer);
          setAddress(accounts[0]);
          setChainId(network.chainId);
        }
      } catch (err: any) {
        console.error('Check connection error:', err);
      }
    }
  };

  const connect = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask가 설치되지 않았습니다. MetaMask를 설치해주세요.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      
      setProvider(provider);
      setSigner(signer);
      setAddress(address);
      setChainId(network.chainId);

      // Supabase에 지갑 주소 업데이트 (선택적)
      // 사용자가 이미 로그인되어 있다면 지갑 주소를 연결
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('users')
          .update({ 
            wallet_address: address,
            last_login: new Date().toISOString() 
          })
          .eq('user_id', user.id);
      }

      // Base 체인으로 전환 (chainId: 8453)
      const expectedChainId = 8453; // Base Mainnet
      if (network.chainId !== expectedChainId) {
        await switchNetwork(expectedChainId);
      }
    } catch (err: any) {
      setError(err.message || '지갑 연결에 실패했습니다.');
      console.error('Connect error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  };

  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) return;

    const chainConfigs: { [key: number]: any } = {
      8453: { // Base Mainnet
        chainId: ethers.utils.hexValue(8453),
        chainName: 'Base',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org']
      },
      84532: { // Base Sepolia Testnet
        chainId: ethers.utils.hexValue(84532),
        chainName: 'Base Sepolia',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://sepolia.base.org'],
        blockExplorerUrls: ['https://sepolia.basescan.org']
      },
      137: { // Polygon Mainnet
        chainId: ethers.utils.hexValue(137),
        chainName: 'Polygon Mainnet',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com'],
        blockExplorerUrls: ['https://polygonscan.com']
      }
    };

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ethers.utils.hexValue(targetChainId) }],
      });
    } catch (err: any) {
      // 체인이 등록되지 않은 경우 추가
      if (err.code === 4902) {
        const config = chainConfigs[targetChainId];
        if (config) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [config]
          });
        }
      } else {
        throw err;
      }
    }
  };

  const getBalance = async (tokenAddress?: string): Promise<string> => {
    if (!provider || !address) return '0';

    try {
      if (tokenAddress) {
        // ERC-20 토큰 잔액 조회
        const abi = ['function balanceOf(address) view returns (uint256)'];
        const contract = new ethers.Contract(tokenAddress, abi, provider);
        const balance = await contract.balanceOf(address);
        return ethers.utils.formatEther(balance);
      } else {
        // 네이티브 토큰 잔액 조회
        const balance = await provider.getBalance(address);
        return ethers.utils.formatEther(balance);
      }
    } catch (err) {
      console.error('Get balance error:', err);
      return '0';
    }
  };

  return {
    address,
    provider,
    signer,
    isConnecting,
    error,
    chainId,
    connect,
    disconnect,
    switchNetwork,
    getBalance,
    isConnected: !!address
  };
};