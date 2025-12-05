// 브라우저 콘솔에서 사용자 확인 및 생성
import { supabase } from './supabase/client';

// 사용법:
// 1. 브라우저 콘솔에서: window.debugUsers.checkUsers()
// 2. 사용자 생성: window.debugUsers.createTestUser()

export const debugUsers = {
  // 모든 사용자 조회
  async checkUsers() {
    console.log('🔍 Checking all users...');
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Users found:', data);
      console.table(data);
    }
    return data;
  },

  // 특정 이메일로 사용자 조회
  async findByEmail(email: string) {
    console.log(`🔍 Looking for user: ${email}`);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);
    
    if (error) {
      console.error('❌ Error:', error);
    } else if (!data || data.length === 0) {
      console.log('❌ User not found');
    } else {
      console.log('✅ User found:', data[0]);
    }
    return data;
  },

  // 테스트 사용자 생성
  async createTestUser(email = 'hong@example.com', username = 'Hong') {
    console.log(`🔨 Creating test user: ${email}`);
    
    const userData = {
      username: username,
      email: email,
      password_hash: 'password123',
      role: 'user',
      kyc_status: 'approved',
      status: 'active'
    };

    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select();
    
    if (error) {
      console.error('❌ Error creating user:', error);
      
      // 업데이트 시도
      console.log('🔄 Trying to update existing user...');
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ password_hash: 'password123' })
        .eq('email', email)
        .select();
      
      if (updateError) {
        console.error('❌ Update error:', updateError);
      } else {
        console.log('✅ User updated:', updateData);
      }
    } else {
      console.log('✅ User created:', data);
    }
    return data;
  },

  // 관리자 생성
  async createAdmin(email = 'admin@example.com', username = 'Admin') {
    console.log(`🔨 Creating admin: ${email}`);
    
    const userData = {
      username: username,
      email: email,
      password_hash: 'password123',
      role: 'admin',
      kyc_status: 'approved',
      status: 'active'
    };

    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select();
    
    if (error) {
      console.error('❌ Error creating admin:', error);
      
      // 업데이트 시도
      console.log('🔄 Trying to update existing admin...');
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ password_hash: 'password123', role: 'admin' })
        .eq('email', email)
        .select();
      
      if (updateError) {
        console.error('❌ Update error:', updateError);
      } else {
        console.log('✅ Admin updated:', updateData);
      }
    } else {
      console.log('✅ Admin created:', data);
    }
    return data;
  },

  // 테이블 구조 확인
  async checkTableStructure() {
    console.log('🔍 Checking users table structure...');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error);
    } else if (data && data.length > 0) {
      console.log('✅ Table columns:', Object.keys(data[0]));
      console.log('Sample data:', data[0]);
    } else {
      console.log('⚠️ Table is empty');
    }
    return data;
  }
};

// 전역으로 노출
if (typeof window !== 'undefined') {
  (window as any).debugUsers = debugUsers;
}
