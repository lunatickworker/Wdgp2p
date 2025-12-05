import { CoinType } from '../App';
import { supabase } from '../../utils/supabase/client';

// 가격 캐시 (메모리에 저장)
let priceCache: Record<string, number> = {};
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30초

export const getCoinRate = async (coin: CoinType): Promise<number> => {
  // 캐시가 유효한 경우 캐시에서 반환
  if (Date.now() - lastFetchTime < CACHE_DURATION && priceCache[coin]) {
    return priceCache[coin];
  }

  // 데이터베이스에서 가격 가져오기
  const { data } = await supabase
    .from('supported_tokens')
    .select('symbol, price_usd')
    .eq('symbol', coin)
    .single();

  if (data && data.price_usd) {
    // USD 가격을 원화로 변환 (1 USD = 1350 KRW 가정)
    const krwPrice = data.price_usd * 1350;
    priceCache[coin] = krwPrice;
    lastFetchTime = Date.now();
    return krwPrice;
  }

  // 데이터가 없으면 0 반환
  return 0;
};

// 동기 버전 (기존 코드와의 호환성을 위해)
export const getCoinRateSync = (coin: CoinType): number => {
  // 캐시에서 반환
  return priceCache[coin] || 0;
};

// 모든 가격 미리 로드
export const preloadCoinRates = async () => {
  const { data } = await supabase
    .from('supported_tokens')
    .select('symbol, price_usd');

  if (data) {
    data.forEach((token: any) => {
      priceCache[token.symbol] = (token.price_usd || 0) * 1350;
    });
    lastFetchTime = Date.now();
  }
};
