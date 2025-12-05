import React, { useState } from 'react';
import { LayoutProps, NavItem } from './types';
import { Menu, X, Home, Users, Wallet, Settings, BarChart3, Zap } from 'lucide-react';

export function GamingLayout({ children, tenant, template, customTheme }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const colors = { ...template.colors, ...customTheme?.colors };
  const fonts = { ...template.fonts, ...customTheme?.fonts };

  const navItems: NavItem[] = [
    { label: 'DASHBOARD', href: '/dashboard', icon: <Home className="w-5 h-5" /> },
    { label: 'USERS', href: '/users', icon: <Users className="w-5 h-5" /> },
    { label: 'WALLETS', href: '/wallets', icon: <Wallet className="w-5 h-5" /> },
    { label: 'STATS', href: '/stats', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'SETTINGS', href: '/settings', icon: <Settings className="w-5 h-5" /> },
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
      {/* Gaming Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 overflow-hidden flex-shrink-0 relative`}
        style={{ backgroundColor: colors.card }}
      >
        {/* Accent line */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: colors.accent }}
        />

        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6">
            <div className="flex items-center gap-3">
              {tenant.logoUrl ? (
                <img 
                  src={tenant.logoUrl} 
                  alt={tenant.centerName}
                  className="w-12 h-12 object-cover"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)' }}
                />
              ) : (
                <div 
                  className="w-12 h-12 flex items-center justify-center relative overflow-hidden"
                  style={{ 
                    backgroundColor: colors.primary,
                    clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)'
                  }}
                >
                  <span style={{ fontFamily: fonts.heading }}>
                    {tenant.centerName[0]}
                  </span>
                  <Zap className="absolute top-1 right-1 w-3 h-3" style={{ color: colors.accent }} />
                </div>
              )}
              <div>
                <h2 
                  className="tracking-wider uppercase"
                  style={{ fontFamily: fonts.heading }}
                >
                  {tenant.centerName}
                </h2>
                <div className="flex gap-1 mt-1">
                  <div className="w-2 h-2" style={{ backgroundColor: colors.primary }} />
                  <div className="w-2 h-2" style={{ backgroundColor: colors.secondary }} />
                  <div className="w-2 h-2" style={{ backgroundColor: colors.accent }} />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {navItems.map((item, index) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 transition-all relative overflow-hidden group"
                    style={{
                      backgroundColor: 'transparent',
                      color: colors.text,
                      clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.primary;
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: colors.accent }}
                    />
                    {item.icon}
                    <span className="tracking-wider">{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer accent */}
          <div className="p-4">
            <div 
              className="h-1"
              style={{ 
                background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})`
              }}
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="h-16 flex items-center justify-between px-6 relative"
          style={{ 
            backgroundColor: colors.card
          }}
        >
          {/* Accent line */}
          <div 
            className="absolute left-0 right-0 bottom-0 h-0.5"
            style={{ 
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})`
            }}
          />

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 transition-all"
            style={{ 
              backgroundColor: colors.primary,
              color: colors.text,
              clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)'
            }}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-4">
            <div 
              className="px-4 py-2 tracking-wider"
              style={{ 
                backgroundColor: colors.accent,
                color: colors.background,
                clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)'
              }}
            >
              GAMING
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
