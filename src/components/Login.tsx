import { useState } from 'react';
import { Activity, Lock, Mail, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';

interface LoginProps {
  onLoginSuccess?: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // admin 페이지에서 로그인하는 것으로 표시
      const user = await login(email, password, true);
      toast.success('로그인 성공');
      
      console.log('🔄 Redirecting user with role:', user.role);
      
      // 역할에 따라 즉시 리디렉션
      if (user.role === 'master') {
        console.log('→ Redirecting to #master');
        window.location.hash = '#master';
      } else if (['center', 'agency', 'store', 'admin'].includes(user.role)) {
        console.log('→ Redirecting to #admin');
        window.location.hash = '#admin';
      } else {
        console.log('→ Redirecting to home');
        window.location.hash = '';
      }
      
      // onLoginSuccess 호출하여 상태 업데이트
      onLoginSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '로그인 실패');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div 
              className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-cyan-500 flex items-center justify-center"
              style={{ boxShadow: '0 0 20px rgba(6, 182, 212, 0.8), inset 0 0 20px rgba(6, 182, 212, 0.3)' }}
            >
              <Activity className="w-8 h-8 text-cyan-400" style={{ filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 1))' }} />
            </div>
          </div>
          <h1 className="text-cyan-400 text-2xl mb-2">Admin Console</h1>
          <p className="text-slate-400">관리자 전용 페이지</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-slate-300 mb-2">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="관리자 이메일"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-2">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="비밀번호"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900/50 border border-cyan-500 text-cyan-400 py-3 rounded-lg hover:bg-cyan-500/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>관리자 로그인</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}