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
    checkAuthSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      const sessionPromise = supabase.auth.getSession();
      
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setIsLoading(false);
        } catch (error) {
          localStorage.removeItem('user');
        }
      } else {
        setIsLoading(false);
      }

      const { data: { session } } = await sessionPromise;
      
      if (session?.user) {
        await handleOAuthLogin(session.user);
      }
    } catch (error) {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (authUser: any) => {
    try {
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
        throw new Error('사용자 정보 조회 실패');
      }

      // 3. 기존 사용자가 있으면 바로 로그인 처리
      if (existingUser) {
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
        return;
      }

      // 4. 신규 사용자 - users 테이블에 생성
      const metadataRole = authUser.user_metadata?.role;
      if (metadataRole && ['center', 'agency', 'store', 'admin', 'master'].includes(metadataRole)) {
        // 관리자 role인 경우 자동 삽입하지 않음 (센터 생성 API에서 처리)
        setTimeout(async () => {
          try {
            const { data: adminUser } = await supabase
              .from('users')
              .select('user_id, email, username, role, level, template_id, center_name, logo_url, status')
              .eq('user_id', authUser.id)
              .maybeSingle();
            
            if (adminUser) {
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
            }
          } catch (error) {
            // Silent fail
          }
        }, 1000);
        
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
          if (insertError.code === '23505') {
            const { data: retryUser } = await supabase
              .from('users')
              .select('user_id, email, username, role, level, template_id, center_name, logo_url, status')
              .eq('user_id', authUser.id)
              .single();

            if (retryUser) {
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
              return;
            }
          }
          
          throw insertError;
        }

        const loggedInUser: User = {
          id: authUser.id,
          email: authUser.email,
          username: newUser.username,
          role: 'user',
        };

        setUser(loggedInUser);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        return;

      } catch (insertError: any) {
        if (insertError.code === '23505') {
          const { data: finalUser } = await supabase
            .from('users')
            .select('user_id, email, username, role, level, template_id, center_name, logo_url, status')
            .eq('user_id', authUser.id)
            .single();

          if (finalUser) {
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
            return;
          }
        }
        
        throw new Error('사용자 생성 실패');
      }

    } catch (error) {
      throw error;
    }
  };

  const login = async (email: string, password: string, isAdminPage: boolean = false): Promise<User> => {
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const isFigmaEnv = hostname.includes('.figma.com') || hostname.includes('figma.site') || hostname.includes('fig.ma');
      
      if (isFigmaEnv) {
        return await performDBPasswordLogin(email, password, isAdminPage);
      }

      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authData.user && !authError) {
          const { data: userData } = await supabase
            .from('users')
            .select('user_id, email, username, role, level, template_id, center_name, logo_url, status')
            .eq('user_id', authData.user.id)
            .maybeSingle();

          if (userData) {
            if (userData.status === 'pending') {
              await supabase.auth.signOut();
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

            if (isAdminPage && !['center', 'agency', 'store', 'admin', 'master'].includes(loggedInUser.role)) {
              await supabase.auth.signOut();
              throw new Error('관리자 권한이 필요합니다');
            }

            setUser(loggedInUser);
            localStorage.setItem('user', JSON.stringify(loggedInUser));
            return loggedInUser;
          }
        }
      } catch (authException) {
        // Auth 실패 - fallback으로 계속 진행
      }
      
      return await performDBPasswordLogin(email, password, isAdminPage);
      
    } catch (error: any) {
      throw error;
    }
  };

  const performDBPasswordLogin = async (email: string, password: string, isAdminPage: boolean): Promise<User> => {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, email, username, role, level, template_id, center_name, logo_url, password_hash, status')
      .eq('email', email)
      .maybeSingle();
    
    if (userError || !userData) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
    }
    
    if (userData.status === 'pending') {
      throw new Error('회원가입 승인 대기 중입니다. 관리자의 승인을 기다려주세요');
    }
    
    if (!userData.password_hash) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
    }
    
    let isPasswordValid = false;
    
    try {
      if (userData.password_hash.startsWith('$2a$') || userData.password_hash.startsWith('$2b$')) {
        isPasswordValid = await bcrypt.compare(password, userData.password_hash);
      } else {
        isPasswordValid = userData.password_hash === password;
      }
    } catch (bcryptError) {
      throw new Error('비밀번호 검증 중 오류가 발생했습니다');
    }
    
    if (!isPasswordValid) {
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
    
    if (isAdminPage && !['center', 'agency', 'store', 'admin', 'master'].includes(loggedInUser.role)) {
      throw new Error('관리자 권한이 필요합니다');
    }
    
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    return loggedInUser;
  };

  const logout = () => {
    supabase.auth.signOut(); // Supabase Auth 로그아웃
    setUser(null);
    localStorage.removeItem('user');
  };

  const refreshUser = async () => {
    if (!user) return;

    try {
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
      }
    } catch (error) {
      // Silent fail
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