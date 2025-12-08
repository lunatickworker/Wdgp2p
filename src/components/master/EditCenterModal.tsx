import { useState, useEffect } from 'react';
import { X, Building2, Upload, Loader, Lock, Eye, EyeOff, Users, History, Clock } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import { recordFeeRateChange, getFeeRateHistory } from '../../utils/api/fee-rate-history';
import { useAuth } from '../../contexts/AuthContext';

interface Center {
  user_id: string;
  center_name: string;
  domain: string;
  logo_url: string | null;
  template_id: string;
  parent_user_id: string | null;
  design_theme: any;
  metadata: any;
  fee_rate: number;
}

interface Agency {
  user_id: string;
  center_name: string;
  email: string;
  is_active: boolean;
}

interface EditCenterModalProps {
  center: Center;
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATES = [
  { id: 'modern', label: 'Modern', description: '깔끔하고 현대적인 디자인' },
  { id: 'classic', label: 'Classic', description: '전통적이고 안정적인 디자인' },
  { id: 'minimal', label: 'Minimal', description: '미니멀한 심플 디자인' },
  { id: 'gaming', label: 'Gaming', description: '게이밍 스타일 디자인' },
  { id: 'luxury', label: 'Luxury', description: '고급스러운 프리미엄 디자인' }
];

export function EditCenterModal({ center, onClose, onSuccess }: EditCenterModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    center_name: center.center_name,
    domain: center.domain || '',
    template_id: center.template_id,
    parent_user_id: center.parent_user_id || '',
    logo_url: center.logo_url || '',
    fee_rate: center.fee_rate || 3,
    daily_limit: center.metadata?.limits?.dailyWithdrawal || 1000000,
    monthly_limit: center.metadata?.limits?.monthlyWithdrawal || 10000000,
    new_password: '',
    confirm_password: '',
  });
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(center.logo_url);
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [feeRateHistory, setFeeRateHistory] = useState<any[]>([]);

  // 에이전시 목록 조회
  useEffect(() => {
    fetchAgencies();
    fetchFeeRateHistory();
  }, []);

  const fetchAgencies = async () => {
    try {
      setLoadingAgencies(true);
      const { data, error } = await supabase
        .from('users')
        .select('user_id, center_name, email, is_active')
        .eq('role', 'agency')
        .eq('is_active', true)
        .order('center_name', { ascending: true });

      if (error) throw error;
      setAgencies(data || []);
    } catch (error) {
      console.error('에이전시 조회 실패:', error);
    } finally {
      setLoadingAgencies(false);
    }
  };

  const fetchFeeRateHistory = async () => {
    try {
      const { history } = await getFeeRateHistory(center.user_id);
      setFeeRateHistory(history || []);
    } catch (error) {
      console.error('수수료율 변경 이력 조회 실패:', error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('파일 크기는 2MB 이하여야 합니다');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('이미지 파일만 업로드 가능합니다');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return formData.logo_url || null;

    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${center.user_id}_${Date.now()}.${fileExt}`;
      const filePath = `center-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('로고 업로드 실패:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 패스워드 검증 (입력된 경우만)
      if (formData.new_password || formData.confirm_password) {
        if (formData.new_password !== formData.confirm_password) {
          toast.error('새 비밀번호가 일치하지 않습니다');
          setLoading(false);
          return;
        }
        if (formData.new_password.length < 8) {
          toast.error('비밀번호는 8자 이상이어야 합니다');
          setLoading(false);
          return;
        }
      }

      // 로고 업로드
      const logoUrl = await uploadLogo();

      // 업데이트할 데이터 준비
      const updateData: any = {
        center_name: formData.center_name,
        domain: formData.domain,
        template_id: formData.template_id,
        parent_user_id: formData.parent_user_id || null,
        logo_url: logoUrl,
        metadata: {
          ...center.metadata,
          limits: {
            dailyWithdrawal: parseFloat(formData.daily_limit.toString()),
            monthlyWithdrawal: parseFloat(formData.monthly_limit.toString()),
          }
        },
        updated_at: new Date().toISOString()
      };

      // 새 비밀번호가 입력된 경우
      if (formData.new_password) {
        // Edge Function 호출하여 비밀번호 변경
        const { data: resetData, error: resetError } = await supabase.functions.invoke('reset-password', {
          body: {
            userId: center.user_id,
            newPassword: formData.new_password
          }
        });

        if (resetError || !resetData?.success) {
          console.error('❌ 비밀번호 변경 실패:', resetError || resetData);
          throw new Error(resetData?.error || '비밀번호 변경에 실패했습니다');
        }
      }

      // 수수료율이 변경된 경우에만 이력 기록
      const oldFeeRate = center.fee_rate;
      const newFeeRate = parseFloat(formData.fee_rate.toString());
      
      if (oldFeeRate !== newFeeRate) {
        // fee_rate 업데이트 추가
        updateData.fee_rate = newFeeRate;
        
        // 변경 이력 기록
        await recordFeeRateChange({
          centerId: center.user_id,
          oldRate: oldFeeRate,
          newRate: newFeeRate,
          changedBy: user?.user_id || 'master'
        });
      }

      // 센터 정보 업데이트
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('user_id', center.user_id);

      if (error) throw error;

      toast.success(formData.new_password ? '센터 정보 및 비밀번호가 수정되었습니다' : '센터 정보가 수정되었습니다');
      
      // 수수료율 이력 새로고침
      if (oldFeeRate !== newFeeRate) {
        await fetchFeeRateHistory();
      }
      
      onSuccess();
    } catch (error) {
      console.error('센터 수정 실패:', error);
      toast.error('센터 수정에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-8 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-2xl my-auto shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-cyan-400">센터 정보 수정</h2>
              <p className="text-slate-400 text-sm">{center.center_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 부모 에이전시 */}
          <div>
            <label className="block text-slate-300 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              부모 에이전시 (선택사항)
            </label>
            {loadingAgencies ? (
              <div className="w-full px-4 py-3 bg-slate-800/50 border border-cyan-500/20 rounded-lg flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-slate-500">에이전시 로딩 중...</span>
              </div>
            ) : (
              <>
                <select
                  value={formData.parent_user_id}
                  onChange={(e) => setFormData({ ...formData, parent_user_id: e.target.value })}
                  className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="">마스터 직속 (에이전시 없음)</option>
                  {agencies.map((agency) => (
                    <option key={agency.user_id} value={agency.user_id}>
                      {agency.center_name} ({agency.email})
                    </option>
                  ))}
                </select>
                <p className="text-slate-500 text-xs mt-1">
                  {formData.parent_user_id ? (
                    <>
                      계층: <span className="text-purple-400">Master → Agency → Center</span>
                    </>
                  ) : (
                    <>
                      계층: <span className="text-cyan-400">Master → Center</span>
                    </>
                  )}
                </p>
              </>
            )}
          </div>

          {/* 센터명 */}
          <div>
            <label className="block text-slate-300 mb-2">
              센터명 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.center_name}
              onChange={(e) => setFormData({ ...formData, center_name: e.target.value })}
              className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              placeholder="센터 이름"
              required
            />
          </div>

          {/* 도메인 */}
          <div>
            <label className="block text-slate-300 mb-2">
              도메인 <span className="text-slate-500">(선택사항)</span>
            </label>
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              placeholder="example.com"
            />
            <p className="text-slate-500 text-xs mt-1">
              {formData.domain ? (
                <>회원용: {formData.domain} / 관리자용: admin.{formData.domain}</>
              ) : (
                '도메인을 입력하지 않으면 기본 도메인으로 접속합니다'
              )}
            </p>
          </div>

          {/* 템플릿 */}
          <div>
            <label className="block text-slate-300 mb-2">
              템플릿 <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, template_id: template.id })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    formData.template_id === template.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="text-white mb-1">{template.label}</div>
                  <div className="text-slate-400 text-xs">{template.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 로고 */}
          <div>
            <label className="block text-slate-300 mb-2">센터 로고</label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="로고 미리보기"
                  className="w-20 h-20 rounded-lg object-cover border border-cyan-500/30"
                />
              )}
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 border border-cyan-500/20 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                <Upload className="w-5 h-5 text-cyan-400" />
                <span className="text-slate-300">
                  {logoFile ? logoFile.name : '로고 이미지 선택'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-slate-500 text-xs mt-1">
              권장 크기: 200x200px, 최대 2MB
            </p>
          </div>

          {/* 수수료율 */}
          <div>
            <label className="block text-slate-300 mb-2">수수료율 (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.fee_rate}
              onChange={(e) => setFormData({ ...formData, fee_rate: parseFloat(e.target.value) })}
              className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
            <p className="text-slate-500 text-xs mt-1">
              현재: {formData.fee_rate}% (예: 0.2% = 거래당 0.2% 수수료)
            </p>
            
            {/* 수수료율 변경 이력 */}
            {feeRateHistory.length > 0 && (
              <div className="mt-4 p-4 bg-slate-800/30 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 text-sm">수수료율 변경 이력</span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {feeRateHistory.slice().reverse().map((history, index) => (
                    <div key={index} className="flex items-center justify-between text-xs py-2 border-b border-slate-700/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-400">
                          {new Date(history.changed_at).toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {history.old_rate !== null && (
                          <span className="text-slate-500">{history.old_rate}%</span>
                        )}
                        <span className="text-slate-500">→</span>
                        <span className="text-cyan-400">{history.new_rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 출금 한도 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-2">일일 출금 한도</label>
              <input
                type="number"
                min="0"
                value={formData.daily_limit}
                onChange={(e) => setFormData({ ...formData, daily_limit: parseFloat(e.target.value) })}
                className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <p className="text-slate-500 text-xs mt-1">KRW 기준</p>
            </div>
            <div>
              <label className="block text-slate-300 mb-2">월간 출금 한도</label>
              <input
                type="number"
                min="0"
                value={formData.monthly_limit}
                onChange={(e) => setFormData({ ...formData, monthly_limit: parseFloat(e.target.value) })}
                className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <p className="text-slate-500 text-xs mt-1">KRW 기준</p>
            </div>
          </div>

          {/* 비밀번호 변경 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              <label className="text-slate-300">비밀번호 변경 <span className="text-slate-500">(선택사항)</span></label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">새 비밀번호</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={formData.new_password}
                    onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                    className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="8자 이상 입력"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">비밀번호 확인</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    className="w-full bg-slate-800/50 border border-cyan-500/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    placeholder="비밀번호 다시 입력"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-slate-500 text-xs">
              💡 비밀번호를 변경하지 않으려면 비워두세요. 변경 시 8자 이상 입력하세요.
            </p>
          </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 p-6 border-t border-slate-700 flex-shrink-0 bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  수정 중...
                </>
              ) : (
                '수정 완료'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}