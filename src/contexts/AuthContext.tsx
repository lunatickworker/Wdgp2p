import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase/client';
import { SUPABASE_CONFIG } from '../utils/config';
import bcrypt from 'bcryptjs';

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
      // Supabase 세션 확인 (비동기로 시작, 로딩은 빠르게)
      const sessionPromise = supabase.auth.getSession();
      
      // 로컬 스토리지 먼저 체크 (동기 작업 - 즉시 완료)
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setIsLoading(false); // 로딩 즉시 해제
        } catch (error) {
          console.error('Error parsing saved user:', error);
          localStorage.removeItem('user');
        }
      } else {
        setIsLoading(false); // 저장된 유저가 없으면 즉시 로딩 해제
      }

      // 백그라운드에서 세션 확인
      const { data: { session } } = await sessionPromise;
      
      if (session?.user) {
        console.log('✅ Active session found:', session.user.email);
        await handleOAuthLogin(session.user);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (authUser: any) => {
    try {
      console.log('🔍 Checking if user exists in database:', authUser.email);

      // 1. user_id로 먼저 확인 (Auth ID와 DB ID가 동일해야 함)
      let { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('user_id, email, username, role, level, template_id, center_name, logo_url, status')
        .eq('user_id', authUser.id)
        .maybeSingle();

      // 2. user_id로 없으면 email로 확인
      if (!existingUser && !fetchError) {
        const result = await supabase
          .from('users')
          .select('user_id, email, username, role, level, template_id, center_name, logo_url, status')
          .eq('email', authUser.email)
          .maybeSingle();
        
        existingUser = result.data;
        fetchError = result.error;
      }

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user:', fetchError);
        throw new Error('사용자 정보 조회 실패');
      }

      // 3. 기존 사용자가 있으면 바로 로그인 처리
      if (existingUser) {
        console.log('✅ Existing user found:', existingUser.email);

        // 상태 확인
        if (existingUser.status !== 'active') {
          throw new Error('비활성화된 계정입니다. 관리자에게 문의하세요.');
        }

        const loggedInUser: User = {
          id: existingUser.user_id,
          email: existingUser.email,
          username: existingUser.username,
          role: existingUser.role || 'user',
          level: existingUser.level,
          templateId: existingUser.template_id,
          centerName: existingUser.center_name,
          logoUrl: existingUser.logo_url,
        };

        setUser(loggedInUser);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        console.log('✅ User logged in:', loggedInUser);
        return;
      }

      // 4. 신규 사용자 - users 테이블에 생성
      console.log('📝 Creating new user in database');
      
      // 🔥 관리자 role인 경우 자동 삽입하지 않음 (센터 생성 API에서 처리)
      const metadataRole = authUser.user_metadata?.role;
      if (metadataRole && ['center', 'agency', 'store', 'admin', 'master'].includes(metadataRole)) {
        console.log('⏭️ Admin role detected in metadata - skipping auto insert, waiting for API...');
        
        // 잠시 후 DB에서 조회 (센터 생성 API가 삽입할 때까지 대기)
        setTimeout(async () => {
          try {
            const { data: adminUser, error: adminError } = await supabase
              .from('users')
              .select('user_id, email, username, role, level, template_id, center_name, logo_url, status')
              .eq('user_id', authUser.id)
              .maybeSingle();
            
            if (adminUser && !adminError) {
              const loggedInUser: User = {
                id: adminUser.user_id,
                email: adminUser.email,
                username: adminUser.username,
                role: adminUser.role || 'user',
                level: adminUser.level,
                templateId: adminUser.template_id,
                centerName: adminUser.center_name,
                logoUrl: adminUser.logo_url,
              };
              
              setUser(loggedInUser);
              localStorage.setItem('user', JSON.stringify(loggedInUser));
              console.log('✅ Admin user loaded from DB:', loggedInUser);
            }
          } catch (error) {
            console.error('Error loading admin user:', error);
          }
        }, 1000); // 1초 후 조회
        
        return;
      }
      
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

      try {
        const { error: insertError } = await supabase
          .from('users')
          .insert(newUser);

        if (insertError) {
          // 중복 키 에러인 경우 기존 사용자 조회
          if (insertError.code === '23505') {
            console.log('🔄 Duplicate key detected, fetching existing user...');
            
            const { data: retryUser, error: retryError } = await supabase
              .from('users')
              .select('user_id, email, username, role, level, template_id, center_name, logo_url, status')
              .eq('user_id', authUser.id)
              .single();

            if (retryError || !retryUser) {
              throw new Error('사용자 조회 실패');
            }

            const loggedInUser: User = {
              id: retryUser.user_id,
              email: retryUser.email,
              username: retryUser.username,
              role: retryUser.role || 'user',
              level: retryUser.level,
              templateId: retryUser.template_id,
              centerName: retryUser.center_name,
              logoUrl: retryUser.logo_url,
            };

            setUser(loggedInUser);
            localStorage.setItem('user', JSON.stringify(loggedInUser));
            console.log('✅ Existing user loaded after duplicate key:', loggedInUser);
            return;
          }
          
          throw insertError;
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
        console.log('✅ New user created and logged in:', loggedInUser);
        return;

      } catch (insertError: any) {
        console.error('Insert error:', insertError);
        
        // 중복 키 에러 최종 처리
        if (insertError.code === '23505') {
          console.log('🔄 Final retry: fetching existing user...');
          
          const { data: finalUser, error: finalError } = await supabase
            .from('users')
            .select('user_id, email, username, role, level, template_id, center_name, logo_url, status')
            .eq('user_id', authUser.id)
            .single();

          if (finalError || !finalUser) {
            throw new Error('사용자 조회 실패');
          }

          const loggedInUser: User = {
            id: finalUser.user_id,
            email: finalUser.email,
            username: finalUser.username,
            role: finalUser.role || 'user',
            level: finalUser.level,
            templateId: finalUser.template_id,
            centerName: finalUser.center_name,
            logoUrl: finalUser.logo_url,
          };

          setUser(loggedInUser);
          localStorage.setItem('user', JSON.stringify(loggedInUser));
          console.log('✅ Final user loaded:', loggedInUser);
          return;
        }
        
        throw new Error('사용자 생성 실패');
      }

    } catch (error) {
      console.error('OAuth login error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string, isAdminPage: boolean = false): Promise<User> => {
    try {
      console.log('🔐 Login attempt:', { email, isAdminPage });
      
      // 환경 감지
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const isFigmaEnv = hostname.includes('.figma.com') || hostname.includes('figma.site') || hostname.includes('fig.ma');
      
      console.log('🌐 Environment:', { hostname, isFigmaEnv });
      
      // Figma 환경에서는 바로 DB 비밀번호 검증
      if (isFigmaEnv) {
        console.log('🎨 Figma 환경 감지 - DB 비밀번호 검증 시도');
        
        // 1. 사용자 조회 (password_hash 포함)
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
        if (!userData.password_hash) {
          console.error('No password_hash found in database');
          throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
        }
        
        // bcrypt 해시 비교 또는 평문 비교 (하위 호환성)
        let isPasswordValid = false;
        
        if (userData.password_hash.startsWith('$2a$') || userData.password_hash.startsWith('$2b$')) {
          // bcrypt 해시인 경우
          console.log('🔐 Comparing bcrypt hash...');
          isPasswordValid = await bcrypt.compare(password, userData.password_hash);
        } else {
          // 평문 비밀번호인 경우 (기존 사용자)
          console.log('🔐 Comparing plain text password...');
          isPasswordValid = userData.password_hash === password;
        }
        
        if (!isPasswordValid) {
          console.error('Password mismatch');
          throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
        }
        
        console.log('✅ Password verified successfully');
        
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

      // 프로덕션 환경: Auth 로그인 시도 (일반 회원용)
      console.log('🌐 프로덕션 환경 - Auth 로그인 시도');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authData.user && !authError) {
        // Auth 로그인 성공 - users 테이블에서 추가 정보 조회
        console.log('✅ Auth 로그인 성공 - 사용자 정보 조회 중...');
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id, email, username, role, level, template_id, center_name, logo_url, status')
          .eq('user_id', authData.user.id)
          .maybeSingle();

        if (userData) {
          // 승인대기 상태 체크
          if (userData.status === 'pending') {
            await supabase.auth.signOut(); // 로그아웃
            throw new Error('회원가입 승인 대기 중입니다. 관리자의 승인을 기다려주세요');
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
            await supabase.auth.signOut();
            throw new Error('관리자 권한이 필요합니다');
          }

          setUser(loggedInUser);
          localStorage.setItem('user', JSON.stringify(loggedInUser));

          console.log('✅ Auth 로그인 성공:', loggedInUser);
          return loggedInUser;
        }
      }
      
      // Auth 로그인 실패 → DB 비밀번호 검증으로 fallback (관리자 계정용)
      console.log('⚠️ Auth 로그인 실패 - DB 비밀번호 검증 시도');
      console.log('Auth error:', authError);
      
      // 1. 사용자 조회 (password_hash 포함)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, email, username, role, level, template_id, center_name, logo_url, password_hash, status')
        .eq('email', email)
        .maybeSingle();
      
      if (userError || !userData) {
        console.error('❌ User lookup error:', userError);
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
      }
      
      console.log('📝 User found in DB:', { email: userData.email, role: userData.role, status: userData.status });
      
      // 승인대기 상태 체크
      if (userData.status === 'pending') {
        throw new Error('회원가입 승인 대기 중입니다. 관리자의 승인을 기다려주세요');
      }
      
      // 2. 비밀번호 검증
      if (!userData.password_hash) {
        console.error('❌ No password_hash found in database');
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
      }
      
      // bcrypt 해시 비교 또는 평문 비교 (하위 호환성)
      let isPasswordValid = false;
      
      if (userData.password_hash.startsWith('$2a$') || userData.password_hash.startsWith('$2b$')) {
        // bcrypt 해시인 경우
        console.log('🔐 Comparing bcrypt hash...');
        isPasswordValid = await bcrypt.compare(password, userData.password_hash);
      } else {
        // 평문 비밀번호인 경우 (기존 사용자)
        console.log('🔐 Comparing plain text password...');
        isPasswordValid = userData.password_hash === password;
      }
      
      if (!isPasswordValid) {
        console.error('❌ Password mismatch');
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
      }
      
      console.log('✅ DB 비밀번호 검증 성공');
      
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
      
      console.log('✅ DB 비밀번호 검증 로그인 성공:', loggedInUser);
      return loggedInUser;
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
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