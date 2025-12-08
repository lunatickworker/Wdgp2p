import { useState, useEffect } from "react";
import { X, Upload, Check, Building2, AlertCircle } from "lucide-react";
import { TemplateSelector } from "../admin/TemplateSelector";
import { createCenter } from "../../utils/api/create-center";
import { supabase } from "../../utils/supabase/client";
import { checkEmailAvailability } from "../../utils/api/check-email";
import { toast } from "sonner@2.0.3";

interface Agency {
  user_id: string;
  center_name: string;
  email: string;
  is_active: boolean;
}

interface CreateCenterModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCenterModal({ onClose, onSuccess }: CreateCenterModalProps) {
  const [step, setStep] = useState<'info' | 'template' | 'confirm'>('info');
  const [loading, setLoading] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(true);
  
  const [formData, setFormData] = useState({
    centerName: '',
    domain: '',
    email: '',
    password: '',
    parentAgencyId: '' as string, // 빈 문자열 = 마스터 직속
    templateId: 'modern' as 'modern' | 'classic' | 'minimal' | 'gaming' | 'luxury',
    logoFile: null as File | null,
    feeRate: 3 // 기본 수수료율 3%
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  // 에이전시 목록 조회
  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    try {
      setLoadingAgencies(true);
      const { data, error } = await supabase
        .from('users')
        .select('user_id, center_name, email, is_active')
        .eq('role', 'agency')
        .eq('is_active', true) // 활성화된 에이전시만
        .order('center_name', { ascending: true });

      if (error) throw error;
      setAgencies(data || []);
    } catch (error) {
      console.error('에이전시 조회 실패:', error);
      toast.error('에이전시 목록을 불러오는데 실패했습니다');
    } finally {
      setLoadingAgencies(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, logoFile: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 이메일 중복 검사
  const handleEmailChange = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailAvailable(null);
      return;
    }

    try {
      setEmailChecking(true);
      const isAvailable = await checkEmailAvailability(email);
      setEmailAvailable(isAvailable);
      
      if (!isAvailable) {
        const referralCode = email.split('@')[0];
        toast.error(`이미 사용 중인 referral_code입니다 (${referralCode})`);
      }
    } catch (error) {
      console.error('이메일 중복 검사 실패:', error);
      setEmailAvailable(null);
    } finally {
      setEmailChecking(false);
    }
  };

  // 이메일 변경 시 디바운스 처리
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email) {
        handleEmailChange(formData.email);
      } else {
        setEmailAvailable(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email]);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      console.log('🚀 센터 생성 시작:', formData);

      // 유효성 검사 - 어떤 필드가 비었는지 명확히 알림
      const missingFields = [];
      if (!formData.centerName) missingFields.push('센터 이름');
      if (!formData.email) missingFields.push('관리자 이메일');
      if (!formData.password) missingFields.push('비밀번호');
      
      console.log('📋 필수 필드 체크:', {
        centerName: formData.centerName,
        email: formData.email,
        password: formData.password ? '***' : '(없음)',
        missingFields
      });

      if (missingFields.length > 0) {
        console.error('❌ 필수 필드 누락:', missingFields);
        toast.error(`다음 필수 항목을 입력해주세요: ${missingFields.join(', ')}`);
        return;
      }

      // 이메일 중복 확인
      if (emailAvailable === false) {
        console.error('❌ 이메일 중복');
        toast.error('이미 사용 중인 이메일입니다');
        return;
      }

      // 수수료율 검증
      if (formData.feeRate < 0 || formData.feeRate > 100) {
        console.error('❌ 수수료율 범위 오류:', formData.feeRate);
        toast.error('수수료율은 0~100% 사이로 입력해주세요');
        return;
      }

      // 도메인이 입력된 경우에만 형식 검사
      if (formData.domain) {
        const domainRegex = /^[a-z0-9-]+\.[a-z]{2,}$/;
        if (!domainRegex.test(formData.domain)) {
          console.error('❌ 도메인 형식 오류:', formData.domain);
          toast.error('올바른 도메인 형식을 입력해주세요 (예: example.com)');
          return;
        }
      }

      console.log('✅ 유효성 검사 통과, API 호출 시작...');

      const result = await createCenter({
        centerName: formData.centerName,
        domain: formData.domain || undefined, // 빈 문자열이면 undefined
        email: formData.email,
        password: formData.password,
        parentAgencyId: formData.parentAgencyId || undefined,
        templateId: formData.templateId,
        logoFile: formData.logoFile || undefined,
        feeRate: formData.feeRate
      });

      console.log('📦 API 응답:', result);

      if (result.success) {
        console.log('✅ 센터 생성 성공!');
        toast.success('센터가 성공적으로 생성되었습니다');
        onSuccess();
      } else {
        console.error('❌ 센터 생성 실패:', result.error);
        toast.error(result.error || '센터 생성에 실패했습니다');
      }
    } catch (error: any) {
      console.error('❌ 센터 생성 예외:', error);
      toast.error(error.message || '센터 생성 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-cyan-500/30 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-cyan-400">새 센터 생성</h2>
            <p className="text-slate-400 text-sm mt-1">센터 정보와 디자인을 설정하세요</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-cyan-400 text-sm">기본 정보</h3>
            
            {/* 부모 에이전시 선택 (선택사항) */}
            <div>
              <label className="block text-slate-400 text-sm mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                부모 에이전시 (선택사항)
              </label>
              {loadingAgencies ? (
                <div className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-slate-500">에이전시 로딩 중...</span>
                </div>
              ) : (
                <>
                  <select
                    value={formData.parentAgencyId}
                    onChange={(e) => setFormData({ ...formData, parentAgencyId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">마스터 직속 (에이전시 없음)</option>
                    {agencies.map((agency) => (
                      <option key={agency.user_id} value={agency.user_id}>
                        {agency.center_name} ({agency.email})
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">센터 이름 *</label>
              <input
                type="text"
                value={formData.centerName}
                onChange={(e) => setFormData({ ...formData, centerName: e.target.value })}
                placeholder="예: Premium Crypto Center"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-slate-500 text-xs mt-1">
                회원에게 표시될 센터의 브랜드명입니다
              </p>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">주도메인 (선택사항)</label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="예: premium.com (admin.premium.com은 자동 생성)"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-slate-500 text-xs mt-1">
                {formData.domain ? (
                  <>
                    자동 생성: <span className="text-cyan-400">{formData.domain}</span> (회원용), 
                    <span className="text-purple-400 ml-1">admin.{formData.domain}</span> (관리자용)
                  </>
                ) : (
                  '도메인 없이도 센터 생성 가능 (나중에 추가 가능)'
                )}
              </p>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">관리자 이메일 *</label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@premium.com"
                  className={`w-full px-4 py-2 pr-10 bg-slate-800 border rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none transition-colors ${
                    emailAvailable === true
                      ? "border-green-500/50 focus:border-green-500"
                      : emailAvailable === false
                      ? "border-red-500/50 focus:border-red-500"
                      : "border-slate-700 focus:border-cyan-500"
                  }`}
                />
                {emailChecking && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {!emailChecking && emailAvailable === true && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                )}
                {!emailChecking && emailAvailable === false && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
              </div>
              <p className={`text-xs mt-1 ${
                emailAvailable === false
                  ? "text-red-400"
                  : "text-slate-500"
              }`}>
                {emailAvailable === false ? "중복" : "추천인 코드 : @앞부분"}
              </p>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">비밀번호 *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="안전한 비밀번호 (8자 이상 권장)"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">수수료율 (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.feeRate}
                onChange={(e) => setFormData({ ...formData, feeRate: parseFloat(e.target.value) || 0 })}
                placeholder="3.0"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-slate-500 text-xs mt-1">
                센터의 거래 수수료율 (기본값: 3.0%)
              </p>
            </div>
          </div>

          {/* Step 2: Logo Upload */}
          <div className="space-y-4">
            <h3 className="text-cyan-400 text-sm">로고 (선택)</h3>
            
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center">
              {logoPreview ? (
                <div className="space-y-3">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="w-24 h-24 mx-auto rounded-lg object-cover"
                  />
                  <button
                    onClick={() => {
                      setFormData({ ...formData, logoFile: null });
                      setLogoPreview(null);
                    }}
                    className="text-slate-400 hover:text-red-400 text-sm transition-colors"
                  >
                    삭제
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm mb-1">클릭하여 로고 업로드</p>
                  <p className="text-slate-500 text-xs">PNG, JPG, WEBP (최대 5MB)</p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Step 3: Template Selection */}
          <div className="space-y-4">
            <h3 className="text-cyan-400 text-sm">디자인 템플릿</h3>
            <TemplateSelector
              value={formData.templateId}
              onChange={(templateId) => setFormData({ 
                ...formData, 
                templateId: templateId as 'modern' | 'classic' | 'minimal' | 'gaming' | 'luxury'
              })}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-cyan-500/30 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            disabled={loading}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || emailAvailable === false}
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                생성 중...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                센터 생성
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}