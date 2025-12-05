import { supabase } from '../supabase/client';

export interface CreateUserRequest {
  centerId: string; // 또는 storeId
  parentId: string; // 센터 또는 가맹점 ID
  parentType: 'center' | 'store';
  username: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export interface CreateUserResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * 회원 생성 API
 * tenant_id를 상위 엔티티(센터 또는 가맹점)로부터 상속받습니다
 */
export async function createUser(
  request: CreateUserRequest
): Promise<CreateUserResponse> {
  try {
    const { parentId, parentType, username, email, password, phoneNumber } = request;
    
    // 1. 상위 엔티티(센터 또는 가맹점) 조회
    const { data: parent, error: parentError } = await supabase
      .from('users')
      .select('user_id, tenant_id, role')
      .eq('user_id', parentId)
      .eq('role', parentType)
      .maybeSingle();
    
    if (parentError || !parent) {
      return {
        success: false,
        error: `${parentType === 'center' ? '센터' : '가맹점'}를 찾을 수 없습니다`
      };
    }
    
    // 2. username 중복 확인 (같은 tenant 내에서)
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('username', username)
      .eq('tenant_id', parent.tenant_id)
      .maybeSingle();
    
    if (existingUser) {
      return {
        success: false,
        error: '이미 사용 중인 사용자명입니다'
      };
    }
    
    // 3. 비밀번호 해싱 (실제로는 Edge Function에서 처리)
    const passwordHash = password; // TODO: Edge Function에서 bcrypt 처리
    
    // 4. 회원 생성
    const userId = crypto.randomUUID();
    
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        user_id: userId,
        role: 'user',
        tenant_id: parent.tenant_id, // 상위의 tenant_id 상속
        parent_id: parentId,
        username,
        email,
        password_hash: passwordHash,
        phone_number: phoneNumber,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      return {
        success: false,
        error: insertError.message
      };
    }
    
    // 5. Wallet 자동 생성 (tenant_id 포함)
    await supabase
      .from('wallets')
      .insert({
        wallet_id: crypto.randomUUID(),
        user_id: userId,
        tenant_id: parent.tenant_id, // 같은 tenant_id
        coin_type: 'KRWQ',
        balance: 0,
        address: `0x${crypto.randomUUID().replace(/-/g, '')}`, // 임시 주소
        status: 'active'
      });
    
    return {
      success: true,
      userId
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '회원 생성 실패'
    };
  }
}
