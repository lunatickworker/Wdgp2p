import { supabase } from '../supabase/client';

export interface UploadLogoRequest {
  centerId: string;
  file: File;
}

export interface UploadLogoResponse {
  success: boolean;
  logoUrl?: string;
  error?: string;
}

export async function uploadCenterLogo(
  request: UploadLogoRequest
): Promise<UploadLogoResponse> {
  try {
    const { centerId, file } = request;
    
    // 파일 유효성 검사
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: '이미지 파일만 업로드 가능합니다 (PNG, JPG, WEBP)'
      };
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: '파일 크기는 5MB 이하여야 합니다'
      };
    }
    
    // 기존 로고 조회 (있으면 삭제)
    const { data: existingCenter } = await supabase
      .from('users')
      .select('logo_url')
      .eq('user_id', centerId)
      .single();
    
    if (existingCenter?.logo_url) {
      const oldPath = existingCenter.logo_url.split('/').pop();
      if (oldPath) {
        await supabase.storage
          .from('public-assets')
          .remove([`center-logos/${centerId}/${oldPath}`]);
      }
    }
    
    // 새 로고 업로드
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `center-logos/${centerId}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('public-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      return {
        success: false,
        error: uploadError.message
      };
    }
    
    // Public URL 생성
    const { data: publicUrlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(filePath);
    
    const logoUrl = publicUrlData.publicUrl;
    
    // DB 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({ logo_url: logoUrl })
      .eq('user_id', centerId);
    
    if (updateError) {
      return {
        success: false,
        error: updateError.message
      };
    }
    
    return {
      success: true,
      logoUrl
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '로고 업로드 실패'
    };
  }
}

// 로고 삭제 함수
export async function deleteCenterLogo(centerId: string): Promise<UploadLogoResponse> {
  try {
    // 기존 로고 조회
    const { data: center } = await supabase
      .from('users')
      .select('logo_url')
      .eq('user_id', centerId)
      .single();
    
    if (!center?.logo_url) {
      return {
        success: false,
        error: '삭제할 로고가 없습니다'
      };
    }
    
    // Storage에서 삭제
    const filePath = center.logo_url.split('/').slice(-3).join('/');
    await supabase.storage
      .from('public-assets')
      .remove([filePath]);
    
    // DB에서 제거
    const { error: updateError } = await supabase
      .from('users')
      .update({ logo_url: null })
      .eq('user_id', centerId);
    
    if (updateError) {
      return {
        success: false,
        error: updateError.message
      };
    }
    
    return {
      success: true
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '로고 삭제 실패'
    };
  }
}
