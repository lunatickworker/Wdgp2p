import React from 'react';
import { LayoutProps } from './types';
import { ModernLayout } from './ModernLayout';
import { ClassicLayout } from './ClassicLayout';
import { MinimalLayout } from './MinimalLayout';
import { GamingLayout } from './GamingLayout';
import { LuxuryLayout } from './LuxuryLayout';
import { TEMPLATE_PRESETS } from '../../utils/template-presets';

interface LayoutProviderProps {
  children: React.ReactNode;
  tenant: {
    id: string;
    centerName: string;
    logoUrl: string | null;
    templateId?: string;
  };
  customTheme?: LayoutProps['customTheme'];
}

export function LayoutProvider({ children, tenant, customTheme }: LayoutProviderProps) {
  // Get template from tenant settings or default to 'modern'
  const templateId = tenant.templateId || 'modern';
  const template = TEMPLATE_PRESETS[templateId] || TEMPLATE_PRESETS.modern;

  const layoutProps: LayoutProps = {
    children,
    tenant,
    template,
    customTheme,
  };

  // Select layout component based on template type
  switch (template.layout.type) {
    case 'sidebar-nav':
      // Modern and Gaming use sidebar
      if (templateId === 'gaming') {
        return <GamingLayout {...layoutProps} />;
      }
      return <ModernLayout {...layoutProps} />;

    case 'horizontal-nav':
      // Classic uses horizontal nav
      return <ClassicLayout {...layoutProps} />;

    case 'centered-nav':
      // Minimal and Luxury use centered nav
      if (templateId === 'luxury') {
        return <LuxuryLayout {...layoutProps} />;
      }
      return <MinimalLayout {...layoutProps} />;

    default:
      return <ModernLayout {...layoutProps} />;
  }
}

// Layout selector component for template preview/selection
interface LayoutSelectorProps {
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  tenant: {
    id: string;
    centerName: string;
    logoUrl: string | null;
  };
}

export function LayoutSelector({ selectedTemplateId, onSelectTemplate, tenant }: LayoutSelectorProps) {
  const templates = Object.values(TEMPLATE_PRESETS);

  return (
    <div className="p-6">
      <h2 className="mb-6">템플릿 선택</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template.id)}
            className="text-left transition-all rounded-lg overflow-hidden border-2"
            style={{
              borderColor: selectedTemplateId === template.id 
                ? template.colors.primary 
                : 'transparent',
              backgroundColor: template.colors.card,
            }}
          >
            {/* Preview */}
            <div 
              className="h-40 flex items-center justify-center relative overflow-hidden"
              style={{ backgroundColor: template.colors.background }}
            >
              {/* Mini layout preview */}
              <div className="absolute inset-0 p-4">
                {template.layout.type === 'sidebar-nav' && (
                  <div className="flex gap-2 h-full">
                    <div 
                      className="w-16 rounded"
                      style={{ backgroundColor: template.colors.card }}
                    />
                    <div className="flex-1 flex flex-col gap-2">
                      <div 
                        className="h-8 rounded"
                        style={{ backgroundColor: template.colors.card }}
                      />
                      <div 
                        className="flex-1 rounded"
                        style={{ backgroundColor: template.colors.card }}
                      />
                    </div>
                  </div>
                )}
                {template.layout.type === 'horizontal-nav' && (
                  <div className="flex flex-col gap-2 h-full">
                    <div 
                      className="h-12 rounded"
                      style={{ backgroundColor: template.colors.card }}
                    />
                    <div 
                      className="flex-1 rounded"
                      style={{ backgroundColor: template.colors.card }}
                    />
                  </div>
                )}
                {template.layout.type === 'centered-nav' && (
                  <div className="flex flex-col gap-2 h-full items-center">
                    <div 
                      className="w-full h-12 rounded"
                      style={{ backgroundColor: template.colors.card }}
                    />
                    <div 
                      className="w-4/5 flex-1 rounded"
                      style={{ backgroundColor: template.colors.card }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-4" style={{ color: template.colors.text }}>
              <h3 
                className="mb-2"
                style={{ 
                  fontFamily: template.fonts.heading,
                  color: template.colors.primary
                }}
              >
                {template.name}
              </h3>
              <p className="text-sm opacity-70">{template.description}</p>
              
              {/* Color palette */}
              <div className="flex gap-2 mt-3">
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: template.colors.primary }}
                  title="Primary"
                />
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: template.colors.secondary }}
                  title="Secondary"
                />
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: template.colors.accent }}
                  title="Accent"
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
