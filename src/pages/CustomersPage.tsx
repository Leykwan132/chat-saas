import { Users, Search, Plus, Phone, Mail } from 'lucide-react';

const mockCustomers = [
  { id: 1, name: 'Sarah Chen', phone: '+60 12-345 6789', email: 'sarah@example.com', source: 'WhatsApp', lastActive: '2 mins ago', conversations: 5 },
  { id: 2, name: 'James Wilson', phone: '+60 11-234 5678', email: 'james@example.com', source: 'Website', lastActive: '15 mins ago', conversations: 3 },
  { id: 3, name: 'Maria Garcia', phone: '+60 19-876 5432', email: 'maria@example.com', source: 'Instagram', lastActive: '1 hour ago', conversations: 8 },
  { id: 4, name: 'Alex Thompson', phone: '+60 17-654 3210', email: 'alex@example.com', source: 'WhatsApp', lastActive: '3 hours ago', conversations: 2 },
  { id: 5, name: 'Emily Davis', phone: '+60 14-321 0987', email: 'emily@example.com', source: 'Website', lastActive: '5 hours ago', conversations: 12 },
  { id: 6, name: 'Daniel Kim', phone: '+60 16-789 0123', email: 'daniel@example.com', source: 'Instagram', lastActive: '1 day ago', conversations: 1 },
];

const sourceColors: Record<string, string> = {
  WhatsApp: 'bg-emerald-500/10 text-emerald-600',
  Website: 'bg-blue-500/10 text-blue-600',
  Instagram: 'bg-pink-500/10 text-pink-600',
};

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your customer directory with contact details and conversation history
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer border-none">
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            className="w-full h-10 pl-10 pr-4 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
          />
        </div>
        <select className="h-10 px-3 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer">
          <option>All Sources</option>
          <option>WhatsApp</option>
          <option>Website</option>
          <option>Instagram</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left font-medium text-muted-foreground px-5 py-3">Customer</th>
              <th className="text-left font-medium text-muted-foreground px-5 py-3">Phone</th>
              <th className="text-left font-medium text-muted-foreground px-5 py-3">Source</th>
              <th className="text-left font-medium text-muted-foreground px-5 py-3">Conversations</th>
              <th className="text-left font-medium text-muted-foreground px-5 py-3">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {mockCustomers.map((customer, index) => (
              <tr
                key={customer.id}
                className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                  index !== mockCustomers.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-muted-foreground">
                        {customer.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{customer.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{customer.email}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {customer.phone}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-[11px] font-medium px-2 py-1 rounded-md ${sourceColors[customer.source] || ''}`}>
                    {customer.source}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-foreground">{customer.conversations}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{customer.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>Showing sample data — customers are added automatically from conversations</span>
      </div>
    </div>
  );
}
