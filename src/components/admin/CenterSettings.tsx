import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Save, Settings, Copy, Check } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { TemplateSelector } from './TemplateSelector';
import { LogoUploader } from './LogoUploader';
import { LivePreview } from './LivePreview';
import { TEMPLATE_PRESETS } from '@/utils/template-presets';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface CenterSettingsProps {
  centerId: string;
}

export function CenterSettings({ centerId }: CenterSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // 센터 정보
  const [centerName, setCenterName] = useState('');
  const [domain, setDomain] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState('modern');
  const [referralCode, setReferralCode] = useState('');
  
  // 커스텀 컬러
  const [customColors, setCustomColors] = useState({
    primary: '',
    secondary: '',
    background: '',
    card: '',
    text: '',
    accent: ''
  });

  // 센터 정보 로드
  useEffect(() => {
    loadCenterInfo();
  }, [centerId]);

  const loadCenterInfo = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('center_name, domain, logo_url, template_id, design_theme, referral_code, email')
        .eq('user_id', centerId)
        .eq('role', 'center')
        .single();

      if (error) throw error;

      if (data) {
        setCenterName(data.center_name || '');
        setDomain(data.domain || '');
        setLogoUrl(data.logo_url);
        setTemplateId(data.template_id || 'modern');
        
        // referral_code 설정 (없으면 이메일에서 생성)
        const code = data.referral_code || data.email?.split('@')[0] || '';
        setReferralCode(code.toLowerCase());
        
        // design_theme에서 커스텀 컬러 로드
        if (data.design_theme?.colors) {
          setCustomColors({
            primary: data.design_theme.colors.primary || '',
            secondary: data.design_theme.colors.secondary || '',
            background: data.design_theme.colors.background || '',
            card: data.design_theme.colors.card || '',
            text: data.design_theme.colors.text || '',
            accent: data.design_theme.colors.accent || ''
          });
        }
      }
    } catch (error: any) {
      toast.error('센터 정보를 불러올 수 없습니다');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 커스텀 컬러 필터링 (빈 값 제거)
      const filteredColors = Object.entries(customColors).reduce(
        (acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      );

      const designTheme = {
        colors: filteredColors
      };

      const { error } = await supabase
        .from('users')
        .update({
          center_name: centerName,
          domain,
          template_id: templateId,
          design_theme: designTheme
        })
        .eq('user_id', centerId);

      if (error) throw error;

      toast.success('설정이 저장되었습니다');
    } catch (error: any) {
      toast.error('설정 저장에 실패했습니다');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      // Fallback 방식을 기본으로 사용 (권한 문제 회피)
      const textArea = document.createElement('textarea');
      textArea.value = referralCode;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        toast.success('추천인 코드가 복사되었습니다');
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('Copy command failed');
      }
    } catch (error) {
      console.error('복사 실패:', error);
      toast.error('복사에 실패했습니다');
    }
  };

  const currentTemplate = TEMPLATE_PRESETS[templateId] || TEMPLATE_PRESETS.modern;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">설정 로드 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">센터 설정</h1>
            <p className="text-gray-500">센터 정보 및 디자인 관리</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>

      <Separator />

      {/* 설정 탭 */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">기본 정보</TabsTrigger>
          <TabsTrigger value="template">템플릿</TabsTrigger>
          <TabsTrigger value="colors">색상</TabsTrigger>
          <TabsTrigger value="preview">미리보기</TabsTrigger>
        </TabsList>

        {/* 기본 정보 탭 */}
        <TabsContent value="basic" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">기본 정보</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="centerName">센터 이름</Label>
                    <Input
                      id="centerName"
                      value={centerName}
                      onChange={(e) => setCenterName(e.target.value)}
                      placeholder="센터 이름을 입력하세요"
                    />
                  </div>

                  <div>
                    <Label htmlFor="domain">주도메인</Label>
                    <Input
                      id="domain"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="example.com"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      회원용 주도메인 (관리자용은 자동으로 admin.{domain} 생성됨)
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 추천인 코드 섹션 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">추천인 코드</h3>
                <p className="text-sm text-gray-500 mb-4">
                  가맹점이 가입할 때 이 코드를 사용합니다. 코드를 공유하여 하위 가맹점을 등록하세요.
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label htmlFor="referralCode">센터 추천인 코드</Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="referralCode"
                        value={referralCode}
                        readOnly
                        className="pr-24 text-lg bg-gray-50"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={copyToClipboard}
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            복사됨
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            복사
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 <strong>사용 방법:</strong> 가맹점 관리자에게 이 코드를 전달하여 가입 시 입력하도록 안내하세요.
                  </p>
                </div>
              </div>

              <Separator />

              {/* 로고 업로드 */}
              <LogoUploader
                centerId={centerId}
                currentLogoUrl={logoUrl}
                onUploadSuccess={(url) => setLogoUrl(url)}
                onDeleteSuccess={() => setLogoUrl(null)}
              />
            </div>
          </Card>
        </TabsContent>

        {/* 템플릿 탭 */}
        <TabsContent value="template" className="space-y-6">
          <Card className="p-6">
            <TemplateSelector
              value={templateId}
              onChange={setTemplateId}
            />
          </Card>
        </TabsContent>

        {/* 색상 탭 */}
        <TabsContent value="colors" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">커스텀 색상</h3>
                <p className="text-sm text-gray-500">
                  선택한 템플릿의 색상을 커스터마이징할 수 있습니다.
                  빈 값으로 두면 템플릿 기본 색상이 사용됩니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ColorPicker
                  label="Primary 색상"
                  value={customColors.primary || currentTemplate.colors.primary}
                  onChange={(color) =>
                    setCustomColors({ ...customColors, primary: color })
                  }
                />
                <ColorPicker
                  label="Secondary 색상"
                  value={customColors.secondary || currentTemplate.colors.secondary}
                  onChange={(color) =>
                    setCustomColors({ ...customColors, secondary: color })
                  }
                />
                <ColorPicker
                  label="Background 색상"
                  value={customColors.background || currentTemplate.colors.background}
                  onChange={(color) =>
                    setCustomColors({ ...customColors, background: color })
                  }
                />
                <ColorPicker
                  label="Card 색상"
                  value={customColors.card || currentTemplate.colors.card}
                  onChange={(color) =>
                    setCustomColors({ ...customColors, card: color })
                  }
                />
                <ColorPicker
                  label="Text 색상"
                  value={customColors.text || currentTemplate.colors.text}
                  onChange={(color) =>
                    setCustomColors({ ...customColors, text: color })
                  }
                />
                <ColorPicker
                  label="Accent 색상"
                  value={customColors.accent || currentTemplate.colors.accent}
                  onChange={(color) =>
                    setCustomColors({ ...customColors, accent: color })
                  }
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCustomColors({
                    primary: '',
                    secondary: '',
                    background: '',
                    card: '',
                    text: '',
                    accent: ''
                  })
                }
              >
                템플릿 기본 색상으로 초기화
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* 미리보기 탭 */}
        <TabsContent value="preview" className="space-y-6">
          <Card className="p-6">
            <LivePreview
              template={currentTemplate}
              customColors={customColors}
              logoUrl={logoUrl}
              centerName={centerName || '센터 이름'}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}