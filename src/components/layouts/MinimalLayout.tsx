import React from 'react';
import { LayoutProps, NavItem } from './types';
import { Home, Users, Wallet, Settings, BarChart3 } from 'lucide-react';

export function MinimalLayout({ children, tenant, template, customTheme }: LayoutProps) {
  const colors = { ...template.colors, ...customTheme?.colors };
  const fonts = { ...template.fonts, ...customTheme?.fonts };

  const navItems: NavItem[] = [
    { label: '대시보드', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: '사용자', href: '/users', icon: <Users className="w-4 h-4" /> },
    { label: '지갑', href: '/wallets', icon: <Wallet className="w-4 h-4" /> },
    { label: '통계', href: '/stats', icon: <BarChart3 className="w-4 h-4" /> },
    { label: '설정', href: '/settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: fonts.body
      }}
    >
      {/* Centered Header */}
      <header className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            {tenant.logoUrl ? (
              <img 
                src={tenant.logoUrl} 
                alt={tenant.centerName}
                className="w-16 h-16 object-cover"
              />
            ) : (
              <div 
                className="w-16 h-16 flex items-center justify-center"
                style={{ 
                  backgroundColor: colors.text,
                  color: colors.background 
                }}
              >
                <span style={{ fontFamily: fonts.heading }}>
                  {tenant.centerName[0]}
                </span>
              </div>
            )}
          </div>

          {/* Center Name */}
          <h1 
            className="text-center mb-8"
            style={{ fontFamily: fonts.heading }}
          >
            {tenant.centerName}
          </h1>

          {/* Centered Navigation */}
          <nav>
            <ul className="flex items-center justify-center gap-8">
              {navItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="flex flex-col items-center gap-2 transition-opacity"
                    style={{ color: colors.text }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Divider */}
      <div 
        className="h-px max-w-4xl mx-auto"
        style={{ backgroundColor: colors.text + '20' }}
      />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {children}
      </main>

      {/* Template Badge - Minimal corner badge */}
      <div 
        className="fixed bottom-4 right-4 px-3 py-1 text-xs"
        style={{ 
          backgroundColor: colors.accent,
          color: colors.background
        }}
      >
        MINIMAL
      </div>
    </div>
  );
}
