import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      email, 
      password, 
      username, 
      storeName,
      centerId,
      receivingWallet,
      feeRate 
    } = await req.json();

    // 1. 이메일 중복 체크
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: '이미 사용 중인 이메일입니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. 비밀번호 해시 생성
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const referralCode = email.split('@')[0].toLowerCase();

    // 3. users 테이블에 저장
    const { error: insertError } = await supabaseClient
      .from('users')
      .insert({
        user_id: userId,
        username: username,
        email: email,
        password_hash: passwordHash,
        referral_code: referralCode,
        role: 'store',
        status: 'active',
        is_active: true,
        parent_user_id: centerId,
        tenant_id: centerId,
        center_name: storeName,
        receiving_wallet_address: receivingWallet || null,
        fee_rate: feeRate || 0,
      });

    if (insertError) {
      console.error('❌ DB Insert Error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        message: '가맹점이 생성되었습니다' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || '가맹점 생성에 실패했습니다' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
