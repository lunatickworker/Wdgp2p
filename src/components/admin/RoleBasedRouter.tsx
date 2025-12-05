import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { getTenantInfo } from '@/utils/api/get-tenant-info';
import { CenterSettings } from './CenterSettings';
import { StoreDashboard } from './StoreDashboard';
import { DomainManagement } from './DomainManagement';

interface User {
  user_id: string;
  role: 'master' | 'center' | 'store' | 'user';
  tenant_id: string;
  username: string;
  email: string;
}

interface TenantInfo {
  id: string;
  centerName: string;
  domain: string;
  logoUrl: string | null;
  templateId: string;
  designTheme: any;
}

export function RoleBasedRouter() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [domainType, setDomainType] = useState<'main' | 'admin' | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    setIsLoading(true);
    try {
      // 1. 현재 사용자 조회
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        // 로그인 페이지로 리다이렉트
        window.location.href = '/login';
        return;
      }

      // 2. 사용자 상세 정보 조회
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (userError || !userData) {
        throw new Error('사용자 정보를 찾을 수 없습니다');
      }

      setUser(userData as User);

      // 3. 현재 도메인 확인
      const hostname = window.location.hostname;
      
      // 4. 도메인 매핑 조회
      const { data: domainMapping } = await supabase
        .from('domain_mappings')
        .select('*, center:users!center_id(*)')
        .eq('domain', hostname)
        .eq('is_active', true)
        .single();

      if (domainMapping) {
        setDomainType(domainMapping.domain_type);
        
        // 5. Tenant 정보 로드
        const tenant = await getTenantInfo(hostname);
        setTenantInfo(tenant);
      }

    } catch (error: any) {
      console.error('초기화 실패:', error);
      // 에러 페이지 표시
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user || !tenantInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">접근할 수 없습니다</h1>
          <p className="text-gray-500 mb-4">
            사용자 정보를 찾을 수 없거나 도메인이 올바르지 않습니다.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  // 역할 및 도메인 타입에 따른 라우팅
  const renderContent = () => {
    // 주도메인 (main) - 회원 앱
    if (domainType === 'main') {
      // 회원 앱은 /user/App.tsx를 사용
      // 여기서는 리다이렉트만 처리
      window.location.href = '/user';
      return null;
    }

    // 관리자 도메인 (admin) - 역할에 따라 분기
    if (domainType === 'admin') {
      switch (user.role) {
        case 'master':
          // 마스터 관리자 - 도메인 관리
          return <DomainManagement />;

        case 'center':
          // 센터 관리자 - 센터 설정
          return <CenterSettings centerId={user.user_id} />;

        case 'store':
          // 가맹점 관리자 - 가맹점 대시보드
          return <StoreDashboard storeId={user.user_id} centerId={user.tenant_id} />;

        default:
          return (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">권한 없음</h1>
                <p className="text-gray-500">
                  관리자 페이지에 접근할 권한이 없습니다.
                </p>
              </div>
            </div>
          );
      }
    }

    // 도메인 타입을 확인할 수 없는 경우
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">알 수 없는 도메인</h1>
          <p className="text-gray-500">
            이 도메인은 등록되지 않았거나 비활성화되었습니다.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 (공통) */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {tenantInfo.logoUrl && (
                <img
                  src={tenantInfo.logoUrl}
                  alt="로고"
                  className="h-10 w-10 object-contain"
                />
              )}
              <div>
                <h1 className="text-xl font-bold">{tenantInfo.centerName}</h1>
                <p className="text-sm text-gray-500">
                  {user.role === 'master' && '마스터 관리자'}
                  {user.role === 'center' && '센터 관리자'}
                  {user.role === 'store' && '가맹점 관리자'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{user.username}</span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="text-sm text-red-500 hover:text-red-700"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>
    </div>
  );
}
