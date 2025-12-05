import { useState, useEffect } from "react";
import { X, Users, Mail, Phone, Building2 } from "lucide-react";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface Agency {
  user_id: string;
  center_name: string;
  email: string;
  phone: string | null;
  metadata?: any;
}

interface EditAgencyModalProps {
  agency: Agency;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditAgencyModal({ agency, onClose, onSuccess }: EditAgencyModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    agencyName: agency.center_name || '',
    email: agency.email || '',
    phone: agency.phone || '',
    contactPerson: agency.metadata?.contactPerson || '',
    address: agency.metadata?.address || '',
    businessNumber: agency.metadata?.businessNumber || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.agencyName) {
      toast.error('필수 항목을 모두 입력해주세요');
      return;
    }

    try {
      setLoading(true);

      // Users 테이블 업데이트 (이메일 제외)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: formData.agencyName,
          center_name: formData.agencyName,
          phone: formData.phone,
          metadata: {
            contactPerson: formData.contactPerson,
            address: formData.address,
            businessNumber: formData.businessNumber,
          }
        })
        .eq('user_id', agency.user_id);

      if (updateError) throw updateError;

      toast.success('에이전시 정보가 업데이트되었습니다');
      onSuccess();
    } catch (error: any) {
      console.error('에이전시 업데이트 실패:', error);
      toast.error(error.message || '에이전시 업데이트에 실패했습니다');
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
              <h2 className="text-cyan-400">에이전시 수정</h2>
              <p className="text-slate-400 text-sm">에이전시 정보를 수정합니다</p>
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
                  이메일 <span className="text-amber-400">(읽기 전용)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={formData.email}
                    readOnly
                    className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400 cursor-not-allowed"
                    placeholder="agency@example.com"
                  />
                </div>
                <p className="text-xs text-amber-400/70 mt-1">
                  ⚠️ 이메일은 데이터 격리의 핵심이므로 변경할 수 없습니다
                </p>
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

          {/* Info Box */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-amber-400 text-sm">
              ⚠️ 데이터 격리 보호
            </p>
            <p className="text-slate-400 text-xs mt-2">
              • 이메일은 referral_code와 연동되어 있어 변경할 수 없습니다<br />
              • 이메일 변경은 데이터 격리 시스템을 손상시킬 수 있습니다<br />
              • 비밀번호는 별도로 변경해주세요
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
                  수정 중...
                </span>
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