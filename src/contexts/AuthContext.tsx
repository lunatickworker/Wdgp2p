import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase/client';
import { SUPABASE_CONFIG } from '../utils/config';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'master' | 'center' | 'agency' | 'store' | 'admin' | 'user';
  level?: string;
  templateId?: string; // 템플릿 ID 추가
  centerName?: string; // 센터 이름 추가
  logoUrl?: string | null; // 로고 URL 추가
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, isAdminPage: boolean) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Supabase Auth 세션 확인 (Google OAuth 등)
    checkAuthSession();

    // 2. Auth 상태 변경 리스너 등록
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await handleOAuthLogin(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('user');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const checkAuthSession = async () => {
    try {
      setIsLoading(true);

      // Supabase 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('✅ Active session found:', session.user.email);
        await handleOAuthLogin(session.user);
      } else {
        // 로컬 스토리지에서 사용자 정보 복원 (일반 로그인)
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (error) {
            console.error('Error parsing saved user:', error);
            localStorage.removeItem('user');
          }
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (authUser: any) => {
    try {
      console.log('🔍 Checking if user exists in database:', authUser.email);

      // users 테이블에서 사용자 조회
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, email, username, role, level, template_id, center_name, logo_url, status')
        .eq('email', authUser.email)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user:', userError);
        throw new Error('사용자 정보 조회 실패');
      }

      if (!userData) {
        // 신규 사용자 - users 테이블에 생성 (일반 사용자로)
        console.log('📝 Creating new user in database');
        
        const newUser = {
          user_id: authUser.id,
          email: authUser.email,
          username: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
          role: 'user',
          status: 'active',
          is_active: true,
          referral_code: authUser.email.split('@')[0],
          created_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert(newUser);

        if (insertError) {
          console.error('Error creating user:', insertError);
          throw new Error('사용자 생성 실패');
        }

        // 새로 생성된 사용자 정보로 로그인
        const loggedInUser: User = {
          id: authUser.id,
          email: authUser.email,
          username: newUser.username,
          role: 'user',
        };

        setUser(loggedInUser);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        return;
      }

      // 기존 사용자 - 상태 확인
      if (userData.status !== 'active') {
        throw new Error('비활성화된 계정입니다. 관리자에게 문의하세요.');
      }

      const loggedInUser: User = {
        id: userData.user_id,
        email: userData.email,
        username: userData.username,
        role: userData.role || 'user',
        level: userData.level,
        templateId: userData.template_id,
        centerName: userData.center_name,
        logoUrl: userData.logo_url,
      };

      setUser(loggedInUser);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      console.log('✅ User logged in:', loggedInUser);
    } catch (error) {
      console.error('OAuth login error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string, isAdminPage: boolean = false): Promise<User> => {
    try {
      // Figma 환경에서는 직접 Supabase 클라이언트 사용
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const isFigmaEnv = hostname.includes('.figma.com') || hostname.includes('figma.site');
      
      if (isFigmaEnv) {
        console.log('🎨 Figma 환경 감지 - Supabase 클라이언트 직접 사용');
        
        // 1. 사용자 조회 (password_hash만 조회)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id, email, username, role, level, template_id, center_name, logo_url, password_hash, status')
          .eq('email', email)
          .maybeSingle();
        
        if (userError || !userData) {
          console.error('User lookup error:', userError);
          throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
        }
        
        console.log('User found:', { email: userData.email, role: userData.role, status: userData.status });
        
        // 승인대기 상태 체크
        if (userData.status === 'pending') {
          throw new Error('회원가입 승인 대기 중입니다. 관리자의 승인을 기다려주세요');
        }
        
        // 2. 비밀번호 검증
        // password_hash 컬럼의 값과 비교 (테스트 환경에서는 평문으로 저장됨)
        if (!userData.password_hash) {
          console.error('No password_hash found in database');
          throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
        }
        
        // 평문 비밀번호와 직접 비교 (테스트 환경)
        if (userData.password_hash !== password) {
          console.error('Password mismatch');
          throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
        }
        
        const loggedInUser: User = {
          id: userData.user_id,
          email: userData.email,
          username: userData.username,
          role: userData.role || 'user',
          level: userData.level,
          templateId: userData.template_id,
          centerName: userData.center_name,
          logoUrl: userData.logo_url
        };
        
        // 역할 검증
        if (isAdminPage && !['center', 'agency', 'store', 'admin', 'master'].includes(loggedInUser.role)) {
          throw new Error('관리자 권한이 필요합니다');
        }
        
        setUser(loggedInUser);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        
        console.log('✅ Figma 환경 로그인 성공:', loggedInUser);
        return loggedInUser;
      }
      
      // 프로덕션 환경: Backend API로 로그인 처리
      const response = await fetch(`${SUPABASE_CONFIG.backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        },
        body: JSON.stringify({ email, password })
      });

      console.log('Login response status:', response.status);
      const data = await response.json();
      console.log('Login response data:', data);

      if (!response.ok) {
        console.error('Login failed with status:', response.status, data);
        throw new Error(data.error || '로그인에 실패했습니다');
      }

      if (!data.success) {
        console.error('Login not successful:', data);
        throw new Error(data.error || '로그인에 실패했습니다');
      }

      const userData = data.user;
      
      const loggedInUser: User = {
        id: userData.user_id,
        email: userData.email,
        username: userData.username,
        role: userData.role || 'user',
        level: userData.level,
        templateId: userData.template_id,
        centerName: userData.center_name,
        logoUrl: userData.logo_url
      };
      
      // 역할 검증: 관리자 페이지에서는 관리자만 로그인 가능
      if (isAdminPage && loggedInUser.role !== 'admin') {
        throw new Error('관리자 권한이 필요합니다');
      }
      
      console.log('Setting user state:', loggedInUser);
      setUser(loggedInUser);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      
      // ✅ 로그인 직후 DB에서 최신 정보 다시 가져오기 (template_id 등 누락 방지)
      if (loggedInUser.role === 'center' || loggedInUser.role === 'agency') {
        console.log('🔄 Refreshing user data to get template_id...');
        setTimeout(async () => {
          try {
            const { data: freshData, error } = await supabase
              .from('users')
              .select('user_id, email, username, role, level, template_id, center_name, logo_url')
              .eq('user_id', loggedInUser.id)
              .single();

            if (!error && freshData) {
              const freshUser: User = {
                id: freshData.user_id,
                email: freshData.email,
                username: freshData.username,
                role: freshData.role || 'user',
                level: freshData.level,
                templateId: freshData.template_id,
                centerName: freshData.center_name,
                logoUrl: freshData.logo_url
              };

              console.log('✅ Fresh user data loaded:', freshUser);
              setUser(freshUser);
              localStorage.setItem('user', JSON.stringify(freshUser));
            }
          } catch (err) {
            console.error('Failed to refresh user data:', err);
          }
        }, 100); // 100ms 후 실행
      }
      
      console.log('Login successful, user state updated:', loggedInUser);
      return loggedInUser;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    supabase.auth.signOut(); // Supabase Auth 로그아웃
    setUser(null);
    localStorage.removeItem('user');
  };

  const refreshUser = async () => {
    if (!user) return;

    try {
      // DB에서 최신 사용자 정보 가져오기
      const { data, error } = await supabase
        .from('users')
        .select('user_id, email, username, role, level, template_id, center_name, logo_url')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        const updatedUser: User = {
          id: data.user_id,
          email: data.email,
          username: data.username,
          role: data.role || 'user',
          level: data.level,
          templateId: data.template_id,
          centerName: data.center_name,
          logoUrl: data.logo_url
        };

        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('User info refreshed:', updatedUser);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}