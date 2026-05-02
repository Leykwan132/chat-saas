import { Pin, PinOff } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

const avatarColors = [
  { bg: 'rgba(14,165,233,0.18)', text: '#38bdf8' },
  { bg: 'rgba(236,72,153,0.18)', text: '#f472b6' },
  { bg: 'rgba(34,197,94,0.18)', text: '#4ade80' },
  { bg: 'rgba(234,179,8,0.18)', text: '#fbbf24' },
  { bg: 'rgba(168,85,247,0.18)', text: '#c084fc' },
  { bg: 'rgba(239,68,68,0.18)', text: '#f87171' },
  { bg: 'rgba(20,184,166,0.18)', text: '#2dd4bf' },
];

export type Chat = {
  id: number;
  name: string;
  message: string;
  time: string;
  unread: number;
  source: string;
  requiresAction: boolean;
  startDate: string;
  leadStatus: string;
  aiMessagesCount: number;
};

type ChatRowProps = {
  chat: Chat;
  index: number;
  total: number;
  isSelected: boolean;
  isPinned: boolean;
  onSelect: (id: number) => void;
  onTogglePin: (id: number) => void;
};

export function ChatRow({ chat, index, total, isSelected, isPinned, onSelect, onTogglePin }: ChatRowProps) {

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={() => onSelect(chat.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px',
            borderBottom: index !== total - 1 ? '1px solid var(--color-border)' : 'none',
            cursor: 'pointer', transition: 'background 0.12s',
            background: isSelected ? 'var(--color-surface-hover)' : 'transparent',
            position: 'relative',
          }}
          onMouseEnter={e => (!isSelected && (e.currentTarget.style.background = 'var(--color-surface-hover)'))}
          onMouseLeave={e => (!isSelected && (e.currentTarget.style.background = 'transparent'))}
        >
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{
                fontSize: '13px', fontWeight: 600, color: 'var(--color-foreground)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                {isPinned && <Pin size={10} color="var(--color-foreground-subtle)" style={{ flexShrink: 0 }} />}
                {chat.name}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-foreground-subtle)', flexShrink: 0, marginLeft: '8px' }}>
                {chat.time}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <p style={{
                margin: 0, fontSize: '12px',
                color: isSelected ? 'var(--color-foreground-muted)' : 'var(--color-foreground-muted)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
              }}>
                {chat.message}
              </p>
              {chat.unread > 0 && (
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#ef4444',
                  color: 'white', fontSize: '10px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {chat.unread}
                </span>
              )}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onTogglePin(chat.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          {isPinned ? 'Unpin' : 'Pin'}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
