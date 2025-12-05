import React from 'react';
import { LayoutProps, NavItem } from './types';
import { Home, Users, Wallet, Settings, BarChart3, Crown } from 'lucide-react';

export function LuxuryLayout({ children, tenant, template, customTheme }: LayoutProps) {
  const colors = { ...template.colors, ...customTheme?.colors };
  const fonts = { ...template.fonts, ...customTheme?.fonts };

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { label: 'Users', href: '/users', icon: <Users className="w-4 h-4" /> },
    { label: 'Wallets', href: '/wallets', icon: <Wallet className="w-4 h-4" /> },
    { label: 'Statistics', href: '/stats', icon: <BarChart3 className="w-4 h-4" /> },
    { label: 'Settings', href: '/settings', icon: <Settings className="w-4 h-4" /> },
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
      {/* Luxury Header */}
      <header className="py-8 border-b" style={{ borderColor: colors.primary + '30' }}>
        <div className="max-w-5xl mx-auto px-4">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              {tenant.logoUrl ? (
                <div className="relative">
                  <img 
                    src={tenant.logoUrl} 
                    alt={tenant.centerName}
                    className="w-20 h-20 rounded-full object-cover"
                    style={{ border: `3px solid ${colors.primary}` }}
                  />
                  <Crown 
                    className="absolute -top-2 -right-2 w-6 h-6"
                    style={{ color: colors.accent }}
                  />
                </div>
              ) : (
                <div className="relative">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: colors.card,
                      border: `3px solid ${colors.primary}`
                    }}
                  >
                    <span 
                      className="text-2xl"
                      style={{ 
                        fontFamily: fonts.heading,
                        color: colors.primary
                      }}
                    >
                      {tenant.centerName[0]}
                    </span>
                  </div>
                  <Crown 
                    className="absolute -top-2 -right-2 w-6 h-6"
                    style={{ color: colors.accent }}
                  />
                </div>
              )}
            </div>

            {/* Center Name */}
            <h1 
              className="text-center mb-2 tracking-wide"
              style={{ fontFamily: fonts.heading }}
            >
              {tenant.centerName}
            </h1>
            
            {/* Decorative underline */}
            <div className="flex items-center gap-2">
              <div className="h-px w-8" style={{ backgroundColor: colors.primary }} />
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colors.accent }}
              />
              <div className="h-px w-8" style={{ backgroundColor: colors.primary }} />
            </div>
          </div>

          {/* Centered Navigation */}
          <nav>
            <ul className="flex items-center justify-center gap-8">
              {navItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="flex items-center gap-2 px-4 py-2 rounded-full transition-all"
                    style={{
                      color: colors.text,
                      border: `1px solid transparent`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.primary;
                      e.currentTarget.style.backgroundColor = colors.card;
                      e.currentTarget.style.color = colors.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = colors.text;
                    }}
                  >
                    {item.icon}
                    <span style={{ fontFamily: fonts.heading }}>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div 
          className="rounded-2xl p-8 shadow-2xl"
          style={{ 
            backgroundColor: colors.card,
            boxShadow: `0 25px 50px -12px ${colors.primary}20`
          }}
        >
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 mt-12 border-t" style={{ borderColor: colors.primary + '30' }}>
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px w-12" style={{ backgroundColor: colors.primary }} />
            <Crown className="w-4 h-4" style={{ color: colors.accent }} />
            <div className="h-px w-12" style={{ backgroundColor: colors.primary }} />
          </div>
          <p 
            className="text-sm tracking-wide opacity-60"
            style={{ fontFamily: fonts.heading }}
          >
            Luxury Template
          </p>
        </div>
      </footer>
    </div>
  );
}
