import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { toast, Toaster } from 'sonner@2.0.3';
import { UserApp } from './user/App';
import { AdminApp } from './components/AdminApp';
import { MasterApp } from './components/MasterApp';
import { Login } from './components/Login';
import { getTenantInfo, getDomainType, isRoleAllowedForDomain, redirectToCorrectDomain } from './utils/domain';
import './utils/debug-users';
import './utils/fix-template-id'; // ✅ 템플릿 ID 수동 수정 유틸리티 로드

// 라우팅 타입 정의
type Route = 'user' | 'center' | 'store' | 'admin' | 'master' | 'admin-login' | 'not-found';

// Tenant 정보 인터페이스
interface TenantContext {
  centerId: string;
  centerName: string;
  domain: string;
  logoUrl: string | null;
  templateId: string;
  designTheme: any;
}

// 404 Not Found 페이지
function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-cyan-400 mb-4">404 - 페이지를 찾을 수 없습니다</h1>
        <p className="text-slate-400">
          유효하지 않은 도메인이거나 접근 권한이 없습니다.
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<Route>('user');
  const [tenantInfo, setTenantInfo] = useState<TenantContext | null>(null);
  const [domainType, setDomainType] = useState<'main' | 'admin' | null>(null);
  const [domainLoading, setDomainLoading] = useState(true);

  // 도메인 기반 Tenant 정보 로드
  useEffect(() => {
    async function loadTenantInfo() {
      try {
        setDomainLoading(true);
        
        // 현재 도메인의 Tenant 정보 조회
        const tenant = await getTenantInfo();
        const type = await getDomainType();
        
        setTenantInfo(tenant);
        setDomainType(type);

        console.log('[App] Tenant 정보:', tenant);
        console.log('[App] Domain Type:', type);
        
        // 🔥 admin 서브도메인이면 자동으로 /#admin으로 리디렉션
        // 단, 이미 hash가 있는 경우는 건드리지 않음
        if (type === 'admin' && !window.location.hash) {
          console.log('[App] Admin 도메인 감지 → /#admin/login으로 리디렉션');
          window.location.hash = '#admin/login';
        }
      } catch (error) {
        console.error('[App] Tenant 정보 로드 실패:', error);
      } finally {
        setDomainLoading(false);
      }
    }

    loadTenantInfo();
  }, []);

  // ============================================
  // 라우팅 로직 (간단 버전)
  // ============================================
  useEffect(() => {
    // 로딩 중이면 대기
    if (isLoading) return;
    
    console.log('[App] 라우팅 로직 실행 - user:', user, 'currentRoute:', currentRoute);

    const hash = window.location.hash.slice(1); // # 제거
    const hostname = window.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // ==========================================
    // 1. Hash 라우팅 (우선순위 1)
    // ==========================================
    
    // #master 경로
    if (hash.startsWith('master')) {
      if (user?.role === 'master') {
        setCurrentRoute('master');
      } else {
        setCurrentRoute('admin-login');
      }
      return;
    }

    // #admin/login 경로
    if (hash === 'admin/login') {
      setCurrentRoute('admin-login');
      return;
    }

    // #admin 경로 (센터/에이전시/가맹점 관리)
    if (hash.startsWith('admin')) {
      console.log('[App] #admin 경로 감지 - user:', user?.email, 'role:', user?.role);
      if (user && ['center', 'agency', 'store', 'admin'].includes(user.role)) {
        console.log('[App] admin 페이지로 라우팅');
        setCurrentRoute('admin');
      } else {
        console.log('[App] 권한 없음 - 로그인 페이지로');
        setCurrentRoute('admin-login');
      }
      return;
    }

    // ==========================================
    // 2. Role 기반 라우팅 (hash 없을 때)
    // ==========================================
    
    if (!user) {
      // 로그인 안됨 → 회원 앱 (공개)
      setCurrentRoute('user');
      return;
    }

    // Master
    if (user.role === 'master') {
      window.location.hash = '#master';
      setCurrentRoute('master');
      return;
    }

    // 센터/에이전시/가맹점/admin
    if (['center', 'agency', 'store', 'admin'].includes(user.role)) {
      window.location.hash = '#admin';
      setCurrentRoute('admin');
      return;
    }

    // 일반 회원
    if (user.role === 'user') {
      setCurrentRoute('user');
      return;
    }

    // 기타
    setCurrentRoute('not-found');
  }, [user, isLoading]);

  // Hash 변경 감지
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      console.log('[App] Hash changed to:', hash, 'user:', user?.email);
      
      // #master
      if (hash.startsWith('master')) {
        if (user?.role === 'master') {
          setCurrentRoute('master');
        } else {
          setCurrentRoute('admin-login');
        }
      }
      // #admin/login
      else if (hash === 'admin/login') {
        setCurrentRoute('admin-login');
      }
      // #admin
      else if (hash.startsWith('admin')) {
        console.log('[App] Hash changed - #admin detected, user role:', user?.role);
        if (user && ['center', 'agency', 'store', 'admin'].includes(user.role)) {
          console.log('[App] Hash changed - routing to admin page');
          setCurrentRoute('admin');
        } else {
          console.log('[App] Hash changed - no permission, routing to login');
          setCurrentRoute('admin-login');
        }
      }
      // 기본
      else {
        if (user?.role === 'user' || !user) {
          setCurrentRoute('user');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  // 로딩 중
  if (isLoading || domainLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-cyan-400">Loading...</div>
      </div>
    );
  }

  // 라우팅 렌더링
  if (currentRoute === 'not-found') {
    return <NotFoundPage />;
  }

  if (currentRoute === 'admin-login') {
    return <Login onLoginSuccess={() => {
      // 로그인 성공 시 아무것도 하지 않음
      // Login 컴포넌트에서 hash 변경을 처리하고
      // useEffect에서 user와 hash를 감지하여 자동으로 라우팅됨
      console.log('[App] Login success callback called');
    }} />;
  }

  // Admin 페이지 (center, agency, store, admin 역할)
  if (currentRoute === 'admin') {
    if (!user || !['admin', 'agency', 'center', 'store'].includes(user.role)) {
      console.log('[App] Admin 페이지 접근 거부 - user:', user?.email, 'role:', user?.role);
      setCurrentRoute('admin-login');
      window.location.hash = '#admin/login';
      return null;
    }
    console.log('[App] Admin 페이지 렌더링 - user:', user.email, 'role:', user.role);
    return <AdminApp />;
  }

  // 센터 관리자 페이지
  if (currentRoute === 'center') {
    if (!user || user.role !== 'center') {
      setCurrentRoute('admin-login');
      return null;
    }
    // TODO: CenterDashboard 컴포넌트 구현 필요
    // 현재는 기존 AdminApp 사용
    return <AdminApp />;
  }

  // 가맹점 페이지
  if (currentRoute === 'store') {
    if (!user || user.role !== 'store') {
      setCurrentRoute('admin-login');
      return null;
    }
    // TODO: StoreDashboard 컴포넌트 구현 필요
    // 현재는 기존 AdminApp 사용 (Phase 2에서 구현)
    return <AdminApp />;
  }

  // 마스터 페이지
  if (currentRoute === 'master') {
    if (!user || user.role !== 'master') {
      setCurrentRoute('admin-login');
      return null;
    }
    return <MasterApp />;
  }

  // 기본은 사용자 앱 (회원)
  return <UserApp />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: 'rgb(15 23 42)',
            color: 'rgb(148 163 184)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)',
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;