import { useState } from 'react';
import { Bot, FileText, Globe, Send, RotateCcw, ChevronDown, ChevronUp, Plus, Trash2, MessageSquare, Type, Check } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

// ── Types ──────────────────────────────────────────────────────────────────
type SourceItem = { id: string; label: string };
type CategoryKey = 'web' | 'files' | 'text' | 'qa';

interface KnowledgeCategory {
  key: CategoryKey;
  icon: React.ElementType;
  label: string;
  description: string;
  addLabel: string;
  items: SourceItem[];
}

// ── Initial state ──────────────────────────────────────────────────────────
const INITIAL_CATEGORIES: KnowledgeCategory[] = [
  {
    key: 'web',
    icon: Globe,
    label: 'Web',
    description: 'Information about your website.',
    addLabel: 'Add URL',
    items: [
      { id: 'w1', label: 'https://docs.example.com/getting-started' },
      { id: 'w2', label: 'https://example.com/faq' },
      { id: 'w3', label: 'https://example.com/pricing' },
      { id: 'w4', label: 'https://example.com/about' },
    ],
  },
  {
    key: 'files',
    icon: FileText,
    label: 'Files',
    description: 'Documents and PDFs for the agent.',
    addLabel: 'Upload File',
    items: [
      { id: 'f1', label: 'product-manual-v2.pdf' },
      { id: 'f2', label: 'return-policy.docx' },
    ],
  },
  {
    key: 'text',
    icon: Type,
    label: 'Text',
    description: 'Custom instructions and personality rules.',
    addLabel: 'Add Text',
    items: [
      { id: 't1', label: 'Company overview & mission statement' },
    ],
  },
  {
    key: 'qa',
    icon: MessageSquare,
    label: 'Q&A',
    description: 'Pre-defined question and answer pairs.',
    addLabel: 'Add Q&A',
    items: [],
  },
];

// ── Accordion Item ─────────────────────────────────────────────────────────
function KnowledgeAccordion({
  category,
  isOpen,
  onToggle,
  onDelete,
}: {
  category: KnowledgeCategory;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
}) {
  const Icon = category.icon;
  const count = category.items.length;

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        overflow: 'hidden',
        background: 'var(--color-surface)',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Header / Trigger */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '18px 24px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '8px',
            background: 'var(--color-surface-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={16} color="var(--color-foreground-muted)" />
        </div>

        {/* Label & Description */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-foreground)',
            }}
          >
            {category.label}
          </span>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--color-foreground-muted)',
              marginTop: '2px',
            }}
          >
            {category.description}
          </span>
        </div>

        {/* Count badge */}
        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-foreground-muted)',
            marginRight: '6px',
          }}
        >
          {count} {count === 1 ? 'source' : 'sources'}
        </span>

        {/* Checkmark (green when count > 0) */}
        {count > 0 && (
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#22c55e22',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '8px',
              flexShrink: 0,
            }}
          >
            <Check
              size={11}
              color="#22c55e"
              strokeWidth={3}
            />
          </div>
        )}

        {/* Chevron */}
        {isOpen ? (
          <ChevronUp size={15} color="var(--color-foreground-muted)" />
        ) : (
          <ChevronDown size={15} color="var(--color-foreground-muted)" />
        )}
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: '16px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {/* Item list */}
          {count === 0 ? (
            <p
              style={{
                margin: '4px 0 10px',
                fontSize: '12px',
                color: 'var(--color-foreground-subtle)',
                fontStyle: 'italic',
              }}
            >
              No sources yet. Add your first one below.
            </p>
          ) : (
            category.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Check size={13} color="#22c55e" style={{ flexShrink: 0 }} />
                <span
                  style={{
                    flex: 1,
                    fontSize: '12px',
                    color: 'var(--color-foreground)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={item.label}
                >
                  {item.label}
                </span>
                <button
                  onClick={() => onDelete(item.id)}
                  title="Remove"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '3px',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--color-foreground-subtle)',
                    transition: 'color 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-foreground-subtle)')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}

          {/* Add button */}
          <button
            style={{
              marginTop: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '7px',
              background: 'var(--color-surface-hover)',
              color: 'var(--color-foreground)',
              border: '1px dashed var(--color-border)',
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
              alignSelf: 'flex-start',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-border)';
              e.currentTarget.style.borderColor = 'var(--color-foreground-muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-hover)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <Plus size={12} />
            {category.addLabel}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function AIAgentsPage() {
  const [categories, setCategories] = useState<KnowledgeCategory[]>(INITIAL_CATEGORIES);
  const [openKey, setOpenKey] = useState<CategoryKey | null>(null);

  const toggle = (key: CategoryKey) => setOpenKey((prev) => (prev === key ? null : key));

  const deleteItem = (categoryKey: CategoryKey, itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.key === categoryKey
          ? { ...cat, items: cat.items.filter((i) => i.id !== itemId) }
          : cat
      )
    );
  };

  return (
    <div style={{ display: 'flex', gap: '28px', width: '100%', height: '80vh' }}>
      {/* ── Left Column ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          minWidth: 0,
          overflowY: 'auto',
          paddingRight: '8px',
        }}
      >
        {/* Header */}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--color-foreground)',
              letterSpacing: '-0.02em',
            }}
          >
            AI Agents
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-foreground-muted)' }}>
            Fine-tune your AI agent's knowledge and behavior
          </p>
        </div>

        {/* Knowledge Sources */}
        <div style={{ flexShrink: 0 }}>
          <h2
            style={{
              margin: '0',
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--color-foreground)',
            }}
          >
            Knowledge Sources
          </h2>
          <p style={{ margin: '4px 0 14px', fontSize: '13px', color: 'var(--color-foreground-muted)' }}>
            Give your AI agent knowledge about your business.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {categories.map((cat) => (
              <KnowledgeAccordion
                key={cat.key}
                category={cat}
                isOpen={openKey === cat.key}
                onToggle={() => toggle(cat.key)}
                onDelete={(id) => deleteItem(cat.key, id)}
              />
            ))}
          </div>
        </div>

        {/* Sources File Limit */}
        <div style={{ flexShrink: 0, marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-foreground)' }}>
                Sources File Limit
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-foreground-muted)' }}>
                Maximum limit: 400 kB
              </p>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-foreground)' }}>
              128 kB / 400 kB
            </span>
          </div>
          
          {/* We calculate value as (128 / 400) * 100 = 32 */}
          <Progress value={32} className="h-2" />
        </div>
      </div>

      {/* ── Right Column (Playground) ── */}
      <div
        style={{
          width: '480px',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          flexShrink: 0,
          height: '100%',
        }}
      >
        {/* Playground Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--color-surface)',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-foreground)' }}>
            Test your agent
          </h3>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-foreground-muted)',
              background: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-foreground)';
              e.currentTarget.style.borderColor = 'var(--color-foreground-muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-foreground-muted)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <RotateCcw size={12} />
            New chat
          </button>
        </div>

        {/* Chat Area */}
        <div
          style={{
            flex: 1,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            background: 'var(--color-background)',
          }}
        >
          {[
            { role: 'bot', text: "Hi! I'm Tessio-ejin. How can I help you today?" },
            { role: 'user', text: 'What are your operating hours?' },
            { role: 'bot', text: 'Our support team is available Monday through Friday, from 9:00 AM to 5:00 PM EST. However, as an AI, I am available 24/7 to assist you with any questions!' },
            { role: 'user', text: "I have a problem with my recent order #12345. It arrived damaged and I'd like a replacement or refund." },
            { role: 'bot', text: "I'm so sorry to hear that. Could you upload a photo of the damaged item? I can immediately process a replacement or issue a full refund." },
            { role: 'user', text: "Sure, I've attached a photo. Please process a replacement, no refund needed." },
            { role: 'bot', text: "Thank you! I've processed a replacement \u2014 order #12345-R, ships tomorrow. You'll receive a confirmation email shortly." },
            { role: 'user', text: 'Perfect, that was fast. Do I need to return the broken one?' },
            { role: 'bot', text: 'No need to return it! You can safely dispose of it. Anything else I can help with?' },
          ].map((msg, i) =>
            msg.role === 'bot' ? (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', maxWidth: '85%' }}>
                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--color-border)' }}>
                  <Bot size={16} color="var(--color-foreground)" />
                </div>
                <div style={{ background: 'var(--color-surface)', padding: '12px 16px', borderRadius: '12px', borderTopLeftRadius: '4px', fontSize: '13px', color: 'var(--color-foreground)', border: '1px solid var(--color-border)', lineHeight: 1.5 }}>
                  {msg.text}
                </div>
              </div>
            ) : (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', alignSelf: 'flex-end', flexDirection: 'row-reverse', maxWidth: '85%' }}>
                <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-primary-foreground)', fontSize: '12px', fontWeight: 600 }}>
                  U
                </div>
                <div style={{ background: 'var(--color-primary)', padding: '12px 16px', borderRadius: '12px', borderTopRightRadius: '4px', fontSize: '13px', color: 'var(--color-primary-foreground)', lineHeight: 1.5 }}>
                  {msg.text}
                </div>
              </div>
            )
          )}
        </div>

        {/* Input Area */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '6px 6px 6px 16px' }}>
            <input
              type="text"
              placeholder="Message your agent..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: 'var(--color-foreground)' }}
            />
            <button
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'opacity 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
