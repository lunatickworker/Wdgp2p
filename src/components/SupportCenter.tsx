import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Search, Trash2, User as UserIcon, X } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';
import { getHierarchyUserIds } from '../utils/api/query-helpers';

interface Message {
  message_id: string;
  user_id: string;
  admin_id: string | null;
  message: string;
  sender_type: 'user' | 'admin';
  created_at: string;
  is_read: boolean;
  users?: {
    username: string;
    email: string;
  };
}

interface UserChat {
  user_id: string;
  username: string;
  email: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export function SupportCenter() {
  const { user: admin } = useAuth();
  const [userChats, setUserChats] = useState<UserChat[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 사용자별 채팅 목록 로드
  useEffect(() => {
    const loadUserChats = async () => {
      if (!admin?.id || !admin?.role) return;

      try {
        // 계층 구조에 따라 하위 사용자 ID 조회
        const hierarchyUserIds = await getHierarchyUserIds(admin.id, admin.role);

        // 1. 하위 사용자들의 메시지만 가져오기
        const { data: allMessages } = await supabase
          .from('support_messages')
          .select('*')
          .in('user_id', hierarchyUserIds)
          .order('created_at', { ascending: false });

        if (!allMessages) return;

        // 2. 고유한 user_id 추출
        const uniqueUserIds = [...new Set(allMessages.map(msg => msg.user_id))];

        // 3. users 테이블에서 사용자 정보 가져오기
        const { data: usersData } = await supabase
          .from('users')
          .select('user_id, username, email')
          .in('user_id', uniqueUserIds);

        // 4. user_id를 키로 하는 Map 생성
        const usersMap = new Map(
          usersData?.map(u => [u.user_id, u]) || []
        );

        // 5. 사용자별로 그룹화
        const chatMap = new Map<string, UserChat>();

        allMessages.forEach((msg: any) => {
          const userId = msg.user_id;
          const existing = chatMap.get(userId);

          if (!existing || new Date(msg.created_at) > new Date(existing.lastMessageTime)) {
            const unreadCount = allMessages.filter(
              (m: any) => m.user_id === userId && m.sender_type === 'user' && !m.is_read
            ).length;

            const userData = usersMap.get(userId);
            // 이메일에서 @ 앞부분 추출 (예: hong@example.com → hong)
            const displayName = userData?.email 
              ? userData.email.split('@')[0] 
              : userData?.username || 'Unknown';

            chatMap.set(userId, {
              user_id: userId,
              username: displayName,
              email: userData?.email || '',
              lastMessage: msg.message,
              lastMessageTime: msg.created_at,
              unreadCount
            });
          }
        });

        const chats = Array.from(chatMap.values()).sort(
          (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );

        setUserChats(chats);
      } catch (error) {
        console.error('Load user chats error:', error);
        toast.error('사용자 채팅 목록 로드에 실패했습니다');
      }
    };

    loadUserChats();

    // 실시간 업데이트
    const subscription = supabase
      .channel('support_messages_admin')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages'
        },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_type === 'user') {
            toast.success(`새 문의가 도착했습니다`);
          }
          loadUserChats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 선택된 사용자의 메시지 로드
  useEffect(() => {
    if (!selectedUserId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('support_messages')
        .select(`
          *,
          users:user_id (
            username,
            email
          )
        `)
        .eq('user_id', selectedUserId)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);

        // 읽지 않은 사용자 메시지 읽음 처리
        const unreadUserMessages = data.filter((m: any) => m.sender_type === 'user' && !m.is_read);
        if (unreadUserMessages.length > 0) {
          await supabase
            .from('support_messages')
            .update({ is_read: true })
            .in('message_id', unreadUserMessages.map((m: any) => m.message_id));
        }
      }
    };

    loadMessages();

    // 실시간 메시지 구독
    const messageSubscription = supabase
      .channel(`support_messages_${selectedUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${selectedUserId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // username 추가
          const { data: userData } = await supabase
            .from('users')
            .select('username, email')
            .eq('user_id', newMsg.user_id)
            .single();

          setMessages(prev => [...prev, { ...newMsg, users: userData }]);

          if (newMsg.sender_type === 'user') {
            // 읽음 처리
            await supabase
              .from('support_messages')
              .update({ is_read: true })
              .eq('message_id', newMsg.message_id);
          }
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [selectedUserId]);

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId || !admin) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: selectedUserId,
          admin_id: admin.id,
          message: newMessage.trim(),
          sender_type: 'admin',
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

  const handleDeleteChat = async (userId: string, username: string) => {
    if (!confirm(`"${username}"님과의 대화 내역을 모두 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      // 해당 사용자의 모든 메시지 삭제
      const { error } = await supabase
        .from('support_messages')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // 선택된 채팅이면 선택 해제
      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setMessages([]);
      }

      // 목록에서 제거
      setUserChats(prev => prev.filter(chat => chat.user_id !== userId));

      toast.success('대화 내역이 삭제되었습니다');
    } catch (error) {
      console.error('Delete chat error:', error);
      toast.error('삭제에 실패했습니다');
    }
  };

  const filteredChats = userChats.filter(
    chat =>
      chat.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUser = userChats.find(chat => chat.user_id === selectedUserId);

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6">
      {/* 사용자 목록 */}
      <div className="w-80 bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col">
        {/* 검색 */}
        <div className="p-4 border-b border-slate-700 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="사용자 검색..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
          <p className="text-xs text-slate-500 text-center">
            * 모든 시간은 UTC 기준입니다
          </p>
        </div>

        {/* 사용자 리스트 */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">문의 내역이 없습니다</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.user_id}
                className={`relative group border-b border-slate-700/50 ${
                  selectedUserId === chat.user_id ? 'bg-slate-700/50' : ''
                }`}
              >
                <button
                  onClick={() => setSelectedUserId(chat.user_id)}
                  className="w-full p-4 hover:bg-slate-700/30 transition-colors text-left"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-white">{chat.username}</span>
                    {chat.unreadCount > 0 && (
                      <span className="bg-cyan-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm truncate mb-1">{chat.lastMessage}</p>
                  <p className="text-slate-500 text-xs">
                    {new Date(chat.lastMessageTime).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </button>
                
                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.user_id, chat.username);
                  }}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50"
                  title="대화 삭제"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col">
        {selectedUserId ? (
          <>
            {/* 채팅 헤더 */}
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white">{selectedUser?.username}</h3>
                  <p className="text-slate-400 text-sm">{selectedUser?.email}</p>
                </div>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                // 이메일에서 @ 앞부분 추출
                const displayName = msg.users?.email 
                  ? msg.users.email.split('@')[0] 
                  : msg.users?.username || 'Unknown';

                return (
                  <div
                    key={msg.message_id}
                    className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        msg.sender_type === 'admin'
                          ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                          : 'bg-slate-700 text-slate-200 border border-slate-600'
                      }`}
                    >
                      {msg.sender_type === 'user' && (
                        <p className="text-xs text-cyan-400 mb-1">{displayName}</p>
                      )}
                      <p className="text-sm break-words">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender_type === 'admin' ? 'text-cyan-100' : 'text-slate-500'
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 입력 영역 */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  <span>전송</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">사용자를 선택하여 대화를 시작하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}