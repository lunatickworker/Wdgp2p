import React, { useState } from 'react';
import { LayoutProps, NavItem } from './types';
import { Menu, X, Home, Users, Wallet, Settings, BarChart3 } from 'lucide-react';

export function ModernLayout({ children, tenant, template, customTheme }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const colors = { ...template.colors, ...customTheme?.colors };
  const fonts = { ...template.fonts, ...customTheme?.fonts };

  const navItems: NavItem[] = [
    { label: '대시보드', href: '/dashboard', icon: <Home className="w-5 h-5" /> },
    { label: '사용자 관리', href: '/users', icon: <Users className="w-5 h-5" /> },
    { label: '지갑 관리', href: '/wallets', icon: <Wallet className="w-5 h-5" /> },
    { label: '통계', href: '/stats', icon: <BarChart3 className="w-5 h-5" /> },
    { label: '설정', href: '/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div 
      className="flex h-screen overflow-hidden"
      style={{ 
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: fonts.body
      }}
    >
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 overflow-hidden flex-shrink-0`}
        style={{ backgroundColor: colors.card }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b" style={{ borderColor: colors.primary + '30' }}>
            <div className="flex items-center gap-3">
              {tenant.logoUrl ? (
                <img 
                  src={tenant.logoUrl} 
                  alt={tenant.centerName}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: colors.primary }}
                >
                  <span style={{ fontFamily: fonts.heading }}>
                    {tenant.centerName[0]}
                  </span>
                </div>
              )}
              <div>
                <h2 style={{ fontFamily: fonts.heading }}>{tenant.centerName}</h2>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:translate-x-1"
                    style={{
                      backgroundColor: 'transparent',
                      color: colors.text,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.primary + '20';
                    }}
                    onMouseLeave={(e) => {
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
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="h-16 flex items-center justify-between px-6 border-b"
          style={{ 
            backgroundColor: colors.card,
            borderColor: colors.primary + '30'
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg transition-colors"
            style={{ 
              backgroundColor: colors.primary + '20',
              color: colors.primary
            }}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-4">
            <div 
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: colors.accent + '20', color: colors.accent }}
            >
              Modern Template
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
