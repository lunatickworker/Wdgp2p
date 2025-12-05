import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check } from 'lucide-react';
import { TEMPLATE_PRESETS } from '@/utils/template-presets';

interface TemplateSelectorProps {
  value: string;
  onChange: (templateId: string) => void;
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  const templates = Object.values(TEMPLATE_PRESETS);

  return (
    <div className="space-y-4">
      <div>
        <Label>템플릿 선택</Label>
        <p className="text-sm text-gray-500 mt-1">
          센터의 전체 디자인 템플릿을 선택하세요
        </p>
      </div>

      <RadioGroup value={value} onValueChange={onChange}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <label
              key={template.id}
              htmlFor={`template-${template.id}`}
              className="cursor-pointer"
            >
              <Card
                className={`relative p-4 transition-all hover:shadow-lg ${
                  value === template.id
                    ? 'ring-2 ring-blue-500 shadow-lg'
                    : 'hover:ring-1 hover:ring-gray-300'
                }`}
              >
                {value === template.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}

                <RadioGroupItem
                  value={template.id}
                  id={`template-${template.id}`}
                  className="sr-only"
                />

                {/* 템플릿 미리보기 */}
                <div
                  className="h-32 rounded-lg mb-3 flex items-center justify-center border"
                  style={{
                    backgroundColor: template.colors.background,
                    borderColor: template.colors.primary
                  }}
                >
                  <div className="text-center space-y-2">
                    <div
                      className="text-xl font-bold"
                      style={{ color: template.colors.text }}
                    >
                      {template.name}
                    </div>
                    <div className="flex gap-2 justify-center">
                      <div
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: template.colors.primary }}
                      />
                      <div
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: template.colors.secondary }}
                      />
                      <div
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: template.colors.accent }}
                      />
                    </div>
                  </div>
                </div>

                {/* 템플릿 정보 */}
                <div className="space-y-2">
                  <h3 className="font-semibold">{template.name}</h3>
                  <p className="text-sm text-gray-500">
                    {template.description}
                  </p>

                  {/* 레이아웃 타입 */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                      {template.layout.type === 'sidebar-nav' && '사이드바'}
                      {template.layout.type === 'horizontal-nav' && '상단 메뉴'}
                      {template.layout.type === 'centered-nav' && '중앙 배치'}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                      {template.layout.cardStyle === 'rounded' && '둥근 모서리'}
                      {template.layout.cardStyle === 'sharp' && '각진 모서리'}
                      {template.layout.cardStyle === 'bordered' && '테두리'}
                    </span>
                  </div>
                </div>
              </Card>
            </label>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
