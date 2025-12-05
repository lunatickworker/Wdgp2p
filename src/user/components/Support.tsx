import { ChevronRight, MessageCircle, Send } from 'lucide-react';
import { Screen } from '../App';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase/client';

interface SupportProps {
  onNavigate: (screen: Screen) => void;
}

interface Message {
  message_id: string;
  user_id: string;
  admin_id: string | null;
  message: string;
  sender_type: 'user' | 'admin';
  created_at: string;
  is_read: boolean;
}

export function Support({ onNavigate }: SupportProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 메시지 로드 및 실시간 업데이트
  useEffect(() => {
    if (!user) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', user.id) // Custom users 테이블의 user_id 사용
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
        // 읽지 않은 관리자 메시지 읽음 처리
        const unreadAdminMessages = data.filter(m => m.sender_type === 'admin' && !m.is_read);
        if (unreadAdminMessages.length > 0) {
          await supabase
            .from('support_messages')
            .update({ is_read: true })
            .in('message_id', unreadAdminMessages.map(m => m.message_id));
        }
      }
    };

    loadMessages();

    // 실시간 메시지 구독
    const messageSubscription = supabase
      .channel('support_messages_user')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${user.id}` // Custom users 테이블의 user_id 사용
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          
          if (newMsg.sender_type === 'admin') {
            toast.success('관리자로부터 새 메시지가 도착했습니다');
            // 읽음 처리
            supabase
              .from('support_messages')
              .update({ is_read: true })
              .eq('message_id', newMsg.message_id)
              .then();
          }
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [user]);

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id, // Custom users 테이블의 user_id 사용
          message: newMessage.trim(),
          sender_type: 'user',
          is_read: false
        });

      if (error) throw error;

      setNewMessage('');
      toast.success('메시지가 전송되었습니다');
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('메시지 전송에 실패했습니다');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* 헤더 */}
      <button 
        onClick={() => onNavigate('settings')} 
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
        style={{ filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.5))' }}
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span>뒤로</span>
      </button>

      <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4" style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)' }}>
        <h2 className="text-white mb-2">고객센터</h2>
        <p className="text-slate-400 text-sm">실시간 문의 서비스입니다</p>
        <p className="text-slate-500 text-xs mt-2">* 모든 시간은 UTC 기준입니다</p>
      </div>

      {/* 메시지 영역 */}
      <div 
        className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4 space-y-3" 
        style={{ 
          boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)',
          minHeight: '400px',
          maxHeight: '500px',
          overflowY: 'auto'
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">아직 대화 내역이 없습니다</p>
            <p className="text-slate-500 text-sm mt-1">궁금하신 점을 문의해주세요</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.message_id}
              className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.sender_type === 'user'
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                    : 'bg-slate-700 text-slate-200 border border-slate-600'
                }`}
              >
                <p className="text-sm break-words">{msg.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.sender_type === 'user' ? 'text-cyan-100' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4" style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)' }}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex-shrink-0"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
