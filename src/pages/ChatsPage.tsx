import { MessageSquare, Search, Plus } from 'lucide-react';

const mockChats = [
  { id: 1, name: 'Sarah Chen', message: 'Hi, I need help with my order...', time: '2m ago', unread: 2, source: 'WhatsApp' },
  { id: 2, name: 'James Wilson', message: 'Thanks for the quick response!', time: '15m ago', unread: 0, source: 'Website' },
  { id: 3, name: 'Maria Garcia', message: 'Can I change my shipping address?', time: '1h ago', unread: 1, source: 'Instagram' },
  { id: 4, name: 'Alex Thompson', message: 'When will my refund be processed?', time: '3h ago', unread: 0, source: 'WhatsApp' },
  { id: 5, name: 'Emily Davis', message: 'I love the new product line!', time: '5h ago', unread: 0, source: 'Website' },
];

const sourceColors: Record<string, string> = {
  WhatsApp: 'bg-emerald-500/10 text-emerald-600',
  Website: 'bg-blue-500/10 text-blue-600',
  Instagram: 'bg-pink-500/10 text-pink-600',
};

export default function ChatsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Chats</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all customer conversations in one place
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer border-none">
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search conversations..."
          className="w-full h-10 pl-10 pr-4 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
        />
      </div>

      {/* Chat list */}
      <div className="rounded-xl border border-border overflow-hidden">
        {mockChats.map((chat, index) => (
          <div
            key={chat.id}
            className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors cursor-pointer ${
              index !== mockChats.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-muted-foreground">
                {chat.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{chat.name}</span>
                <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${sourceColors[chat.source] || ''}`}>
                  {chat.source}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{chat.message}</p>
            </div>

            {/* Meta */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-xs text-muted-foreground">{chat.time}</span>
              {chat.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-medium flex items-center justify-center">
                  {chat.unread}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state hint */}
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
        <MessageSquare className="w-4 h-4" />
        <span>Showing sample conversations — connect your channels to see live chats</span>
      </div>
    </div>
  );
}
