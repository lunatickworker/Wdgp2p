/**
 * 환경 설정 파일
 * 
 * 현재: 하드코딩된 값 사용 (Figma Make 환경)
 * 배포 시: import.meta.env를 통해 .env 파일에서 값을 읽도록 수정
 * 
 * 참고: /guidelines/env.md
 */

// 안전한 환경 변수 접근 헬퍼
const getEnv = (key: string, defaultValue: string = ''): string => {
  try {
    // import.meta.env가 존재하는지 확인
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key] || defaultValue;
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
};

// ============================================================
// Supabase 설정
// ============================================================
export const SUPABASE_CONFIG = {
  url: getEnv('VITE_SUPABASE_URL', 'https://mzoeeqmtvlnyonicycvg.supabase.co'),
  anonKey: getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b2VlcW10dmxueW9uaWN5Y3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MjIyNzcsImV4cCI6MjA3ODQ5ODI3N30.oo7FsWjthtBtM-Xa1VFJieMGQ4mG__V8w7r9qGBPzaI'),
  serviceRoleKey: getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b2VlcW10dmxueW9uaWN5Y3ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjkyMjI3NywiZXhwIjoyMDc4NDk4Mjc3fQ.iuQCG3bhprNIIcFi3e94EQATHvIzVw50Wmp_cFFhSsU'),
  // Backend API URL
  backendUrl: getEnv('VITE_BACKEND_URL', 'https://mzoeeqmtvlnyonicycvg.supabase.co/functions/v1/make-server-b6d5667f'),
};

// ============================================================
// Biconomy 기본 설정
// ============================================================
export const BICONOMY_CONFIG = {
  // Biconomy API Key (기존 API용)
  apiKey: getEnv('VITE_BICONOMY_API_KEY', 'mee_VPQhU1Xe7Xq3w9M59EvFab'),
  
  // Biconomy 프로젝트 ID (레거시 - Supertransaction에서는 미사용)
  projectId: getEnv('VITE_BICONOMY_PROJECT_ID', '738bf8e3-cfe4-41e4-92b6-a6534b0885ce'),
  
  // Private Key (서버 사이드에서만 사용 - 절대 클라이언트 노출 금지!)
  // 배포 시 주의: 이 값은 .env에만 저장하고 Git에 커밋하지 말것
  privateKey: getEnv('VITE_PRIVATE_KEY', '8c16f346aec8e07e81339fd866ac1b758427b408e40aa0d25470fb2e268d7ff7'),
  
  // 지원 네트워크
  networks: {
    ethereum: {
      chainId: 1,
      name: 'Ethereum Mainnet',
      rpcUrl: 'https://eth.llamarpc.com',
      blockExplorer: 'https://etherscan.io',
    },
    polygon: {
      chainId: 137,
      name: 'Polygon Mainnet',
      rpcUrl: 'https://polygon-rpc.com',
      blockExplorer: 'https://polygonscan.com',
    },
    base: {
      chainId: 8453,
      name: 'Base Mainnet',
      rpcUrl: 'https://mainnet.base.org',
      blockExplorer: 'https://basescan.org',
    },
    arbitrum: {
      chainId: 42161,
      name: 'Arbitrum One',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      blockExplorer: 'https://arbiscan.io',
    },
    optimism: {
      chainId: 10,
      name: 'Optimism',
      rpcUrl: 'https://mainnet.optimism.io',
      blockExplorer: 'https://optimistic.etherscan.io',
    },
    sepolia: {
      chainId: 11155111,
      name: 'Sepolia Testnet',
      rpcUrl: 'https://rpc.sepolia.org',
      blockExplorer: 'https://sepolia.etherscan.io',
    },
  },
  
  // 기본 네트워크 (Base 추천)
  defaultNetwork: 'base',
};

// ============================================================
// Biconomy 스마트 거래 API 설정 (Supertransaction)
// ============================================================
// 스마트 거래: 가스 추상화, 최적 경로 선택, 크로스체인 등을 자동 처리
export const SUPERTRANSACTION_CONFIG = {
  // API Key (https://supertransaction.biconomy.io 에서 발급)
  apiKey: getEnv('VITE_BICONOMY_SUPERTRANSACTION_API_KEY', 'mee_VPQhU1Xe7Xq3w9M59EvFab'),
  
  // API Base URL
  apiUrl: 'https://supertransaction.biconomy.io/api/v1',
  
  // 기본 체인 ID (Base 추천)
  defaultChainId: getEnv('VITE_DEFAULT_CHAIN_ID') ? parseInt(getEnv('VITE_DEFAULT_CHAIN_ID')) : 8453,
  
  // 가스비 스폰서십 활성화 (관리자가 가스비 부담)
  gasSponsorshipEnabled: getEnv('VITE_GAS_SPONSORSHIP_ENABLED') === 'true' || false,
  
  // 웹훅 URL (선택사항)
  webhookUrl: getEnv('VITE_WEBHOOK_URL', ''),
  
  // 지원되는 가스 토큰
  supportedGasTokens: ['USDT', 'USDC', 'DAI', 'ETH', 'MATIC'],
  
  // 기본 가스 토큰
  defaultGasToken: 'USDT',
};

// ============================================================
// 개발 모드 설정
// ============================================================
export const DEV_CONFIG = {
  // API 모킹 활성화 (실제 API 호출 없이 테스트)
  mockApi: getEnv('VITE_MOCK_API') === 'true' || false,
  
  // 디버그 모드
  debug: getEnv('VITE_DEBUG') === 'true' || false,
  
  // 로그 레벨
  logLevel: (getEnv('VITE_LOG_LEVEL') as 'error' | 'warn' | 'info' | 'debug') || 'info',
};

// ============================================================
// 애플리케이션 설정
// ============================================================
export const APP_CONFIG = {
  name: 'Crypto Wallet System',
  version: '1.0.0',
  
  // Biconomy 기능 활성화 여부
  features: {
    // 스마트 거래 API 사용 (Supertransaction)
    // - 가스 추상화: USDT, USDC 등으로 가스비 지불
    // - 트랜잭션 배칭: 여러 작업을 한 번에 처리
    // - 최적 경로 선택: 자동으로 최적 DEX/브릿지 선택
    // - 크로스체인: 여러 체인을 하나의 서명으로 처리
    supertransaction: true,
    
    // 크로스체인 지원 (스마트 거래에서 자동 처리)
    crossChain: true,
  },
  
  // 거래 설정
  transaction: {
    // 기본 슬리피지 허용 범위 (%)
    defaultSlippage: 0.5,
    
    // 최대 슬리피지 허용 범위 (%)
    maxSlippage: 5,
    
    // 트랜잭션 타임아웃 (초)
    timeout: 300,
    
    // 재시도 횟수
    maxRetries: 3,
  },
  
  // UI 설정
  ui: {
    // 통화 표시 형식
    currency: 'KRW',
    
    // 소수점 자리수
    decimalPlaces: 8,
    
    // 테마
    theme: 'dark',
  },
};

// ============================================================
// 지원되는 토큰 목록
// ============================================================
export const SUPPORTED_TOKENS = {
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    icon: '₿',
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    icon: 'Ξ',
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    icon: '₮',
    address: {
      ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      base: '0x...', // Base에 배포된 USDT 주소
    },
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    icon: '$',
    address: {
      ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
  },
  BNB: {
    symbol: 'BNB',
    name: 'BNB',
    decimals: 18,
    icon: '🔶',
  },
  KRWQ: {
    symbol: 'KRWQ',
    name: 'Korean Won Quantum',
    decimals: 18,
    icon: '₩',
    address: {
      base: '0x...', // KRWQ 컨트랙트 주소
    },
  },
} as const;

// ============================================================
// Chain ID 헬퍼
// ============================================================
export const CHAIN_IDS = {
  ETHEREUM: 1,
  POLYGON: 137,
  BASE: 8453,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  SEPOLIA: 11155111,
} as const;

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 체인 ID로 네트워크 정보 가져오기
 */
export function getNetworkByChainId(chainId: number) {
  return Object.values(BICONOMY_CONFIG.networks).find(
    network => network.chainId === chainId
  );
}

/**
 * 토큰 심볼로 토큰 정보 가져오기
 */
export function getTokenBySymbol(symbol: string) {
  return SUPPORTED_TOKENS[symbol as keyof typeof SUPPORTED_TOKENS];
}

/**
 * 환경이 개발 모드인지 확인
 */
export function isDevelopment() {
  try {
    return (typeof import.meta !== 'undefined' && import.meta.env?.DEV) || false;
  } catch {
    return false;
  }
}

/**
 * 환경이 프로덕션 모드인지 확인
 */
export function isProduction() {
  try {
    return (typeof import.meta !== 'undefined' && import.meta.env?.PROD) || false;
  } catch {
    return false;
  }
}

/**
 * 디버그 로그 출력 (디버그 모드일 때만)
 */
export function debugLog(...args: any[]) {
  if (DEV_CONFIG.debug) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * 에러 로그 출력
 */
export function errorLog(...args: any[]) {
  console.error('[ERROR]', ...args);
}

/**
 * 경고 로그 출력
 */
export function warnLog(...args: any[]) {
  if (DEV_CONFIG.logLevel !== 'error') {
    console.warn('[WARN]', ...args);
  }
}

// ============================================================
// 배포 체크리스트
// ============================================================
/*
배포 전 확인 사항:

1. .env 파일 생성 및 모든 환경 변수 설정
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_BICONOMY_API_KEY
   - VITE_BICONOMY_SUPERTRANSACTION_API_KEY
   - 등...

2. Private Key는 절대 Git에 커밋하지 말 것!
   - .gitignore에 .env 추가 확인

3. 프로덕션 모드에서는 디버그 모드 비활성화
   - VITE_DEBUG=false
   - VITE_MOCK_API=false

4. API Key 유효성 확인
   - Biconomy Dashboard에서 키 확인
   - Supabase Dashboard에서 키 확인

5. 네트워크 설정 확인
   - 메인넷 vs 테스트넷
   - RPC URL 정확성

6. 토큰 주소 확인
   - 각 체인별 토큰 컨트랙트 주소 업데이트
   - KRWQ 주소 반드시 업데이트

7. 가스비 설정 확인
   - 스폰서십 활성화 여부
   - 기본 가스 토큰 설정
*/