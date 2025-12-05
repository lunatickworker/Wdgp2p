import { TemplatePreset } from '../../utils/template-presets';

export interface LayoutProps {
  children: React.ReactNode;
  tenant: {
    id: string;
    centerName: string;
    logoUrl: string | null;
  };
  template: TemplatePreset;
  customTheme?: {
    colors?: Partial<TemplatePreset['colors']>;
    fonts?: Partial<TemplatePreset['fonts']>;
    layout?: Partial<TemplatePreset['layout']>;
  };
}

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}
