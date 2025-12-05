import { supabase } from './supabase/client';

/**
 * localStorage의 user 객체에 template_id를 수동으로 업데이트하는 유틸리티
 * 브라우저 콘솔에서 직접 호출 가능
 */
export async function fixTemplateId() {
  try {
    // localStorage에서 현재 사용자 가져오기
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      console.error('❌ No user found in localStorage');
      return;
    }

    const user = JSON.parse(savedUser);
    console.log('📦 Current user in localStorage:', user);

    // DB에서 최신 정보 가져오기
    const { data, error } = await supabase
      .from('users')
      .select('user_id, email, username, role, level, template_id, center_name, logo_url')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('❌ Error fetching user from DB:', error);
      return;
    }

    if (!data) {
      console.error('❌ User not found in DB');
      return;
    }

    console.log('📊 User data from DB:', data);

    // 업데이트된 user 객체 생성
    const updatedUser = {
      id: data.user_id,
      email: data.email,
      username: data.username,
      role: data.role,
      level: data.level,
      templateId: data.template_id,
      centerName: data.center_name,
      logoUrl: data.logo_url
    };

    // localStorage에 저장
    localStorage.setItem('user', JSON.stringify(updatedUser));
    console.log('✅ User updated in localStorage:', updatedUser);
    console.log('🔄 Please refresh the page to apply changes');

    return updatedUser;
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// 전역으로 노출 (개발용)
if (typeof window !== 'undefined') {
  (window as any).fixTemplateId = fixTemplateId;
}
