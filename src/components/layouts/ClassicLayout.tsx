import React from 'react';
import { LayoutProps, NavItem } from './types';
import { Home, Users, Wallet, Settings, BarChart3 } from 'lucide-react';

export function ClassicLayout({ children, tenant, template, customTheme }: LayoutProps) {
  const colors = { ...template.colors, ...customTheme?.colors };
  const fonts = { ...template.fonts, ...customTheme?.fonts };

  const navItems: NavItem[] = [
    { label: '대시보드', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: '사용자 관리', href: '/users', icon: <Users className="w-4 h-4" /> },
    { label: '지갑 관리', href: '/wallets', icon: <Wallet className="w-4 h-4" /> },
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
      {/* Top Navigation Bar */}
      <header
        className="border-b"
        style={{ 
          backgroundColor: colors.card,
          borderColor: colors.primary + '30'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {tenant.logoUrl ? (
                <img 
                  src={tenant.logoUrl} 
                  alt={tenant.centerName}
                  className="w-10 h-10 object-cover border-2"
                  style={{ borderColor: colors.primary }}
                />
              ) : (
                <div 
                  className="w-10 h-10 border-2 flex items-center justify-center"
                  style={{ 
                    borderColor: colors.primary,
                    color: colors.primary 
                  }}
                >
                  <span style={{ fontFamily: fonts.heading }}>
                    {tenant.centerName[0]}
                  </span>
                </div>
              )}
              <h1 style={{ fontFamily: fonts.heading }}>{tenant.centerName}</h1>
            </div>

            {/* Navigation */}
            <nav>
              <ul className="flex items-center gap-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="flex items-center gap-2 px-4 py-2 border transition-colors"
                      style={{
                        borderColor: 'transparent',
                        color: colors.text,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = colors.primary;
                        e.currentTarget.style.backgroundColor = colors.background;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Template Badge */}
            <div 
              className="px-4 py-2 border"
              style={{ 
                borderColor: colors.accent,
                color: colors.accent
              }}
            >
              Classic Template
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div 
          className="border p-6"
          style={{ 
            backgroundColor: colors.card,
            borderColor: colors.primary + '30'
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
