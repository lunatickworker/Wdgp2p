export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    card: string;
    text: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  layout: {
    type: 'horizontal-nav' | 'sidebar-nav' | 'centered-nav';
    cardStyle: 'rounded' | 'sharp' | 'bordered';
    spacing: 'compact' | 'normal' | 'spacious';
  };
  previewImage: string;
}

export const TEMPLATE_PRESETS: Record<string, TemplatePreset> = {
  modern: {
    id: 'modern',
    name: 'Modern',
    description: '깔끔하고 현대적인 디자인',
    colors: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      background: '#0F172A',
      card: '#1E293B',
      text: '#F1F5F9',
      accent: '#06B6D4'
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    layout: {
      type: 'sidebar-nav',
      cardStyle: 'rounded',
      spacing: 'normal'
    },
    previewImage: '/templates/modern.png'
  },
  classic: {
    id: 'classic',
    name: 'Classic',
    description: '전통적이고 안정적인 디자인',
    colors: {
      primary: '#1F2937',
      secondary: '#4B5563',
      background: '#FFFFFF',
      card: '#F9FAFB',
      text: '#111827',
      accent: '#3B82F6'
    },
    fonts: {
      heading: 'Georgia',
      body: 'Arial'
    },
    layout: {
      type: 'horizontal-nav',
      cardStyle: 'bordered',
      spacing: 'spacious'
    },
    previewImage: '/templates/classic.png'
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: '미니멀하고 심플한 디자인',
    colors: {
      primary: '#000000',
      secondary: '#6B7280',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#000000',
      accent: '#EF4444'
    },
    fonts: {
      heading: 'Helvetica',
      body: 'Helvetica'
    },
    layout: {
      type: 'centered-nav',
      cardStyle: 'sharp',
      spacing: 'compact'
    },
    previewImage: '/templates/minimal.png'
  },
  gaming: {
    id: 'gaming',
    name: 'Gaming',
    description: '게이밍 스타일의 역동적인 디자인',
    colors: {
      primary: '#10B981',
      secondary: '#F59E0B',
      background: '#000000',
      card: '#1A1A1A',
      text: '#FFFFFF',
      accent: '#EF4444'
    },
    fonts: {
      heading: 'Orbitron',
      body: 'Roboto'
    },
    layout: {
      type: 'sidebar-nav',
      cardStyle: 'sharp',
      spacing: 'compact'
    },
    previewImage: '/templates/gaming.png'
  },
  luxury: {
    id: 'luxury',
    name: 'Luxury',
    description: '고급스럽고 우아한 디자인',
    colors: {
      primary: '#D4AF37',
      secondary: '#8B7355',
      background: '#1C1917',
      card: '#292524',
      text: '#F5F5F4',
      accent: '#D4AF37'
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Lato'
    },
    layout: {
      type: 'centered-nav',
      cardStyle: 'rounded',
      spacing: 'spacious'
    },
    previewImage: '/templates/luxury.png'
  }
};

export function getTemplatePreset(templateId: string): TemplatePreset | null {
  return TEMPLATE_PRESETS[templateId] || null;
}

export function getAllTemplatePresets(): TemplatePreset[] {
  return Object.values(TEMPLATE_PRESETS);
}
