import { UserPlus, FileCheck, ShoppingCart, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Notification } from '../utils/supabase/types';

interface NotificationIconsProps {
  notifications: Notification[];
  onCategoryClick: (category: 'signup' | 'verification' | 'purchase' | 'support' | null) => void;
  selectedCategory?: 'signup' | 'verification' | 'purchase' | 'support' | null;
  isAdmin?: boolean;
  supportUnreadCount?: number;
}

const COLORS = {
  green: {
    text: '#22c55e',
    bg: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.6)',
    glowStrong: 'rgba(34, 197, 94, 1)',
  },
  blue: {
    text: '#3b82f6',
    bg: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.6)',
    glowStrong: 'rgba(59, 130, 246, 1)',
  },
  purple: {
    text: '#a855f7',
    bg: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.6)',
    glowStrong: 'rgba(168, 85, 247, 1)',
  },
  cyan: {
    text: '#06b6d4',
    bg: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.6)',
    glowStrong: 'rgba(6, 182, 212, 1)',
  },
};

export function NotificationIcons({ notifications, onCategoryClick, selectedCategory, isAdmin = false, supportUnreadCount = 0 }: NotificationIconsProps) {
  const [pulseCategory, setPulseCategory] = useState<string | null>(null);
  const [prevSupportCount, setPrevSupportCount] = useState(supportUnreadCount);

  // 카테고리별 카운트 계산
  const signupCount = notifications.filter(n => !n.read && n.type === 'signup').length;
  const verificationCount = notifications.filter(n => 
    !n.read && (n.type.includes('verification'))
  ).length;
  const purchaseCount = notifications.filter(n => 
    !n.read && (n.type.includes('purchase'))
  ).length;

  // 새 알림이 올 때 펄스 효과
  useEffect(() => {
    const latestNotif = notifications[0];
    if (latestNotif && !latestNotif.read) {
      if (latestNotif.type === 'signup') {
        setPulseCategory('signup');
      } else if (latestNotif.type.includes('verification')) {
        setPulseCategory('verification');
      } else if (latestNotif.type.includes('purchase')) {
        setPulseCategory('purchase');
      }

      const timer = setTimeout(() => setPulseCategory(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // 고객센터 알림이 증가할 때 펄스 효과
  useEffect(() => {
    if (supportUnreadCount > prevSupportCount) {
      setPulseCategory('support');
      const timer = setTimeout(() => setPulseCategory(null), 2000);
      setPrevSupportCount(supportUnreadCount);
      return () => clearTimeout(timer);
    }
    setPrevSupportCount(supportUnreadCount);
  }, [supportUnreadCount]);

  const IconButton = ({ 
    icon: Icon, 
    count, 
    colorKey,
    category,
    label
  }: { 
    icon: any; 
    count: number; 
    colorKey: 'green' | 'blue' | 'purple' | 'cyan';
    category: 'signup' | 'verification' | 'purchase' | 'support';
    label: string;
  }) => {
    const isPulsing = pulseCategory === category;
    const isSelected = selectedCategory === category;
    const color = COLORS[colorKey];
    const isActive = count > 0;
    
    return (
      <button
        onClick={() => onCategoryClick(isSelected ? null : category)}
        className={`relative p-2 transition-all duration-200 ${
          isPulsing ? 'animate-bounce' : ''
        } ${
          isSelected ? 'bg-slate-800/50 rounded-lg' : ''
        }`}
        aria-label={label}
        style={{ 
          filter: isActive ? `drop-shadow(0 0 5px ${color.glow})` : '' 
        }}
      >
        <Icon 
          className="w-5 h-5" 
          style={{ 
            color: isActive ? color.text : isSelected ? color.text : '#94a3b8' 
          }}
        />
        {count > 0 && (
          <span 
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-white text-[10px] rounded-full flex items-center justify-center font-medium ${
              isPulsing ? 'animate-pulse' : ''
            }`}
            style={{ 
              backgroundColor: color.bg,
              boxShadow: isPulsing 
                ? `0 0 15px ${color.glowStrong}` 
                : `0 0 10px ${color.glow}`
            }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-1">
      {/* 회원가입 알림 - 관리자만 */}
      {isAdmin && (
        <IconButton 
          icon={UserPlus} 
          count={signupCount} 
          colorKey="green"
          category="signup"
          label="회원가입 알림"
        />
      )}
      
      {/* 1원인증 알림 */}
      <IconButton 
        icon={FileCheck} 
        count={verificationCount} 
        colorKey="blue"
        category="verification"
        label="1원인증 알림"
      />
      
      {/* 구매요청 알림 */}
      <IconButton 
        icon={ShoppingCart} 
        count={purchaseCount} 
        colorKey="purple"
        category="purchase"
        label="구매요청 알림"
      />
      
      {/* 고객센터 알림 - 관리자만 */}
      {isAdmin && (
        <IconButton 
          icon={MessageCircle} 
          count={supportUnreadCount} 
          colorKey="cyan"
          category="support"
          label="고객센터 알림"
        />
      )}
    </div>
  );
}
