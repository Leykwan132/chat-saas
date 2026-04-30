import { Users, Search, Plus, Phone, Mail } from 'lucide-react';

const mockCustomers = [
  { id: 1, name: 'Sarah Chen', phone: '+60 12-345 6789', email: 'sarah@example.com', source: 'WhatsApp', lastActive: '2 mins ago', conversations: 5 },
  { id: 2, name: 'James Wilson', phone: '+60 11-234 5678', email: 'james@example.com', source: 'Website', lastActive: '15 mins ago', conversations: 3 },
  { id: 3, name: 'Maria Garcia', phone: '+60 19-876 5432', email: 'maria@example.com', source: 'Instagram', lastActive: '1 hour ago', conversations: 8 },
  { id: 4, name: 'Alex Thompson', phone: '+60 17-654 3210', email: 'alex@example.com', source: 'WhatsApp', lastActive: '3 hours ago', conversations: 2 },
  { id: 5, name: 'Emily Davis', phone: '+60 14-321 0987', email: 'emily@example.com', source: 'Website', lastActive: '5 hours ago', conversations: 12 },
  { id: 6, name: 'Daniel Kim', phone: '+60 16-789 0123', email: 'daniel@example.com', source: 'Instagram', lastActive: '1 day ago', conversations: 1 },
];

const sourceBadge: Record<string, { bg: string; color: string }> = {
  WhatsApp: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  Website: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  Instagram: { bg: 'rgba(236,72,153,0.15)', color: '#f472b6' },
};

const avatarColors = ['rgba(14,165,233,0.2)', 'rgba(236,72,153,0.2)', 'rgba(34,197,94,0.2)', 'rgba(234,179,8,0.2)', 'rgba(168,85,247,0.2)', 'rgba(239,68,68,0.2)'];

export default function CustomersPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-foreground)', letterSpacing: '-0.02em' }}>
            Customers
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-foreground-muted)' }}>
            Your customer directory with contact details and conversation history
          </p>
        </div>
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
          <Plus size={14} />
          Add Customer
        </button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-foreground-subtle)' }}
          />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            style={{
              width: '100%', height: '38px', paddingLeft: '36px', paddingRight: '14px',
              fontSize: '13px', borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-foreground)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          style={{
            height: '38px', padding: '0 12px', fontSize: '13px',
            borderRadius: '8px', border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-foreground)',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <option>All Sources</option>
          <option>WhatsApp</option>
          <option>Website</option>
          <option>Instagram</option>
        </select>
      </div>

      {/* Table card */}
      <div style={{ background: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-hover)' }}>
              {['Customer', 'Phone', 'Source', 'Conversations', 'Last Active'].map(h => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left', padding: '10px 20px',
                    fontSize: '11px', fontWeight: 600,
                    color: 'var(--color-foreground-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockCustomers.map((customer, index) => {
              const badge = sourceBadge[customer.source] || { bg: '#f4f4f5', color: '#71717a' };
              const avatarBg = avatarColors[index % avatarColors.length];
              const initials = customer.name.split(' ').map(n => n[0]).join('');
              return (
                <tr
                  key={customer.id}
                  style={{ borderBottom: index !== mockCustomers.length - 1 ? '1px solid var(--color-border)' : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-foreground)' }}>{initials}</span>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-foreground)' }}>{customer.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Mail size={11} color="var(--color-foreground-subtle)" />
                          <span style={{ fontSize: '12px', color: 'var(--color-foreground-muted)' }}>{customer.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-foreground)' }}>
                      <Phone size={13} color="var(--color-foreground-subtle)" />
                      {customer.phone}
                    </div>
                  </td>
                  <td style={{ padding: '13px 20px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: badge.bg, color: badge.color }}>
                      {customer.source}
                    </span>
                  </td>
                  <td style={{ padding: '13px 20px', color: 'var(--color-foreground)', fontWeight: 500 }}>
                    {customer.conversations}
                  </td>
                  <td style={{ padding: '13px 20px', color: 'var(--color-foreground-muted)' }}>
                    {customer.lastActive}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-foreground-subtle)' }}>
        <Users size={14} />
        <span>Showing sample data — customers are added automatically from conversations</span>
      </div>
    </div>
  );
}
