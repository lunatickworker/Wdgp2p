import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { TemplatePreset } from '@/utils/template-presets';

interface LivePreviewProps {
  template: TemplatePreset;
  customColors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    card?: string;
    text?: string;
    accent?: string;
  };
  logoUrl?: string | null;
  centerName?: string;
}

export function LivePreview({
  template,
  customColors,
  logoUrl,
  centerName = '센터 이름'
}: LivePreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // 템플릿과 커스텀 컬러 병합
  const colors = {
    ...template.colors,
    ...customColors
  };

  const getDeviceClass = () => {
    switch (device) {
      case 'desktop':
        return 'w-full h-[600px]';
      case 'tablet':
        return 'w-[768px] h-[600px] mx-auto';
      case 'mobile':
        return 'w-[375px] h-[667px] mx-auto';
    }
  };

  return (
    <div className="space-y-4">
      {/* 디바이스 선택 */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">실시간 미리보기</h3>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={device === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDevice('desktop')}
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant={device === 'tablet' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDevice('tablet')}
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant={device === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDevice('mobile')}
          >
            <Smartphone className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 미리보기 화면 */}
      <Card className="p-4 bg-gray-100 dark:bg-gray-900">
        <div className="overflow-auto">
          <div
            className={`${getDeviceClass()} rounded-lg border-4 border-gray-300 overflow-hidden transition-all`}
            style={{ backgroundColor: colors.background }}
          >
            {/* 헤더 */}
            <div
              className="p-4 border-b flex items-center justify-between"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.primary
              }}
            >
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="로고"
                    className="h-8 w-8 object-contain"
                  />
                ) : (
                  <div
                    className="h-8 w-8 rounded flex items-center justify-center"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <span style={{ color: colors.background }}>L</span>
                  </div>
                )}
                <span
                  className="font-semibold"
                  style={{ color: colors.text }}
                >
                  {centerName}
                </span>
              </div>
              <div className="flex gap-2">
                {['메뉴1', '메뉴2', '메뉴3'].map((menu, i) => (
                  <div
                    key={i}
                    className="px-3 py-1 rounded text-sm"
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.background
                    }}
                  >
                    {menu}
                  </div>
                ))}
              </div>
            </div>

            {/* 컨텐츠 영역 */}
            <div className="p-6 space-y-4">
              {/* 대시보드 카드들 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['통계 1', '통계 2', '통계 3'].map((stat, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg"
                    style={{
                      backgroundColor: colors.card,
                      borderLeft: `4px solid ${i === 0 ? colors.primary : i === 1 ? colors.secondary : colors.accent}`
                    }}
                  >
                    <div
                      className="text-sm opacity-70 mb-1"
                      style={{ color: colors.text }}
                    >
                      {stat}
                    </div>
                    <div
                      className="text-2xl font-bold"
                      style={{ color: colors.text }}
                    >
                      {(i + 1) * 1234}
                    </div>
                  </div>
                ))}
              </div>

              {/* 메인 컨텐츠 카드 */}
              <div
                className="p-6 rounded-lg"
                style={{ backgroundColor: colors.card }}
              >
                <h3
                  className="text-xl font-bold mb-4"
                  style={{ color: colors.text }}
                >
                  주요 컨텐츠
                </h3>
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between p-3 rounded"
                      style={{
                        backgroundColor: colors.background,
                        opacity: 0.8
                      }}
                    >
                      <span style={{ color: colors.text }}>
                        항목 {item}
                      </span>
                      <div
                        className="px-4 py-1 rounded text-sm"
                        style={{
                          backgroundColor: colors.accent,
                          color: colors.background
                        }}
                      >
                        버튼
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 컬러 정보 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {Object.entries(colors).map(([key, value]) => (
          <div key={key} className="text-center">
            <div
              className="h-12 rounded border border-gray-300 mb-1"
              style={{ backgroundColor: value }}
            />
            <div className="text-xs text-gray-500 capitalize">
              {key}
            </div>
            <div className="text-xs font-mono text-gray-400">
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
