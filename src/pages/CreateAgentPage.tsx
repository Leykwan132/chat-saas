import { useState } from 'react';
import { useAuth } from '@workos-inc/authkit-react';
import { Authenticated, AuthLoading, Unauthenticated, useMutation } from 'convex/react';
import { Link, Navigate, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Bot, Plus, Globe, Mail, FileText } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { api } from '../../convex/_generated/api';
import { AGENT_TEMPLATES, GOOGLE_MODELS, type AgentTemplateKey } from '@/lib/agentTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RequireOrganization } from '@/components/RequireOrganization';

export default function CreateAgentPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-[100svh] items-center justify-center bg-background">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <Navigate to="/" replace />
      </Unauthenticated>

      <Authenticated>
        <RequireOrganization>
          <CreateAgentForm />
        </RequireOrganization>
      </Authenticated>
    </>
  );
}

function CreateAgentForm() {
  const navigate = useNavigate();
  const { organizationId } = useAuth();
  const activeOrgId = organizationId ?? null;
  const createAgent = useMutation(api.agents.create);

  const [name, setName] = useState('');
  const [templateKey, setTemplateKey] = useState<AgentTemplateKey>('blank');
  const [model, setModel] = useState(GOOGLE_MODELS[0].value);
  const [systemPrompt, setSystemPrompt] = useState(AGENT_TEMPLATES.blank.prompt);
  const [websiteUrls, setWebsiteUrls] = useState('');
  const [contacts, setContacts] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyTemplate = (key: AgentTemplateKey) => {
    setTemplateKey(key);
    setSystemPrompt(AGENT_TEMPLATES[key].prompt);
  };

  const handleCreate = async () => {
    setError(null);
    setIsCreating(true);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Agent name is required');
      setIsCreating(false);
      return;
    }

    const urls = websiteUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    try {
      const agentId = await createAgent({
        name: trimmedName,
        model,
        systemPrompt,
        templateKey,
        websiteUrls: urls,
        contacts: contacts.trim() || undefined,
        orgId: activeOrgId,
      });
      toast.success(`"${trimmedName}" created successfully`);
      navigate(`/dashboard/${agentId}/chats`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create agent');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/workspace">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-base font-semibold">Create AI Agent</h1>
        </div>
      </header>

      {/* Form */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-8">
          {/* 1. Website URLs */}
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Website URLs</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Add URLs the agent should know about. One per line.
              </p>
            </div>
            <div className="p-5">
              <textarea
                value={websiteUrls}
                onChange={(e) => setWebsiteUrls(e.target.value)}
                rows={4}
                placeholder="https://example.com&#10;https://docs.example.com"
                className="min-h-24 w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
              />
            </div>
          </section>

          {/* 2. Purpose */}
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Purpose</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose what this agent is built for.
              </p>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-3">
              {(Object.keys(AGENT_TEMPLATES) as AgentTemplateKey[]).map((key) => {
                const template = AGENT_TEMPLATES[key];
                const isActive = templateKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyTemplate(key)}
                    className={`rounded-lg border px-4 py-4 text-left transition-colors ${
                      isActive
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background hover:bg-muted'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{template.label}</span>
                    <span
                      className={`mt-2 block text-xs leading-5 ${
                        isActive ? 'text-background/70' : 'text-muted-foreground'
                      }`}
                    >
                      {template.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Contacts */}
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Contacts</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Contact details the agent can share with customers.
              </p>
            </div>
            <div className="p-5">
              <textarea
                value={contacts}
                onChange={(e) => setContacts(e.target.value)}
                rows={3}
                placeholder="support@company.com\n+1 (555) 123-4567"
                className="min-h-20 w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
              />
            </div>
          </section>

          {/* 4. Configuration */}
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Configuration</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Name, model, and system prompt.
              </p>
            </div>
            <div className="grid gap-5 p-5">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Name</span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sales Assistant"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Model</span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
                >
                  {GOOGLE_MODELS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">System prompt</span>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={10}
                  className="min-h-64 resize-none rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
                />
              </label>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link to="/workspace">Cancel</Link>
            </Button>
            <Button
              type="button"
              disabled={isCreating || !name.trim() || !systemPrompt.trim()}
              onClick={() => void handleCreate()}
            >
              {isCreating ? <Spinner className="size-4" /> : <Plus className="size-4" />}
              Create agent
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
