/**
 * 환경 감지 및 설정
 */

// Figma Make 환경인지 확인
export function isFigmaMake(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.includes('figma');
}

// 개발 환경인지 확인
export function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

// 프로덕션 환경인지 확인
export function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

// Web3 기능 사용 가능 여부
export function isWeb3Available(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
}

// 디버그 로그 출력
export function debugLog(...args: any[]) {
  if (isDev() || isFigmaMake()) {
    console.log('[DEBUG]', ...args);
  }
}

// 에러 로그 출력
export function errorLog(...args: any[]) {
  console.error('[ERROR]', ...args);
}

// 경고 로그 출력
export function warnLog(...args: any[]) {
  console.warn('[WARN]', ...args);
}
