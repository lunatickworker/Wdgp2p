/**
 * 실시간 환율 API 유틸리티
 * ExchangeRate-API 무료 플랜 사용 (1,500 requests/month)
 */

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
}

const CACHE_KEY = 'usd_to_krw_rate';
const CACHE_DURATION = 60 * 60 * 1000; // 1시간 (밀리초)
const FALLBACK_RATE = 1300; // API 실패 시 기본값

/**
 * 캐시된 환율 가져오기
 */
function getCachedRate(): ExchangeRateCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: ExchangeRateCache = JSON.parse(cached);
    const now = Date.now();

    // 캐시가 1시간 이내면 사용
    if (now - data.timestamp < CACHE_DURATION) {
      return data;
    }

    return null;
  } catch (error) {
    console.error('Error reading cached exchange rate:', error);
    return null;
  }
}

/**
 * 환율 캐시에 저장
 */
function setCachedRate(rate: number): void {
  try {
    const data: ExchangeRateCache = {
      rate,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error caching exchange rate:', error);
  }
}

/**
 * API에서 최신 환율 가져오기
 */
async function fetchExchangeRate(): Promise<number> {
  try {
    // ExchangeRate-API 무료 엔드포인트 (API Key 불필요)
    const response = await fetch('https://open.exchangerate-api.com/v6/latest/USD');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.rates && data.rates.KRW) {
      const rate = Number(data.rates.KRW);
      console.log('✅ Exchange rate fetched:', rate, 'KRW/USD');
      return rate;
    }

    throw new Error('Invalid API response format');
  } catch (error) {
    console.error('❌ Failed to fetch exchange rate:', error);
    throw error;
  }
}

/**
 * USD to KRW 환율 가져오기 (캐시 우선, 없으면 API 호출)
 */
export async function getUsdToKrwRate(): Promise<number> {
  // 1. 캐시 확인
  const cached = getCachedRate();
  if (cached) {
    console.log('✅ Using cached exchange rate:', cached.rate, 'KRW/USD');
    return cached.rate;
  }

  // 2. API 호출
  try {
    const rate = await fetchExchangeRate();
    setCachedRate(rate);
    return rate;
  } catch (error) {
    // 3. 실패 시 fallback 값 사용
    console.warn('⚠️ Using fallback exchange rate:', FALLBACK_RATE, 'KRW/USD');
    return FALLBACK_RATE;
  }
}

/**
 * 환율 캐시 강제 새로고침
 */
export async function refreshExchangeRate(): Promise<number> {
  try {
    const rate = await fetchExchangeRate();
    setCachedRate(rate);
    return rate;
  } catch (error) {
    console.error('Failed to refresh exchange rate:', error);
    return FALLBACK_RATE;
  }
}

/**
 * USD 금액을 KRW로 변환
 */
export async function convertUsdToKrw(usdAmount: number): Promise<number> {
  const rate = await getUsdToKrwRate();
  return usdAmount * rate;
}

/**
 * 현재 캐시된 환율 정보 가져오기 (디버깅용)
 */
export function getExchangeRateInfo(): { rate: number; cached: boolean; age: number } | null {
  const cached = getCachedRate();
  if (!cached) return null;

  return {
    rate: cached.rate,
    cached: true,
    age: Date.now() - cached.timestamp
  };
}
