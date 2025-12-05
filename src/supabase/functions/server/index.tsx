import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import walletRouter from "./wallet.tsx";
import transactionRouter from "./transaction.tsx";

const app = new Hono();

// Supabase client with service role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// =====================================================
// OAuth Token 관리 유틸리티
// =====================================================

interface OAuthToken {
  access_token: string;
  expires_at: string;
}

/**
 * OAuth 토큰 발급 (client_credentials grant)
 */
async function getOAuthToken(): Promise<string> {
  try {
    // 1. DB에서 기존 토큰 확인
    const { data: existingToken, error: fetchError } = await supabase
      .from('oauth_tokens')
      .select('access_token, expires_at')
      .eq('service_name', 'account_verification')
      .single();

    // 토큰이 있고 만료되지 않았으면 재사용
    if (existingToken && !fetchError) {
      const expiresAt = new Date(existingToken.expires_at);
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      // 만료 1시간 전이면 재사용
      if (expiresAt > oneHourFromNow) {
        console.log('✅ Using existing OAuth token');
        return existingToken.access_token;
      }
    }

    // 2. 새 토큰 발급
    console.log('🔑 Requesting new OAuth token...');
    const clientId = Deno.env.get('code_client_id');
    const clientSecret = Deno.env.get('code_client_secret');
    const tokenEndpoint = Deno.env.get('code_token_endpoint');

    if (!clientId || !clientSecret || !tokenEndpoint) {
      console.error('❌ Missing OAuth credentials:', { 
        hasClientId: !!clientId, 
        hasClientSecret: !!clientSecret, 
        hasTokenEndpoint: !!tokenEndpoint 
      });
      throw new Error('OAuth credentials not configured');
    }

    console.log('📋 OAuth config:', { 
      clientId, 
      tokenEndpoint,
      clientSecretLength: clientSecret.length 
    });

    // Basic Auth 헤더 생성 (Java 예제와 동일)
    const basicAuth = btoa(`${clientId}:${clientSecret}`);

    console.log('🔐 Basic Auth header created');

    // Java 예제와 동일하게 scope=read 사용
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'read', // Java 예제: scope=read
    });

    console.log('📤 Token request params:', params.toString());

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    console.log('📥 Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token request failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText
      });
      throw new Error(`Token request failed: ${tokenResponse.status} - ${errorText}`);
    }

    const responseText = await tokenResponse.text();
    console.log('📄 Raw response:', responseText);
    console.log('📄 Response first 100 chars:', responseText.substring(0, 100));

    // URL Decode (Java 예제: URLDecoder.decode(responseStr, "UTF-8"))
    let decodedText;
    try {
      // 응답이 URL 인코딩되어 있으면 디코딩
      if (responseText.includes('%')) {
        decodedText = decodeURIComponent(responseText);
        console.log('🔓 Decoded response:', decodedText);
      } else {
        // 인코딩되지 않은 경우 그대로 사용
        decodedText = responseText;
        console.log('📝 Response is not URL encoded, using as-is');
      }
    } catch (decodeError) {
      console.error('⚠️ Decode error, using raw response:', decodeError);
      decodedText = responseText;
    }

    let tokenData;
    try {
      tokenData = JSON.parse(decodedText);
      console.log('✅ OAuth token received:', { 
        hasAccessToken: !!tokenData.access_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type
      });
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Tried to parse:', decodedText.substring(0, 200));
      throw new Error(`Failed to parse token response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // 3. DB에 저장 (7일 = 604800초)
    const expiresIn = tokenData.expires_in || 604800; // 기본 7일
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const { error: upsertError } = await supabase
      .from('oauth_tokens')
      .upsert({
        service_name: 'account_verification',
        access_token: tokenData.access_token,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'service_name'
      });

    if (upsertError) {
      console.error('⚠️ Failed to save token:', upsertError);
      // 저장 실패해도 토큰은 반환 (일시적 사용 가능)
    } else {
      console.log('💾 Token saved to database');
    }

    return tokenData.access_token;

  } catch (error) {
    console.error('❌ OAuth token error:', error);
    throw error;
  }
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-User-Email", "X-User-Role", "X-User-Id"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoints (인증 불필요) - 먼저 정의
app.get("/health", (c) => {
  return c.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "make-server-b6d5667f",
    version: "1.0.0"
  });
});

app.get("/make-server-b6d5667f/health", (c) => {
  return c.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "make-server-b6d5667f",
    version: "1.0.0"
  });
});

// =====================================================
// Authentication API
// =====================================================

// POST /api/auth/login - 로그인
app.post("/make-server-b6d5667f/api/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'email and password are required' }, 400);
    }

    // 사용자 조회 (password_hash 컬럼만 조회)
    const { data: userData, error } = await supabase
      .from('users')
      .select('user_id, email, username, password_hash, role, status, level, template_id, center_name, logo_url')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return c.json({ error: '로그인 중 오류가 발생했습니다' }, 500);
    }

    if (!userData) {
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401);
    }

    // 비밀번호 확인 (bcrypt 해시 비교 또는 평문 비교)
    if (!userData.password_hash) {
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401);
    }

    // bcrypt 해시인지 평문인지 확인
    let isPasswordValid = false;
    
    if (userData.password_hash.startsWith('$2a$') || userData.password_hash.startsWith('$2b$')) {
      // bcrypt 해시인 경우
      console.log('🔐 Comparing bcrypt hash...');
      isPasswordValid = await bcrypt.compare(password, userData.password_hash);
    } else {
      // 평문 비밀번호인 경우 (기존 사용자 하위 호환성)
      console.log('🔐 Comparing plain text password...');
      isPasswordValid = userData.password_hash === password;
    }
    
    if (!isPasswordValid) {
      console.log('❌ Password mismatch');
      return c.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401);
    }
    
    console.log('✅ Password verified successfully');

    // 계정 상태 확인
    if (userData.status !== 'active') {
      return c.json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' }, 403);
    }

    // last_login 업데이트
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', userData.user_id);

    // 비밀번호 제외하고 반환
    const { password_hash, ...userDataWithoutPassword } = userData;

    return c.json({ 
      success: true,
      user: userDataWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: '로그인 처리 중 오류가 발생했습니다' }, 500);
  }
});

// POST /api/auth/change-password - 비밀번호 변경
app.post("/make-server-b6d5667f/api/auth/change-password", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, new_password } = body;

    if (!user_id || !new_password) {
      return c.json({ error: 'user_id and new_password are required' }, 400);
    }

    if (new_password.length < 8) {
      return c.json({ error: '비밀번호는 8자 이상이어야 합니다' }, 400);
    }

    // 비밀번호 해시화 (salt rounds 10)
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // 비밀번호 업데이트 (RLS 우회)
    const { error } = await supabase
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id);

    if (error) {
      console.error('Password update error:', error);
      return c.json({ error: '비밀번호 변경 중 오류가 발생했습니다' }, 500);
    }

    return c.json({ 
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: '비밀번호 변경 처리 중 오류가 발생했습니다' }, 500);
  }
});

// =====================================================
// Admin API
// =====================================================

// GET /api/admin/users - 필터링된 사용자 목록 조회
app.get("/make-server-b6d5667f/api/admin/users", async (c) => {
  try {
    const userEmail = c.req.header('X-User-Email');
    const userRole = c.req.header('X-User-Role');
    const userId = c.req.header('X-User-Id');

    console.log('📥 Admin users request:', { userEmail, userRole, userId });

    if (!userEmail || !userRole || !userId) {
      return c.json({ 
        success: false,
        error: 'Missing user credentials' 
      }, 401);
    }

    // 현재 사용자 정보 조회
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('user_id, email, role, level, referral_code')
      .eq('user_id', userId)
      .maybeSingle();

    if (userError || !currentUser) {
      console.error('❌ User lookup failed:', userError);
      return c.json({ 
        success: false,
        error: 'User not found' 
      }, 404);
    }

    console.log('👤 Current user:', currentUser);

    // 역할별 필터링 로직
    let query = supabase.from('users').select('*');

    if (currentUser.role === 'master') {
      // 마스터: 모든 사용자
      console.log('🔓 Master role - fetching all users');
    } else if (currentUser.role === 'agency') {
      // 대리점: 자신이 생성한 센터 + 그 하위
      const { data: centers } = await supabase
        .from('users')
        .select('referral_code')
        .eq('parent_user_id', currentUser.user_id)
        .eq('role', 'center');
      
      const centerCodes = centers?.map(c => c.referral_code) || [];
      const allCodes = [currentUser.referral_code, ...centerCodes];
      
      query = query.or(`referral_code.in.(${allCodes.join(',')}),parent_user_id.eq.${currentUser.user_id}`);
      console.log('🏢 Agency role - filtering by codes:', allCodes);
    } else if (currentUser.role === 'center') {
      // 센터: 자신 + 직접 소속 가맹점 + 가맹점 소속 일반회원
      const { data: stores } = await supabase
        .from('users')
        .select('user_id, referral_code')
        .eq('parent_user_id', currentUser.user_id)
        .eq('role', 'store');
      
      const storeIds = stores?.map(s => s.user_id) || [];
      const storeCodes = stores?.map(s => s.referral_code) || [];
      
      // 센터 본인 + 가맹점들 + 가맹점 소속 일반회원들
      const conditions = [
        `user_id.eq.${currentUser.user_id}`,
        `parent_user_id.eq.${currentUser.user_id}`
      ];
      
      if (storeIds.length > 0) {
        conditions.push(`parent_user_id.in.(${storeIds.join(',')})`);
      }
      
      query = query.or(conditions.join(','));
      console.log('🏪 Center role - filtering:', { storeIds: storeIds.length, conditions });
    } else if (currentUser.role === 'store') {
      // 가맹점: 자신 + 소속 일반회원
      query = query.or(`user_id.eq.${currentUser.user_id},parent_user_id.eq.${currentUser.user_id}`);
      console.log('🏬 Store role - filtering by parent_user_id');
    } else {
      // 일반 사용자: 자기 자신만
      query = query.eq('user_id', currentUser.user_id);
      console.log('👤 User role - self only');
    }

    const { data: users, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Users fetch error:', fetchError);
      return c.json({ 
        success: false,
        error: fetchError.message 
      }, 500);
    }

    console.log('✅ Fetched users:', users?.length || 0);

    return c.json({ 
      success: true,
      users: users || []
    });

  } catch (error) {
    console.error('❌ Admin users error:', error);
    return c.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// PUT /api/admin/users/:id/level - 사용자 등급 변경
app.put("/make-server-b6d5667f/api/admin/users/:id/level", async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const { level } = body;

    console.log('📥 Update user level request:', { userId, level });

    if (!userId || !level) {
      return c.json({ 
        success: false,
        error: '필수 정보가 누락되었습니다' 
      }, 400);
    }

    // 유효한 level 값 확인
    const validLevels = ['Basic', 'Standard', 'Premium', 'VIP'];
    if (!validLevels.includes(level)) {
      return c.json({ 
        success: false,
        error: '유효하지 않은 등급입니다' 
      }, 400);
    }

    // 사용자 등급 업데이트
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ level })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update level error:', updateError);
      return c.json({ 
        success: false,
        error: updateError.message 
      }, 500);
    }

    console.log('✅ Level updated successfully:', updatedUser);

    return c.json({ 
      success: true,
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Update level error:', error);
    return c.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// =====================================================
// 지갑 생성 및 관리 API
// =====================================================
app.route("/make-server-b6d5667f/wallet", walletRouter);

// =====================================================
// 트랜잭션 전송 및 관리 API
// =====================================================
app.route("/make-server-b6d5667f/transaction", transactionRouter);

// =====================================================
// 계좌 인증 API
// =====================================================

// 은행 코드 매핑
const BANK_CODES: Record<string, string> = {
  '한국은행': '001',
  '산업은행': '002',
  'IBK기업은행': '003',
  'KB국민은행': '004',
  '수협은행': '007',
  '수출입은행': '008',
  'NH농협은행': '011',
  '지역농축협': '012',
  '우리은행': '020',
  '한국씨티은행': '027',
  '대구은행': '031',
  '부산은행': '032',
  '광주은행': '034',
  '제주은행': '035',
  '전북은행': '037',
  '경남은행': '039',
  '우리카드': '041',
  '하나카드': '044',
  '새마을금고': '045',
  '신협': '048',
  '저축은행': '050',
  '모건스탠리은행': '052',
  'HSBC은행': '054',
  '도이치은행': '055',
  '제이피모간체이스은행': '057',
  '미즈호은행': '058',
  '엠유에프지은행': '059',
  'BOA은행': '060',
  '비엔피파리바은행': '061',
  '중국공상은행': '062',
  '산림조합': '064',
  '대화은행': '065',
  '교보증권': '066',
  '중국건설은행': '067',
  '우체국': '071',
  '신한금융투자': '076',
  'KB증권': '077',
  '하나은행': '081',
  '신한은행': '088',
  'K뱅크': '089',
  '카카오뱅크': '090',
  '유안타증권': '093',
};

// POST /api/account-verification/request - 계좌 인증 요청
app.post("/make-server-b6d5667f/api/account-verification/request", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, bank_name, account_number, account_holder } = body;

    console.log('📥 Account verification request:', { user_id, bank_name, account_number, account_holder });

    if (!user_id || !bank_name || !account_number || !account_holder) {
      return c.json({ error: '필수 정보가 누락되었습니다', code: 'MISSING_FIELDS' }, 400);
    }

    // 은행 코드 확인
    const bankCode = BANK_CODES[bank_name];
    if (!bankCode) {
      return c.json({ error: '지원하지 않는 은행입니다', code: 'INVALID_BANK' }, 400);
    }

    // 계좌번호 하이픈 제거
    const cleanAccountNumber = account_number.replace(/-/g, '');

    // 1. account_verifications 테이블에 먼저 INSERT
    console.log('💾 Inserting verification record...');
    const { data: verificationData, error: insertError } = await supabase
      .from('account_verifications')
      .insert({
        user_id: user_id,
        bank_name: bank_name,
        account_number: cleanAccountNumber,
        account_holder: account_holder,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ DB insert error:', insertError);
      return c.json({ 
        error: '계좌 인증 요청 저장 실패', 
        code: 'DB_INSERT_ERROR',
        details: insertError.message 
      }, 500);
    }

    console.log('✅ Verification record inserted:', verificationData.verification_id);

    // 2. 외부 1원 입금 API 호출
    const apiUrl = Deno.env.get('code_api_demo');
    if (!apiUrl) {
      console.error('❌ API URL not configured');
      return c.json({ error: 'API 설정이 올바르지 않습니다', code: 'API_URL_MISSING' }, 500);
    }

    const apiPayload = {
      account: cleanAccountNumber,
      organization: bankCode,
      inPrintType: "0", // 랜덤 숫자
    };

    console.log('🔑 Getting OAuth token...');
    let oauthToken;
    try {
      oauthToken = await getOAuthToken();
      console.log('✅ OAuth token obtained');
    } catch (oauthError) {
      console.error('❌ OAuth token error:', oauthError);
      return c.json({ 
        error: 'OAuth 토큰 발급 실패', 
        code: 'OAUTH_TOKEN_ERROR',
        details: oauthError instanceof Error ? oauthError.message : 'Unknown error'
      }, 500);
    }

    console.log('📞 Calling 1won API:', apiPayload);

    let apiResponse;
    try {
      apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${oauthToken}`,
        },
        body: JSON.stringify(apiPayload),
      });
    } catch (fetchError) {
      console.error('❌ API fetch error:', fetchError);
      return c.json({ 
        error: '1원 입금 API 호출 실패', 
        code: 'API_FETCH_ERROR',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      }, 500);
    }

    console.log('📥 1won API response status:', apiResponse.status);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('❌ API call failed:', apiResponse.status, errorText);
      return c.json({ 
        error: '1원 입금 요청 실패', 
        code: 'API_REQUEST_FAILED',
        status: apiResponse.status,
        details: errorText
      }, 500);
    }

    const apiResponseText = await apiResponse.text();
    console.log('📄 1won API raw response:', apiResponseText);
    console.log('📄 Response first 100 chars:', apiResponseText.substring(0, 100));

    // URL Decode (토큰 발급과 동일한 로직)
    let decodedApiText;
    try {
      // 응답이 URL 인코딩되어 있으면 디코딩
      if (apiResponseText.includes('%')) {
        decodedApiText = decodeURIComponent(apiResponseText);
        console.log('🔓 Decoded 1won API response:', decodedApiText);
      } else {
        // 인코딩되지 않은 경우 그대로 사용
        decodedApiText = apiResponseText;
        console.log('📝 1won API response is not URL encoded, using as-is');
      }
    } catch (decodeError) {
      console.error('⚠️ Decode error, using raw response:', decodeError);
      decodedApiText = apiResponseText;
    }

    let apiResult;
    try {
      apiResult = JSON.parse(decodedApiText);
      console.log('✅ 1won API response parsed:', { 
        hasAuthCode: !!apiResult.authCode,
        resultCode: apiResult.result?.code,
        resultMessage: apiResult.result?.message
      });
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Tried to parse:', decodedApiText.substring(0, 200));
      return c.json({ 
        error: '1원 입금 API 응답 파싱 실패', 
        code: 'API_PARSE_ERROR',
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }, 500);
    }

    // 3. authCode를 DB에 저장하고 바로 pending 상태로 변경 (임시 시나리오)
    // 테스트 API이므로 자동으로 인증 처리
    console.log('💾 Updating verification with authCode...');
    const { error: updateError } = await supabase
      .from('account_verifications')
      .update({
        verification_code: apiResult.authCode,
        status: 'pending', // 자동으로 승인 대기 상태로 변경
      })
      .eq('verification_id', verificationData.verification_id);

    if (updateError) {
      console.error('❌ DB update error:', updateError);
      return c.json({ 
        error: '인증 코드 저장 실패', 
        code: 'DB_UPDATE_ERROR',
        details: updateError.message 
      }, 500);
    }

    // 4. 사용자에게 알림 생성 (종 알림)
    console.log('🔔 Creating notification for user...');
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user_id,
        type: 'account_verification',
        title: '계좌 인증 요청 완료',
        message: `계좌 인증 요청이 접수되었습니다. 입금자명(인증번호): ${apiResult.authCode}\n관리자 승인 후 지갑이 활성화됩니다.`,
        data: {
          verification_id: verificationData.verification_id,
          auth_code: apiResult.authCode,
          bank_name: bank_name,
          account_number: cleanAccountNumber,
        },
        is_read: false,
      });

    if (notificationError) {
      console.error('❌ Notification creation error:', notificationError);
      // 알림 생성 실패는 치명적이지 않으므로 계속 진행
    } else {
      console.log('✅ Notification created successfully');
    }

    console.log('✅ Account verification request completed successfully');

    return c.json({
      success: true,
      verification_id: verificationData.verification_id,
      authCode: apiResult.authCode, // 디버깅용 (프로덕션에서는 제거)
      message: '계좌 인증이 자동으로 완료되었습니다. 관리자 승인을 기다려주세요.',
    });

  } catch (error) {
    console.error('❌ Account verification request error:', error);
    console.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'Unknown');
    return c.json({ 
      error: '계좌 인증 요청 처리 중 오류가 발생했습니다',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

// POST /api/account-verification/submit - 인증번호 검증 및 승인 요청
app.post("/make-server-b6d5667f/api/account-verification/submit", async (c) => {
  try {
    const body = await c.req.json();
    const { verification_id } = body;

    if (!verification_id) {
      return c.json({ error: 'verification_id가 필요합니다' }, 400);
    }

    // status를 pending으로 변경 (관리자 승인 대기)
    const { error } = await supabase
      .from('account_verifications')
      .update({
        status: 'pending',
      })
      .eq('verification_id', verification_id);

    if (error) {
      console.error('DB update error:', error);
      return c.json({ error: '승인 요청 처리 실패' }, 500);
    }

    return c.json({
      success: true,
      message: '관리자 승인을 요청했습니다.',
    });

  } catch (error) {
    console.error('Account verification submit error:', error);
    return c.json({ error: '승인 요청 처리 중 오류가 발생했습니다' }, 500);
  }
});

Deno.serve(app.fetch);