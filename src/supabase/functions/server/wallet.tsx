// 지갑 생성 및 관리 API
import { Hono } from "npm:hono";
import { createClient } from "jsr:@supabase/supabase-js@2";

const walletRouter = new Hono();

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// ===== 암호화/복호화 유틸리티 =====

const WALLET_ENCRYPTION_KEY = Deno.env.get('WALLET_ENCRYPTION_KEY') ?? 'default-encryption-key-please-change-in-production';

/**
 * AES-GCM 암호화
 */
async function encryptPrivateKey(privateKey: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(privateKey);
    
    // 256-bit key 생성
    const keyMaterial = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(WALLET_ENCRYPTION_KEY)
    );
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      'AES-GCM',
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // IV + 암호화된 데이터를 JSON으로 저장
    return JSON.stringify({
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    });
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Private key 암호화 실패');
  }
}

/**
 * AES-GCM 복호화
 */
async function decryptPrivateKey(encryptedData: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const { iv, data } = JSON.parse(encryptedData);
    
    // 256-bit key 생성
    const keyMaterial = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(WALLET_ENCRYPTION_KEY)
    );
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(data)
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Private key 복호화 실패');
  }
}

// ===== ethers.js v6 구현 (Deno 환경) =====

/**
 * 새로운 Ethereum 지갑 생성 (ethers.js 사용)
 */
async function createEthereumWallet(): Promise<{ address: string; privateKey: string }> {
  try {
    // ethers.js를 동적으로 import
    const { Wallet } = await import('npm:ethers@6.13.0');
    
    // 랜덤 지갑 생성
    const wallet = Wallet.createRandom();
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  } catch (error) {
    console.error('Ethereum 지갑 생성 실패:', error);
    throw new Error('Ethereum 지갑 생성에 실패했습니다');
  }
}

/**
 * 새로운 Tron 지갑 생성 (crypto 직접 사용)
 */
async function createTronWallet(): Promise<{ address: string; privateKey: string }> {
  try {
    console.log('🔑 Tron 지갑 생성 시작...');
    
    // secp256k1과 base58 라이브러리 import
    const { crypto } = await import('npm:@noble/hashes@1.3.3/crypto');
    const { keccak_256 } = await import('npm:@noble/hashes@1.3.3/sha3');
    const { secp256k1 } = await import('npm:@noble/curves@1.3.0/secp256k1');
    const bs58 = await import('npm:bs58@5.0.0');
    
    // 1. 랜덤 Private Key 생성 (32 bytes)
    const privateKeyBytes = secp256k1.utils.randomPrivateKey();
    const privateKeyHex = Array.from(privateKeyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // 2. Public Key 생성 (압축되지 않은 형식, 65 bytes)
    const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes, false);
    
    // 3. Public Key에서 주소 파생 (Tron은 Ethereum과 유사)
    // - Public Key의 마지막 64바이트 (첫 0x04 제외)
    const publicKeyHash = keccak_256(publicKeyBytes.slice(1));
    
    // 4. 마지막 20바이트 추출
    const addressBytes = publicKeyHash.slice(-20);
    
    // 5. Tron 주소는 0x41 prefix 추가
    const tronAddressBytes = new Uint8Array(21);
    tronAddressBytes[0] = 0x41; // Tron mainnet prefix
    tronAddressBytes.set(addressBytes, 1);
    
    // 6. Checksum 계산 (double SHA256)
    const sha256 = await import('npm:@noble/hashes@1.3.3/sha256');
    const hash1 = sha256.sha256(tronAddressBytes);
    const hash2 = sha256.sha256(hash1);
    const checksum = hash2.slice(0, 4);
    
    // 7. Base58 인코딩
    const addressWithChecksum = new Uint8Array(25);
    addressWithChecksum.set(tronAddressBytes, 0);
    addressWithChecksum.set(checksum, 21);
    
    const base58Address = bs58.default.encode(addressWithChecksum);
    
    console.log(`✅ Tron 주소 생성 완료: ${base58Address.substring(0, 10)}...`);
    
    return {
      address: base58Address,  // T로 시작하는 주소
      privateKey: privateKeyHex
    };
  } catch (error) {
    console.error('❌ Tron 지갑 생성 실패:', error);
    throw new Error(`Tron 지갑 생성에 실패했습니다: ${error.message}`);
  }
}

/**
 * 네트워크에 따라 적절한 지갑 생성
 */
async function createWalletByNetwork(network: string): Promise<{ address: string; privateKey: string }> {
  // null 또는 undefined 체크
  if (!network || typeof network !== 'string') {
    console.warn('⚠️ 네트워크 정보가 없습니다. Ethereum으로 기본 생성합니다.');
    return await createEthereumWallet();
  }
  
  const normalizedNetwork = network.toLowerCase();
  
  // Tron 네트워크인 경우
  if (normalizedNetwork.includes('tron') || normalizedNetwork.includes('trc')) {
    console.log(`🟢 Tron 네트워크 감지: "${network}"`);
    return await createTronWallet();
  }
  
  // 기본값: Ethereum 계열 (EVM)
  console.log(`🔵 EVM 네트워크 감지: "${network}"`);
  return await createEthereumWallet();
}

/**
 * coin_type으로 네트워크를 조회하여 적절한 지갑 생성
 */
async function createWalletByCoinType(coinType: string): Promise<{ address: string; privateKey: string }> {
  try {
    console.log(`🔍 [${coinType}] supported_tokens 테이블에서 네트워크 조회 중...`);
    
    // 1. supported_tokens 테이블에서 네트워크 조회
    const { data: tokenData, error } = await supabase
      .from('supported_tokens')
      .select('network, symbol, name')
      .eq('symbol', coinType)
      .single();

    if (error) {
      console.error(`❌ [${coinType}] DB 조회 에러:`, error);
      console.warn(`⚠️ [${coinType}] 네트워크 정보를 찾을 수 없습니다. Ethereum으로 기본 생성합니다.`);
      return await createEthereumWallet();
    }

    if (!tokenData) {
      console.warn(`⚠️ [${coinType}] supported_tokens 테이블에 데이터가 없습니다. Ethereum으로 기본 생성합니다.`);
      return await createEthereumWallet();
    }

    const network = tokenData.network;
    console.log(`📡 [${coinType}] 네트워크: "${network}" (${tokenData.name})`);

    // 2. 네트워크에 따라 지갑 생성
    const walletResult = await createWalletByNetwork(network);
    console.log(`✅ [${coinType}] ${network} 지갑 생성 완료: ${walletResult.address.substring(0, 10)}...`);
    
    return walletResult;
  } catch (error) {
    console.error(`❌ [${coinType}] 네트워크 조회 중 예외 발생:`, error);
    // 실패 시 기본값으로 Ethereum 지갑 생성
    console.warn(`⚠️ [${coinType}] 예외 발생으로 인해 Ethereum으로 기본 생성합니다.`);
    return await createEthereumWallet();
  }
}

/**
 * 기존 호환성을 위한 함수 (deprecated)
 */
async function createWallet(): Promise<{ address: string; privateKey: string }> {
  return await createEthereumWallet();
}

/**
 * Private Key에서 Ethereum 주소 파생 (ethers.js 사용)
 * 더 이상 사용되지 않지만 호환성을 위해 유지
 */
async function deriveAddressFromPrivateKey(privateKey: string): Promise<string> {
  try {
    const { Wallet } = await import('npm:ethers@6.13.0');
    const wallet = new Wallet(privateKey);
    return wallet.address;
  } catch (error) {
    console.error('주소 파생 실패:', error);
    throw new Error('Ethereum 주소 파생에 실패했습니다');
  }
}

// ===== API 엔드포인트 =====

/**
 * POST /wallet/create
 * 새로운 지갑 생성
 */
walletRouter.post('/create', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, coin_type, wallet_type = 'hot' } = body;

    if (!user_id || !coin_type) {
      return c.json({ 
        success: false, 
        error: 'user_id와 coin_type은 필수입니다' 
      }, 400);
    }

    // 1. 지갑 생성
    console.log(`🔐 ${coin_type} 지갑 생성 시작...`);
    const { address, privateKey } = await createWalletByCoinType(coin_type);
    const resolvedAddress = typeof address === 'string' 
      ? address 
      : await address;

    // 2. Private Key 암호화
    console.log('🔒 Private Key 암호화 중...');
    const encryptedPrivateKey = await encryptPrivateKey(privateKey);

    // 3. DB 저장
    console.log('💾 DB 저장 중...');
    const { data: walletData, error: insertError } = await supabase
      .from('wallets')
      .insert({
        user_id,
        coin_type,
        address: resolvedAddress,
        encrypted_private_key: encryptedPrivateKey,
        wallet_type,
        balance: 0,
        status: 'active'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ DB 저장 실패:', insertError);
      throw insertError;
    }

    console.log(`✅ ${coin_type} 지갑 생성 완료: ${resolvedAddress}`);

    // 4. 응답 (Private Key는 절대 반환하지 않음!)
    return c.json({
      success: true,
      wallet: {
        wallet_id: walletData.wallet_id,
        address: walletData.address,
        coin_type: walletData.coin_type,
        wallet_type: walletData.wallet_type
      }
    });
  } catch (error: any) {
    console.error('❌ 지갑 생성 실패:', error);
    return c.json({
      success: false,
      error: error.message || '지갑 생성에 실패했습니다'
    }, 500);
  }
});

/**
 * POST /wallet/create-batch
 * 여러 코인 지갑을 한 번에 생성
 */
walletRouter.post('/create-batch', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, coin_types, wallet_type = 'hot' } = body;

    if (!user_id || !Array.isArray(coin_types) || coin_types.length === 0) {
      return c.json({ 
        success: false, 
        error: 'user_id와 coin_types 배열이 필요합니다' 
      }, 400);
    }

    console.log(`🔐 ${coin_types.length}개 지갑 일괄 생성 시작...`);
    const wallets = [];
    const errors = [];

    for (const coin_type of coin_types) {
      try {
        // 1. 지갑 생성
        const { address, privateKey } = await createWalletByCoinType(coin_type);
        const resolvedAddress = typeof address === 'string' 
          ? address 
          : await address;

        // 2. Private Key 암호화
        const encryptedPrivateKey = await encryptPrivateKey(privateKey);

        // 3. DB 저장
        const { data: walletData, error: insertError } = await supabase
          .from('wallets')
          .insert({
            user_id,
            coin_type,
            address: resolvedAddress,
            encrypted_private_key: encryptedPrivateKey,
            wallet_type,
            balance: 0,
            status: 'active'
          })
          .select()
          .single();

        if (insertError) throw insertError;

        wallets.push({
          wallet_id: walletData.wallet_id,
          address: walletData.address,
          coin_type: walletData.coin_type
        });

        console.log(`✅ ${coin_type} 지갑 생성: ${resolvedAddress}`);
      } catch (error: any) {
        console.error(`❌ ${coin_type} 지갑 생성 실패:`, error);
        errors.push({ coin_type, error: error.message });
      }
    }

    console.log(`✅ 일괄 생성 완료: ${wallets.length}/${coin_types.length}개 성공`);

    return c.json({
      success: true,
      wallets,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: coin_types.length,
        succeeded: wallets.length,
        failed: errors.length
      }
    });
  } catch (error: any) {
    console.error('❌ 일괄 생성 실패:', error);
    return c.json({
      success: false,
      error: error.message || '일괄 생성에 실패했습니다'
    }, 500);
  }
});

/**
 * POST /wallet/decrypt-key
 * Private Key 복호화 (내부 사용 전용 - 매우 주의!)
 */
walletRouter.post('/decrypt-key', async (c) => {
  try {
    const body = await c.req.json();
    const { wallet_id } = body;

    if (!wallet_id) {
      return c.json({ 
        success: false, 
        error: 'wallet_id가 필요합니다' 
      }, 400);
    }

    // 1. 지갑 조회
    const { data: walletData, error } = await supabase
      .from('wallets')
      .select('encrypted_private_key, address, coin_type')
      .eq('wallet_id', wallet_id)
      .single();

    if (error || !walletData) {
      return c.json({ 
        success: false, 
        error: '지갑을 찾을 수 없습니다' 
      }, 404);
    }

    if (!walletData.encrypted_private_key) {
      return c.json({ 
        success: false, 
        error: 'Private Key가 없습니다' 
      }, 404);
    }

    // 2. Private Key 복호화
    const privateKey = await decryptPrivateKey(walletData.encrypted_private_key);

    return c.json({
      success: true,
      privateKey, // ⚠️ 매우 민감한 데이터!
      address: walletData.address,
      coin_type: walletData.coin_type
    });
  } catch (error: any) {
    console.error('❌ Private Key 복호화 실패:', error);
    return c.json({
      success: false,
      error: error.message || 'Private Key 복호화에 실패했습니다'
    }, 500);
  }
});

export default walletRouter;