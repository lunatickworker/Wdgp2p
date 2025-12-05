import { supabase } from '../supabase/client';

export interface CreateStoreRequest {
  centerId: string; // 상위 센터 ID
  storeName: string;
  storeCode: string; // 가맹점 고유 코드
  username: string;
  email: string;
  password: string;
}

export interface CreateStoreResponse {
  success: boolean;
  storeId?: string;
  error?: string;
}

/**
 * 가맹점 생성 API
 * tenant_id를 상위 센터로부터 상속받습니다
 */
export async function createStore(
  request: CreateStoreRequest
): Promise<CreateStoreResponse> {
  try {
    const { centerId, storeName, storeCode, username, email, password } = request;
    
    // 1. 센터 존재 확인 및 tenant_id 조회
    const { data: center, error: centerError } = await supabase
      .from('users')
      .select('user_id, tenant_id, role')
      .eq('user_id', centerId)
      .eq('role', 'center')
      .maybeSingle();
    
    if (centerError || !center) {
      return {
        success: false,
        error: '센터를 찾을 수 없습니다'
      };
    }
    
    // 2. storeCode 중복 확인 (같은 tenant 내에서)
    const { data: existingStore } = await supabase
      .from('users')
      .select('user_id')
      .eq('store_code', storeCode)
      .eq('tenant_id', center.tenant_id)
      .maybeSingle();
    
    if (existingStore) {
      return {
        success: false,
        error: '이미 사용 중인 가맹점 코드입니다'
      };
    }
    
    // 3. username 중복 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('username', username)
      .maybeSingle();
    
    if (existingUser) {
      return {
        success: false,
        error: '이미 사용 중인 사용자명입니다'
      };
    }
    
    // 4. 비밀번호 해싱 (실제로는 Edge Function에서 처리)
    const passwordHash = password; // TODO: Edge Function에서 bcrypt 처리
    
    // 5. 가맹점 생성
    const storeId = crypto.randomUUID();
    
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        user_id: storeId,
        role: 'store',
        tenant_id: center.tenant_id, // 센터의 tenant_id 상속
        parent_id: centerId, // 상위 센터 ID
        username,
        email,
        password_hash: passwordHash,
        store_name: storeName,
        store_code: storeCode,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      return {
        success: false,
        error: insertError.message
      };
    }
    
    return {
      success: true,
      storeId
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '가맹점 생성 실패'
    };
  }
}
