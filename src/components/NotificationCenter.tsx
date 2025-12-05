import { Bell, X, Trash2, CheckCheck, UserPlus, FileCheck, ShoppingCart } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { Notification } from '../utils/supabase/types';

interface NotificationCenterProps {
  userId: string;
  isAdmin?: boolean;
  categoryFilter?: 'signup' | 'verification' | 'purchase' | null;
}

export function NotificationCenter({ userId, isAdmin = false, categoryFilter = null }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications(userId, isAdmin);

  // 카테고리 필터 적용
  const filteredNotifications = categoryFilter 
    ? notifications.filter(n => {
        if (categoryFilter === 'signup') return n.type === 'signup';
        if (categoryFilter === 'verification') return n.type.includes('verification');
        if (categoryFilter === 'purchase') return n.type.includes('purchase');
        return true;
      })
    : notifications;

  const filteredUnreadCount = categoryFilter
    ? filteredNotifications.filter(n => !n.read).length
    : unreadCount;

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'signup':
        return <UserPlus className="w-5 h-5 text-green-400" />;
      case 'account_verification':
      case 'verification_request':
      case 'verification_approved':
      case 'verification_rejected':
        return <FileCheck className="w-5 h-5 text-blue-400" />;
      case 'purchase_request':
      case 'purchase_approved':
      case 'purchase_completed':
      case 'purchase_rejected':
        return <ShoppingCart className="w-5 h-5 text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getNotificationStyle = (type: Notification['type']) => {
    if (type.includes('rejected')) {
      return 'border-red-500/30 bg-red-500/5';
    }
    if (type.includes('approved') || type.includes('completed')) {
      return 'border-green-500/30 bg-green-500/5';
    }
    if (type.includes('request')) {
      return 'border-yellow-500/30 bg-yellow-500/5';
    }
    return 'border-cyan-500/30 bg-cyan-500/5';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* 알림 벨 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-cyan-400 transition-all duration-200"
        aria-label="알림"
        style={{ filter: isOpen ? 'drop-shadow(0 0 5px rgba(6, 182, 212, 0.8))' : '' }}
      >
        <Bell className={`w-5 h-5 ${isOpen ? 'text-cyan-400' : ''}`} />
        {filteredUnreadCount > 0 && (
          <span 
            className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse"
            style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)' }}
          >
            {filteredUnreadCount > 99 ? '99+' : filteredUnreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 */}
      {isOpen && (
        <div 
          className="absolute right-0 top-12 w-96 max-h-[600px] rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            zIndex: 99999,
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: '0 0 30px rgba(6, 182, 212, 0.4), inset 0 0 20px rgba(6, 182, 212, 0.05)',
          }}
        >
          {/* 헤더 */}
          <div className="p-4 border-b border-cyan-500/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-slate-200">
                알림 <span className="text-cyan-400">({filteredUnreadCount})</span>
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {filteredUnreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                모두 읽음으로 표시
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>알림이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-800/50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-cyan-500/5' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      {/* 아이콘 */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg border ${getNotificationStyle(notification.type)} flex items-center justify-center`}>
                        {getIcon(notification.type)}
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm ${!notification.read ? 'text-slate-200' : 'text-slate-400'}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div 
                              className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 mt-1"
                              style={{ boxShadow: '0 0 6px rgba(6, 182, 212, 0.8)' }}
                            />
                          )}
                        </div>
                        
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-500">
                            {formatTime(notification.created_at)}
                          </span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotification(notification.id);
                            }}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                            aria-label="삭제"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 푸터 */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t border-cyan-500/20 text-center">
              <button
                onClick={() => {
                  filteredNotifications.forEach(n => clearNotification(n.id));
                }}
                className="text-sm text-slate-400 hover:text-red-400 transition-colors"
              >
                모든 알림 지우기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}