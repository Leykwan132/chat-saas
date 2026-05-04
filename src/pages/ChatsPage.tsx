import { useState } from 'react';
import { MessageSquare, Search, Send, MoreVertical, Paperclip, Calendar, Bot, Pin } from 'lucide-react';
import { ChatRow } from '@/components/ChatRow';

const firstNames = ['Sarah', 'James', 'Maria', 'Alex', 'Emily', 'Daniel', 'Sophia', 'Michael', 'Emma', 'David'];
const lastNames = ['Chen', 'Wilson', 'Garcia', 'Thompson', 'Davis', 'Kim', 'Martinez', 'Brown', 'Taylor', 'Anderson'];
const sources = ['WhatsApp', 'Website', 'Instagram'];
const leadStatuses = ['Hot', 'Warm', 'Cold', 'Interested'];
const messages = [
  'Hi, I need help with my order...',
  'Thanks for the quick response!',
  'Can I change my shipping address?',
  'When will my refund be processed?',
  'I love the new product line!',
  'How do I reset my password?',
  'Is this item currently in stock?',
  'Can you update my subscription plan?',
  'Do you ship internationally?',
  'Where can I find the user manual?'
];

const mockChats = Array.from({ length: 100 }, (_, i) => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const source = sources[Math.floor(Math.random() * sources.length)];
  const message = messages[Math.floor(Math.random() * messages.length)];
  const unread = Math.random() > 0.8 ? Math.floor(Math.random() * 5) + 1 : 0;
  const requiresAction = Math.random() > 0.7;

  let time;
  if (i < 5) time = `${i + 1}m ago`;
  else if (i < 20) time = `${Math.floor(Math.random() * 50) + 10}m ago`;
  else if (i < 50) time = `${Math.floor(Math.random() * 10) + 1}h ago`;
  else time = `${Math.floor(Math.random() * 5) + 1}d ago`;

  const startDate = new Date(Date.now() - Math.floor(Math.random() * 15552000000)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const leadStatus = leadStatuses[Math.floor(Math.random() * leadStatuses.length)];
  const aiMessagesCount = Math.floor(Math.random() * 5) + 1;

  return {
    id: i + 1,
    name: `${firstName} ${lastName}`,
    message,
    time,
    unread,
    source,
    requiresAction,
    startDate,
    leadStatus,
    aiMessagesCount,
  };
});

const avatarColors = ['rgba(14,165,233,0.2)', 'rgba(236,72,153,0.2)', 'rgba(34,197,94,0.2)', 'rgba(234,179,8,0.2)', 'rgba(168,85,247,0.2)'];

export default function ChatsPage() {
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [filterLabel, setFilterLabel] = useState<string>('All');
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());

  const togglePin = (id: number) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredChats = mockChats.filter(chat => {
    if (filterLabel === 'All') return true;
    if (filterLabel === 'Unread') return chat.unread > 0;
    if (filterLabel === 'Requires action') return chat.requiresAction;
    return chat.source === filterLabel;
  });

  const pinnedChats = filteredChats.filter(c => pinnedIds.has(c.id));
  const unpinnedChats = filteredChats.filter(c => !pinnedIds.has(c.id));

  const selectedChat = mockChats.find(c => c.id === selectedChatId);
  const selectedAvatarBg = selectedChatId ? avatarColors[(selectedChatId - 1) % avatarColors.length] : '';
  const selectedInitials = selectedChat ? selectedChat.name.split(' ').map(n => n[0]).join('') : '';

  return (
    <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)', width: '100%' }}>

      {/* LEFT COLUMN: Chat List */}
      <div style={{ width: '300px', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden', flexShrink: 0 }}>

        {/* Header & Search */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-foreground)', letterSpacing: '-0.02em' }}>
              Messages
            </h1>
          </div>
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-foreground-subtle)' }}
            />
            <input
              type="text"
              placeholder="Search conversations..."
              style={{
                width: '100%', height: '38px', paddingLeft: '36px', paddingRight: '14px',
                fontSize: '13px', borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-foreground)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', margin: '0 -4px', paddingLeft: '4px', paddingRight: '4px' }} className="no-scrollbar">
            {['All', 'Requires action'].map(label => {
              const isActive = filterLabel === label;
              return (
                <button
                  key={label}
                  onClick={() => setFilterLabel(label)}
                  style={{
                    padding: '4px 12px', fontSize: '12px', fontWeight: 500,
                    borderRadius: '16px', border: '1px solid var(--color-border)',
                    background: isActive ? 'var(--color-foreground)' : 'var(--color-background)',
                    color: isActive ? 'var(--color-background)' : 'var(--color-foreground-muted)',
                    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Pinned Section */}
          {pinnedChats.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px 6px', borderBottom: '1px solid var(--color-border)' }}>
                <Pin size={11} color="var(--color-foreground-subtle)" />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-foreground-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Pinned</span>
              </div>
              {pinnedChats.map((chat, index) => (
                <ChatRow key={chat.id} chat={chat} index={index} total={pinnedChats.length} isSelected={selectedChatId === chat.id} isPinned onSelect={setSelectedChatId} onTogglePin={togglePin} />
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px 6px', borderBottom: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)' }}>
                <MessageSquare size={11} color="var(--color-foreground-subtle)" />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-foreground-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>All</span>
              </div>
            </>
          )}

          {/* All / Unpinned Chats */}
          {unpinnedChats.map((chat, index) => (
            <ChatRow key={chat.id} chat={chat} index={index} total={unpinnedChats.length} isSelected={selectedChatId === chat.id} isPinned={false} onSelect={setSelectedChatId} onTogglePin={togglePin} />
          ))}
        </div>
      </div>

      {/* MIDDLE COLUMN: Chat Window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-foreground)' }}>{selectedChat.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--color-foreground-muted)' }}>
                <MoreVertical size={18} style={{ cursor: 'pointer' }} />
              </div>
            </div>

            {/* Chat Messages Area */}
            <div style={{ flex: 1, background: 'var(--color-background)', padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ alignSelf: 'center', background: 'var(--color-border)', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', color: 'var(--color-foreground-muted)', fontWeight: 500 }}>
                Today
              </div>

              {/* Fake message from customer */}
              <div style={{ display: 'flex', gap: '12px', maxWidth: '80%' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: selectedAvatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-foreground)' }}>{selectedInitials}</span>
                </div>
                <div>
                  <div style={{ background: 'var(--color-surface)', padding: '12px 16px', borderRadius: '2px 16px 16px 16px', border: '1px solid var(--color-border)', color: 'var(--color-foreground)', fontSize: '14px', lineHeight: 1.5 }}>
                    {selectedChat.message}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-foreground-subtle)', marginTop: '4px', display: 'block', marginLeft: '4px' }}>
                    {selectedChat.time}
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Input */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '8px 16px' }}>
                <Paperclip size={18} color="var(--color-foreground-subtle)" style={{ cursor: 'pointer' }} />
                <input
                  type="text"
                  placeholder={`Reply to ${selectedChat.name}...`}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-foreground)', fontSize: '14px' }}
                />
                <button style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                  <Send size={14} color="var(--color-primary-foreground)" style={{ marginLeft: '-2px' }} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-foreground-subtle)', background: 'var(--color-background)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
              <MessageSquare size={28} />
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-foreground)' }}>No chat selected</h3>
            <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Select a conversation from the left to start replying</p>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Details */}
      {selectedChat && (
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden', flexShrink: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-foreground)' }}>Details</h2>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-foreground-muted)' }}>Start date</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-foreground)', fontSize: '13px' }}>
                  <Calendar size={14} color="var(--color-foreground-muted)" /> {selectedChat.startDate}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-foreground-muted)' }}>Lead status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--color-foreground)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: selectedChat.leadStatus === 'Hot' ? '#ef4444' : selectedChat.leadStatus === 'Warm' ? '#f59e0b' : selectedChat.leadStatus === 'Cold' ? '#3b82f6' : '#8b5cf6' }} />
                  {selectedChat.leadStatus}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-foreground-muted)' }}>AI Agent</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-foreground)' }}>
                  <Bot size={14} color="var(--color-foreground-muted)" />
                  Followed up {selectedChat.aiMessagesCount} times
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
