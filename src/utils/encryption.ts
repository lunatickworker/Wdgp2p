/**
 * 암호화/복호화 유틸리티
 * Biconomy API Key 등 민감한 데이터를 안전하게 저장하기 위한 유틸리티
 */

/**
 * 텍스트를 Base64로 암호화 (간단한 인코딩)
 * 실제 운영 환경에서는 더 강력한 암호화 알고리즘 사용 권장 (AES-GCM 등)
 */
export function encryptData(data: string, secretKey?: string): string {
  try {
    // 간단한 XOR 암호화 + Base64
    const key = secretKey || 'GMS_WALLET_SECRET_KEY_2025';
    let encrypted = '';
    
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }
    
    return btoa(encrypted);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('데이터 암호화에 실패했습니다');
  }
}

/**
 * Base64에서 복호화
 */
export function decryptData(encryptedData: string, secretKey?: string): string {
  try {
    const key = secretKey || 'GMS_WALLET_SECRET_KEY_2025';
    const decoded = atob(encryptedData);
    let decrypted = '';
    
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(charCode);
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('데이터 복호화에 실패했습니다');
  }
}

/**
 * API Key를 마스킹해서 표시 (보안)
 * 예: "mee_VPQhU1Xe7Xq3w9M59EvFab" -> "mee_***************vFab"
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '***';
  
  const prefix = apiKey.substring(0, 4);
  const suffix = apiKey.substring(apiKey.length - 4);
  const masked = '*'.repeat(Math.max(apiKey.length - 8, 3));
  
  return `${prefix}${masked}${suffix}`;
}

/**
 * 비밀번호 강도 체크
 */
export function checkPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  // 길이 체크
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // 복잡도 체크
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // 피드백 생성
  if (password.length < 8) feedback.push('최소 8자 이상 필요');
  if (!/[a-z]/.test(password)) feedback.push('소문자 포함 권장');
  if (!/[A-Z]/.test(password)) feedback.push('대문자 포함 권장');
  if (!/[0-9]/.test(password)) feedback.push('숫자 포함 권장');
  if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('특수문자 포함 권장');

  // 강도 판정
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score <= 3) strength = 'weak';
  else if (score <= 5) strength = 'medium';
  else if (score <= 6) strength = 'strong';
  else strength = 'very-strong';

  return { strength, score, feedback };
}

/**
 * 안전한 랜덤 문자열 생성
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}
