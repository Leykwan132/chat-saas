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

export default function AIAgentsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">AI Agents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fine-tune your AI agent's knowledge and behavior
        </p>
      </div>

      {/* Agent card */}
      <div className="rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Customer Support Agent</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your primary AI agent for handling customer inquiries across all channels
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium">
            <Zap className="w-3 h-3" />
            Active
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Conversations handled', value: '—' },
            { label: 'Avg. response time', value: '—' },
            { label: 'Satisfaction rate', value: '—' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-muted/50 p-4">
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge base */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Knowledge Base</h2>
        <div className="grid gap-4">
          {knowledgeSources.map((source) => (
            <div
              key={source.title}
              className="rounded-xl border border-border p-5 flex items-center gap-4 hover:border-primary/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <source.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">{source.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{source.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{source.count} items</span>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer">
                  <Upload className="w-3 h-3" />
                  {source.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System prompt */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">System Prompt</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <textarea
            rows={6}
            placeholder="You are a helpful customer support agent. You are friendly, concise, and always try to resolve the customer's issue on the first message..."
            className="w-full px-5 py-4 text-sm bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none border-none"
          />
          <div className="flex justify-end px-5 py-3 border-t border-border bg-muted/30">
            <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer border-none">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
