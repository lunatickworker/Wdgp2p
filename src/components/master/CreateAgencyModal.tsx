import { useState, useEffect } from "react";
import { X, Users, Mail, Phone, Building2, Check, AlertCircle } from "lucide-react";
import { supabase } from "../../utils/supabase/client";
import { checkEmailAvailability } from "../../utils/api/check-email";
import { toast } from "sonner@2.0.3";
import bcrypt from 'bcryptjs';
import { useAuth } from "../../contexts/AuthContext";

interface CreateAgencyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAgencyModal({ onClose, onSuccess }: CreateAgencyModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    agencyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    contactPerson: '',
    address: '',
    businessNumber: '',
  });
  const [emailAvailable, setEmailAvailable] = useState(true);
  const [emailChecked, setEmailChecked] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (formData.email && emailChecked) {
      checkEmailAvailability(formData.email)
        .then((available) => setEmailAvailable(available))
        .catch((error) => {
          console.error('이메일 확인 실패:', error);
          toast.error('이메일 확인에 실패했습니다. 다시 시도해주세요.');
        });
    }
  }, [formData.email, emailChecked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.agencyName || !formData.email || !formData.password) {
      toast.error('필수 항목을 모두 입력해주세요');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('비밀번호는 최소 8자 이상이어야 합니다');
      return;
    }

    if (!emailAvailable) {
      toast.error('이미 존재하는 이메일입니다');
      return;
    }

    try {
      setLoading(true);

      // 1. DB에 사용자 생성 (Auth 없이)
      const agencyId = self.crypto.randomUUID();
      const passwordHash = await bcrypt.hash(formData.password, 10);
      const referralCode = formData.email.split('@')[0].toLowerCase();

      const { error: dbError } = await supabase
        .from('users')
        .insert({
          user_id: agencyId,
          email: formData.email,
          username: formData.agencyName,
          center_name: formData.agencyName,
          password_hash: passwordHash,
          referral_code: referralCode,
          role: 'agency',
          parent_user_id: user?.id,
          level: 'Standard',
          status: 'active',
          is_active: true,
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('DB error:', dbError);
        throw dbError;
      }

      toast.success('에이전시가 성공적으로 생성되었습니다');
      onSuccess();
    } catch (error: any) {
      console.error('에이전시 생성 실패:', error);
      
      if (error.message.includes('duplicate key') || error.code === '23505') {
        toast.error('이미 존재하는 이메일입니다');
      } else if (error.message.includes('User already registered')) {
        toast.error('이미 등록된 이메일입니다. 다른 이메일을 사용해주세요.');
      } else if (error.message.includes('invalid email') || error.message.includes('invalid_email')) {
        toast.error('유효하지 않은 이메일 형식입니다. 실제 도메인을 사용해주세요 (예: @gmail.com, @naver.com)');
      } else if (error.message.includes('Email rate limit exceeded')) {
        toast.error('이메일 전송 제한에 도달했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        toast.error(error.message || '에이전시 생성에 실패했습니다. 관리자에게 문의하세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-cyan-500/20 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-cyan-400">에이전시 생성</h2>
              <p className="text-slate-400 text-sm">새로운 에이전시 계정을 생성합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-slate-300 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              기본 정보
            </h3>
            
            <div>
              <label className="block text-slate-400 text-sm mb-2">
                에이전시명 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.agencyName}
                onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="GMS 에이전시"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">
                  이메일 <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    placeholder="agency@gmail.com"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  실제 도메인을 사용하세요 (예: @gmail.com, @naver.com)
                </p>
                {emailChecked && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailAvailable ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">연락처</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    placeholder="010-1234-5678"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">담당자</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="홍길동"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">사업자 번호</label>
              <input
                type="text"
                value={formData.businessNumber}
                onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="123-45-67890"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">주소</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="서울시 강남구..."
              />
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4 pt-4 border-t border-slate-700">
            <h3 className="text-slate-300">계정 정보</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">
                  비밀번호 <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="최소 8자 이상"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">
                  비밀번호 확인 <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  placeholder="비밀번호 재입력"
                  required
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <p className="text-cyan-400 text-sm">
              ℹ️ 에이전시 생성 시 관리자 계정이 자동으로 생성됩니다.
            </p>
            <p className="text-slate-400 text-xs mt-2">
              • 에이전시는 하위 센터와 가맹점을 관리할 수 있습니다<br />
              • 생성된 계정으로 관리자 페이지에 로그인할 수 있습니다
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  생성 중...
                </span>
              ) : (
                '에이전시 생성'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}