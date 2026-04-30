import { Bot, FileText, Globe, Upload, Pencil, Zap } from 'lucide-react';

const knowledgeSources = [
  {
    icon: FileText,
    title: 'Documents',
    description: 'Upload PDFs, docs, and text files to train your agent',
    count: 0,
    action: 'Upload',
  },
  {
    icon: Globe,
    title: 'Website URLs',
    description: 'Crawl and index your website content automatically',
    count: 0,
    action: 'Add URL',
  },
  {
    icon: Pencil,
    title: 'Custom Instructions',
    description: 'Write specific guidelines and personality for your agent',
    count: 0,
    action: 'Edit',
  },
];

const stats = [
  { label: 'Conversations handled', value: '—' },
  { label: 'Avg. response time', value: '—' },
  { label: 'Satisfaction rate', value: '—' },
];

export default function AIAgentsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-foreground)', letterSpacing: '-0.02em' }}>
          AI Agents
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-foreground-muted)' }}>
          Fine-tune your AI agent's knowledge and behavior
        </p>
      </div>

      {/* Agent card */}
      <div style={{ background: 'var(--color-surface)', borderRadius: '12px', padding: '24px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bot size={22} color="var(--color-foreground)" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-foreground)' }}>
              Customer Support Agent
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-foreground-muted)' }}>
              Your primary AI agent for handling customer inquiries across all channels
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontSize: '12px', fontWeight: 600 }}>
            <Zap size={12} />
            Active
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {stats.map(stat => (
            <div key={stat.label} style={{ background: 'var(--color-background)', borderRadius: '10px', padding: '16px' }}>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-foreground)' }}>{stat.value}</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-foreground-muted)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge Base */}
      <div>
        <h2 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700, color: 'var(--color-foreground)' }}>
          Knowledge Base
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {knowledgeSources.map(source => (
            <div
              key={source.title}
              style={{
                background: 'var(--color-surface)', borderRadius: '10px', padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: '14px',
                boxShadow: 'none', border: '1px solid var(--color-border)',
                transition: 'border-color 0.15s',
                cursor: 'default',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-foreground-muted)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
            >
              <div style={{ width: 38, height: 38, borderRadius: '8px', background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <source.icon size={18} color="var(--color-foreground-muted)" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-foreground)' }}>{source.title}</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-foreground-muted)' }}>{source.description}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-foreground-subtle)' }}>{source.count} items</span>
                <button
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '6px 12px', fontSize: '12px', fontWeight: 600,
                    borderRadius: '7px', background: 'var(--color-surface-hover)',
                    color: 'var(--color-foreground)', border: 'none',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-border)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                >
                  <Upload size={12} />
                  {source.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Prompt */}
      <div>
        <h2 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700, color: 'var(--color-foreground)' }}>
          System Prompt
        </h2>
        <div style={{ background: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <textarea
            rows={6}
            placeholder="You are a helpful customer support agent. You are friendly, concise, and always try to resolve the customer's issue on the first message..."
            style={{
              width: '100%', padding: '16px 20px', fontSize: '13px',
              background: 'transparent', color: 'var(--color-foreground)',
              resize: 'none', border: 'none', outline: 'none',
              fontFamily: 'var(--font-sans)', lineHeight: 1.6, boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', background: 'var(--color-background)', borderTop: '1px solid var(--color-border)' }}>
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                borderRadius: '8px', background: 'var(--color-primary)',
                color: 'var(--color-primary-foreground)', border: 'none',
                cursor: 'pointer', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
