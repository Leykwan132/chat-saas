import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import {
  Upload,
  Check,
  ChevronLeft,
  ChevronDown,
  X,
  AlertCircle,
  Loader2,
  ArrowUpFromLine,
  Plus,
  Minus,
  Flame,
  Sun,
  Snowflake,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

// ─── CSV Parsing ───────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        current += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        current += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(current);
        current = '';
      } else if (c === '\n' || (c === '\r' && next === '\n')) {
        row.push(current);
        current = '';
        if (row.some((cell) => cell.trim() !== '')) {
          rows.push(row);
        }
        row = [];
        if (c === '\r') i++;
      } else {
        current += c;
      }
    }
  }

  // Last field
  row.push(current);
  if (row.some((cell) => cell.trim() !== '')) {
    rows.push(row);
  }

  return rows;
}

// ─── Field Mapping Config ──────────────────────────────────

type MappableField = {
  key: string;
  label: string;
  required: boolean;
  /** Keywords to try for auto-mapping (lowercase) */
  autoMapHints: string[];
};

const MAPPABLE_FIELDS: MappableField[] = [
  {
    key: 'name',
    label: 'Customer Name',
    required: true,
    autoMapHints: ['name', 'full name', 'fullname', 'customer name', 'customer', 'contact name', 'contact'],
  },
  {
    key: 'email',
    label: 'Email',
    required: false,
    autoMapHints: ['email', 'e-mail', 'email address', 'mail'],
  },
  {
    key: 'phone',
    label: 'Phone',
    required: false,
    autoMapHints: ['phone', 'phone number', 'telephone', 'tel', 'mobile', 'cell', 'contact number'],
  },
  {
    key: 'notes',
    label: 'Notes',
    required: false,
    autoMapHints: ['notes', 'note', 'comments', 'comment', 'description', 'remarks'],
  },
];

function autoMapFields(
  headers: string[],
  customFields: { key: string; label: string }[] = [],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  // 1. Standard fields
  for (const field of MAPPABLE_FIELDS) {
    const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
    for (const hint of field.autoMapHints) {
      const idx = normalizedHeaders.findIndex(
        (h) => h === hint && !usedHeaders.has(headers[normalizedHeaders.indexOf(h)]),
      );
      if (idx !== -1) {
        const header = headers[idx];
        mapping[field.key] = header;
        usedHeaders.add(header);
        break;
      }
    }
  }

  // 2. Custom fields
  for (const field of customFields) {
    const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
    const hints = [field.key.toLowerCase(), field.label.toLowerCase()];
    for (const hint of hints) {
      const idx = normalizedHeaders.findIndex(
        (h) => h === hint && !usedHeaders.has(headers[normalizedHeaders.indexOf(h)]),
      );
      if (idx !== -1) {
        const header = headers[idx];
        mapping[field.key] = header;
        usedHeaders.add(header);
        break;
      }
    }
  }

  return mapping;
}

// ─── Stepper ───────────────────────────────────────────────

const STEPS = [
  { key: 'upload', label: 'Select File' },
  { key: 'mapping', label: 'Mapping' },
  { key: 'processing', label: 'Import' },
] as const;

type Step = (typeof STEPS)[number]['key'];

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <div
                className={cn(
                  'h-px w-6 transition-colors',
                  isDone ? 'bg-emerald-500' : 'bg-border',
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-[11px] font-semibold transition-all',
                  isDone
                    ? 'bg-emerald-500 text-white dark:bg-emerald-600'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-muted text-muted-foreground',
                )}
              >
                {isDone ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium transition-colors hidden sm:inline',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tag Input Dropdown ────────────────────────────────────

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#06b6d4', // Cyan
    '#6366f1', // Indigo
  ];
  const idx = Math.abs(hash) % colors.length;
  return colors[idx];
}

function TagInput({
  tags,
  onChange,
  suggestedTags,
  disabled,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestedTags: string[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleSelect = (tag: string) => {
    if (tags.includes(tag)) {
      onChange(tags.filter((t) => t !== tag));
    } else {
      onChange([...tags, tag]);
    }
  };

  const handleCreate = () => {
    const val = search.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
    }
    setSearch('');
  };

  // Filter suggested tags that are not already selected and match search query
  const filteredSuggestions = useMemo(() => {
    const query = search.toLowerCase().trim();
    return suggestedTags.filter((tag) => {
      const isSelected = tags.includes(tag);
      if (isSelected) return false;
      if (!query) return true;
      return tag.toLowerCase().includes(query);
    });
  }, [suggestedTags, tags, search]);

  const showCreateOption = search.trim() !== '' && 
    !suggestedTags.some(t => t.toLowerCase() === search.toLowerCase().trim()) && 
    !tags.some(t => t.toLowerCase() === search.toLowerCase().trim());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 min-h-[40px] text-left w-full outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors cursor-pointer',
            disabled && 'opacity-60 pointer-events-none',
          )}
        >
          {tags.length === 0 ? (
            <span className="text-muted-foreground text-xs">Select or create tags...</span>
          ) : (
            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 max-h-[70px] overflow-y-auto py-0.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1.5 text-xs pr-1 pl-1.5 rounded-sm">
                  <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: getTagColor(tag) }} />
                  {tag}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(tags.filter((t) => t !== tag));
                    }}
                    className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 cursor-pointer"
                  >
                    <X className="size-3" />
                  </span>
                </Badge>
              ))}
            </div>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0 ml-auto" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-0 rounded-md overflow-hidden" align="start" onWheel={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-0 overflow-hidden">
          {/* Search Input */}
          <div className="shrink-0 p-2 border-b border-border">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or type a new tag..."
                className="h-8 pl-9 text-xs rounded-md"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
            </div>
          </div>

          {/* List Area */}
          <ScrollArea className="h-60 overflow-hidden">
            <div className="p-1 flex flex-col gap-0.5">
              {showCreateOption && (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-muted text-blue-600 dark:text-blue-400 font-medium"
                >
                  <Plus className="size-3.5 shrink-0" />
                  <span>Create tag "{search}"</span>
                </button>
              )}

              {filteredSuggestions.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Suggested Tags
                  </div>
                  {filteredSuggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        handleSelect(tag);
                        setSearch('');
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-muted text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: getTagColor(tag) }} />
                        <span>{tag}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {tags.length > 0 && filteredSuggestions.length === 0 && (
                <div className="flex flex-col gap-0.5 mt-1.5">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Active Tags
                  </div>
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSelect(tag)}
                      className="flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-muted bg-muted/40 text-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: getTagColor(tag) }} />
                        <span>{tag}</span>
                      </div>
                      <Check className="size-3 text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {filteredSuggestions.length === 0 && !showCreateOption && tags.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No tags found. Type to create one.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Component ────────────────────────────────────────

const MAX_ROWS = 5000;
/** Client → server chunk size (fits within Convex's argument limit). */
const CHUNK_SIZE = 200;

const DEFAULT_SUGGESTED_TAGS = ['VIP', 'Lead', 'Customer'];

export function ImportCustomersDialog({
  open,
  onOpenChange,
  existingTags,
  agentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTags?: string[];
  agentId: Id<'agents'>;
}) {
  const suggestedTags = useMemo(() => {
    const set = new Set([...DEFAULT_SUGGESTED_TAGS, ...(existingTags ?? [])]);
    return Array.from(set).sort();
  }, [existingTags]);

  const activeTeam = useQuery(api.teams.getActiveTeam);
  const [localCustomFields, setLocalCustomFields] = useState<{ id: string; label: string }[]>([]);
  const [removedDbCustomFieldKeys, setRemovedDbCustomFieldKeys] = useState<Set<string>>(new Set());

  const dbCustomFields = useMemo(() => {
    return activeTeam?.customFields ?? [];
  }, [activeTeam]);

  const mappableFields = useMemo(() => {
    const dbCustom = dbCustomFields
      .filter((cf) => !removedDbCustomFieldKeys.has(cf.key))
      .map((cf) => ({
        key: cf.key,
        label: cf.label,
        required: false,
      }));
    const localCustom = localCustomFields.map((cf) => ({
      key: cf.id,
      label: cf.label,
      required: false,
    }));
    return [...MAPPABLE_FIELDS, ...dbCustom, ...localCustom];
  }, [dbCustomFields, removedDbCustomFieldKeys, localCustomFields]);

  // State
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [leadTemperature, setLeadTemperature] = useState<'Hot' | 'Warm' | 'Cold' | 'None'>('None');
  const [importId, setImportId] = useState<Id<'customerImports'> | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const createImportSession = useMutation(api.customerImportPool.createImportSession);
  const startImport = useMutation(api.customerImportPool.startImport);
  const addCustomFields = useMutation(api.teams.addCustomFields);

  const handleRemoveCustomField = (id: string) => {
    if (id.startsWith('custom_')) {
      setRemovedDbCustomFieldKeys((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setFieldMapping((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } else {
      setLocalCustomFields((prev) => prev.filter((f) => f.id !== id));
      setFieldMapping((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  // Data rows (excluding header row if applicable)
  const dataRows = useMemo(() => {
    if (rawRows.length === 0) return [];
    return hasHeaders ? rawRows.slice(1) : rawRows;
  }, [rawRows, hasHeaders]);

  // Parse the uploaded file
  const handleFile = useCallback(
    (f: File) => {
      if (!f.name.endsWith('.csv')) {
        toast.error('Please upload a .csv file');
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds the 10MB limit. Please upload a smaller file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length < 2) {
          toast.error('The CSV file appears to be empty or has only a header.');
          return;
        }
        if (parsed.length - 1 > MAX_ROWS) {
          toast.error(`CSV exceeds the ${MAX_ROWS.toLocaleString()} row limit. Please split the file.`);
          return;
        }
        setFile(f);
        setRawRows(parsed);
        // Auto-detect headers
        const firstRow = parsed[0].map((h, i) => h.trim() || `Column ${i + 1}`);
        setHeaders(firstRow);
        setFieldMapping(autoMapFields(firstRow, dbCustomFields));
        setStep('mapping');
      };
      reader.readAsText(f);
    },
    [dbCustomFields],
  );

  // Reset on close
  useEffect(() => {
    if (!open) {
      // Delay reset to allow exit animation
      const t = setTimeout(() => {
        setStep('upload');
        setFile(null);
        setRawRows([]);
        setHeaders([]);
        setHasHeaders(true);
        setFieldMapping({});
        setTags([]);
        setLeadTemperature('None');
        setImportId(null);
        setIsSending(false);
        setLocalCustomFields([]);
        setRemovedDbCustomFieldKeys(new Set());
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // Handle toggling hasHeaders
  const handleHasHeadersChange = (val: boolean) => {
    setHasHeaders(val);
    if (val && rawRows.length > 0) {
      const firstRow = rawRows[0].map((h, i) => h.trim() || `Column ${i + 1}`);
      setHeaders(firstRow);
      setFieldMapping(autoMapFields(firstRow, dbCustomFields));
    } else if (!val && rawRows.length > 0) {
      // Generate generic column headers
      const cols = rawRows[0].map((_, i) => `Column ${i + 1}`);
      setHeaders(cols);
      setFieldMapping({});
    }
  };

  // Start import
  const handleStartImport = async () => {
    // Validate mapping — name is required
    if (!fieldMapping.name) {
      toast.error('Please map the Customer Name field.');
      return;
    }

    setIsSending(true);

    try {
      // Check for duplicate custom field names
      const seenLabels = new Set<string>();
      for (const cf of localCustomFields) {
        const trimmed = cf.label.trim();
        if (!trimmed) {
          toast.error('Custom field names cannot be empty.');
          setIsSending(false);
          return;
        }
        if (seenLabels.has(trimmed.toLowerCase())) {
          toast.error(`Duplicate custom field name found: "${trimmed}". Please use unique names.`);
          setIsSending(false);
          return;
        }
        seenLabels.add(trimmed.toLowerCase());
      }

      // 1. Resolve final keys for local custom fields
      const finalCustomFields: { key: string; label: string }[] = [];
      const updatedFieldMapping = { ...fieldMapping };
      const existingKeys = new Set((activeTeam?.customFields ?? []).map((f) => f.key));

      for (const cf of localCustomFields) {
        const trimmedLabel = cf.label.trim();
        const slug = trimmedLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '');
        const finalKey = `custom_${slug}`;

        // Only add if not already exists in database
        if (!existingKeys.has(finalKey)) {
          finalCustomFields.push({ key: finalKey, label: trimmedLabel });
        }

        // Map the temporary ID to the final key
        if (cf.id in updatedFieldMapping) {
          updatedFieldMapping[finalKey] = updatedFieldMapping[cf.id];
          delete updatedFieldMapping[cf.id];
        }
      }

      // 2. Persist the final custom fields list to the database
      if (finalCustomFields.length > 0) {
        await addCustomFields({ fields: finalCustomFields });
      }

      // Build row objects with header keys
      const rowObjects = dataRows.map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] ?? '';
        });
        return obj;
      });

      // Create aggregate import session
      const generatedImportId = await createImportSession({
        fileName: file?.name ?? 'import.csv',
        totalRows: rowObjects.length,
      });

      // Send in chunks to respect Convex argument limits
      for (let i = 0; i < rowObjects.length; i += CHUNK_SIZE) {
        const chunk = rowObjects.slice(i, i + CHUNK_SIZE);
        await startImport({
          importId: generatedImportId,
          agentId,
          fileName: file?.name ?? 'import.csv',
          rows: chunk,
          fieldMapping: updatedFieldMapping,
          tags,
          leadTemperature: leadTemperature === 'None' ? undefined : leadTemperature,
        });
      }

      setImportId(generatedImportId);
      setStep('processing');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Import failed: ${msg}`);
    } finally {
      setIsSending(false);
    }
  };

  // Example data for preview (show 1 sample data)
  const previewRows = dataRows.slice(0, 1);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (step !== 'processing' || !isSending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-3xl h-[750px] max-h-[95vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="relative flex items-center justify-center border-b border-border px-6 py-4">
          <DialogHeader className="absolute left-6 top-1/2 -translate-y-1/2 p-0 space-y-0">
            <DialogTitle className="text-base font-semibold">Import Customers</DialogTitle>
          </DialogHeader>
          <StepIndicator currentStep={step} />
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex-1 overflow-y-auto flex flex-col">
          {step === 'upload' && (
            <UploadStage
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFile={handleFile}
            />
          )}
          {step === 'mapping' && (
            <MappingStage
              headers={headers}
              hasHeaders={hasHeaders}
              onHasHeadersChange={handleHasHeadersChange}
              fieldMapping={fieldMapping}
              onFieldMappingChange={setFieldMapping}
              previewRows={previewRows}
              tags={tags}
              onTagsChange={setTags}
              suggestedTags={suggestedTags}
              leadTemperature={leadTemperature}
              onLeadTemperatureChange={setLeadTemperature}
              totalRows={dataRows.length}
              mappableFields={mappableFields}
              localCustomFieldKeys={localCustomFields.map((f) => f.id)}
              onAddCustomField={() => {
                const newId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                setLocalCustomFields((prev) => [...prev, { id: newId, label: '' }]);
              }}
              onRemoveCustomField={handleRemoveCustomField}
              onUpdateCustomFieldLabel={(id, newLabel) => {
                setLocalCustomFields((prev) =>
                  prev.map((f) => (f.id === id ? { ...f, label: newLabel } : f))
                );
              }}
            />
          )}
          {step === 'processing' && <ProcessingStage importId={importId} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div>
            {step === 'mapping' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setRawRows([]);
                  setHeaders([]);
                  setFieldMapping({});
                  setLocalCustomFields([]);
                }}
              >
                <ChevronLeft className="size-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step !== 'processing' && (
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            {step === 'mapping' && (
              <Button size="sm" onClick={handleStartImport} disabled={isSending || !fieldMapping.name}>
                {isSending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUpFromLine className="size-4" />}
                {isSending ? 'Starting...' : `Import ${dataRows.length.toLocaleString()} rows`}
              </Button>
            )}
            {step === 'processing' && (
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stage 1: Upload ───────────────────────────────────────

function UploadStage({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFile,
}: {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFile: (f: File) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 w-full">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed py-12 px-8 transition-all cursor-pointer flex-1',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-muted/30',
        )}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.csv';
          input.onchange = (e) => {
            const f = (e.target as HTMLInputElement).files?.[0];
            if (f) onFile(f);
          };
          input.click();
        }}
      >
        <div
          className={cn(
            'flex size-14 items-center justify-center rounded-2xl transition-colors',
            isDragging ? 'bg-primary/10' : 'bg-muted',
          )}
        >
          <Upload className={cn('size-6 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground')} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {isDragging ? 'Drop your file here' : 'Drag & drop your CSV file'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            or click to browse • .csv files up to 10MB ({MAX_ROWS.toLocaleString()} rows)
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Stage 2: Mapping ──────────────────────────────────────

function MappingStage({
  headers,
  hasHeaders,
  onHasHeadersChange,
  fieldMapping,
  onFieldMappingChange,
  previewRows,
  tags,
  onTagsChange,
  suggestedTags,
  leadTemperature,
  onLeadTemperatureChange,
  totalRows,
  mappableFields,
  localCustomFieldKeys,
  onAddCustomField,
  onRemoveCustomField,
  onUpdateCustomFieldLabel,
}: {
  headers: string[];
  hasHeaders: boolean;
  onHasHeadersChange: (val: boolean) => void;
  fieldMapping: Record<string, string>;
  onFieldMappingChange: (mapping: Record<string, string>) => void;
  previewRows: string[][];
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestedTags: string[];
  leadTemperature: 'Hot' | 'Warm' | 'Cold' | 'None';
  onLeadTemperatureChange: (val: 'Hot' | 'Warm' | 'Cold' | 'None') => void;
  totalRows: number;
  mappableFields: { key: string; label: string; required: boolean }[];
  localCustomFieldKeys: string[];
  onAddCustomField: () => void;
  onRemoveCustomField: (key: string) => void;
  onUpdateCustomFieldLabel: (key: string, label: string) => void;
}) {
  const handleFieldChange = (fieldKey: string, csvColumn: string) => {
    const updated = { ...fieldMapping };
    if (csvColumn === '__none__') {
      delete updated[fieldKey];
    } else {
      updated[fieldKey] = csvColumn;
    }
    onFieldMappingChange(updated);
  };

  const getPreviewData = (csvColumn: string): string => {
    const colIndex = headers.indexOf(csvColumn);
    if (colIndex === -1) return '';
    return previewRows
      .map((row) => row[colIndex] ?? '')
      .filter(Boolean)
      .slice(0, 1)
      .join('');
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Map your data</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Match the columns from your CSV file to the corresponding customer fields.
        </p>
      </div>

      {/* Toggle + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch checked={hasHeaders} onCheckedChange={onHasHeadersChange} />
          <span className="text-sm text-foreground">First row contains headers</span>
        </div>
        <span className="text-xs text-muted-foreground">{totalRows.toLocaleString()} rows detected</span>
      </div>

      {/* Mapping table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[220px]">
                Fields
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[220px]">
                Columns
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sample data
              </th>
            </tr>
          </thead>
          <tbody>
            {mappableFields.map((field) => {
              const mapped = fieldMapping[field.key] ?? '';
              const isMapped = !!mapped;
              const isLocalCustom = localCustomFieldKeys.includes(field.key);
              const isCustomField = isLocalCustom || field.key.startsWith('custom_');
              return (
                <tr key={field.key} className="border-t border-border group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 min-h-[32px]">
                      {isCustomField && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => onRemoveCustomField(field.key)}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                      )}
                      {isLocalCustom ? (
                        <Input
                          value={field.label}
                          onChange={(e) => onUpdateCustomFieldLabel(field.key, e.target.value)}
                          placeholder="Enter field name..."
                          className="h-8 bg-background border-border text-xs font-medium max-w-[180px]"
                          autoFocus={!field.label}
                        />
                      ) : (
                        <span className="font-medium text-foreground">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={mapped || '__none__'}
                      onValueChange={(val) => handleFieldChange(field.key, val)}
                    >
                      <SelectTrigger className="w-full h-9 px-3 py-1.5 text-xs bg-background border-border rounded-md">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="text-muted-foreground">Select column</span>
                        </SelectItem>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono truncate max-w-[240px]">
                    {isMapped ? getPreviewData(mapped) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Custom Field Button */}
      <div className="flex justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddCustomField}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          Add Custom Field
        </Button>
      </div>

      {/* Tags & Lead Temperature */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Apply Tags <span className="text-muted-foreground/60 font-normal ml-1">(optional)</span>
          </label>
          <TagInput tags={tags} onChange={onTagsChange} suggestedTags={suggestedTags} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Lead Status <span className="text-muted-foreground/60 font-normal ml-1">(optional)</span>
          </label>
          <Select
            value={leadTemperature}
            onValueChange={(val) => onLeadTemperatureChange(val as any)}
          >
            <SelectTrigger className="w-full !h-10 px-3 py-1.5 text-xs bg-background border-border rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Hot">
                <div className="flex items-center gap-2">
                  <Flame className="size-4 text-red-500 fill-red-500/20" />
                  <span>Hot</span>
                </div>
              </SelectItem>
              <SelectItem value="Warm">
                <div className="flex items-center gap-2">
                  <Sun className="size-4 text-amber-500 fill-amber-500/20" />
                  <span>Warm</span>
                </div>
              </SelectItem>
              <SelectItem value="Cold">
                <div className="flex items-center gap-2">
                  <Snowflake className="size-4 text-sky-500" />
                  <span>Cold</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ─── Stage 3: Processing ───────────────────────────────────

function ProcessingStage({ importId }: { importId: Id<'customerImports'> | null }) {
  const jobStatus = useQuery(
    api.customerImportPool.getImportJobStatus,
    importId ? { importId } : 'skip',
  );

  if (!importId || !jobStatus) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 flex-1">
        <Loader2 className="size-8 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Starting import...</p>
      </div>
    );
  }

  const totalDone = jobStatus.processedRows + jobStatus.failedRows + jobStatus.skippedRows;
  const percent = jobStatus.totalRows > 0 ? Math.round((totalDone / jobStatus.totalRows) * 100) : 0;
  const isComplete = jobStatus.status === 'completed';
  const isFailed = jobStatus.status === 'failed';

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 py-4">
      {/* Icon */}
      <div
        className={cn(
          'flex size-12 items-center justify-center rounded-full transition-colors',
          isComplete
            ? 'bg-emerald-500 dark:bg-emerald-600'
            : isFailed
              ? 'bg-red-500/10'
              : 'bg-primary/10',
        )}
      >
        {isComplete ? (
          <Check className="size-6 text-white" strokeWidth={3} />
        ) : isFailed ? (
          <AlertCircle className="size-6 text-red-500" />
        ) : (
          <Loader2 className="size-6 text-primary animate-spin" />
        )}
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">
          {isComplete
            ? `Successfully imported ${jobStatus.processedRows} of ${jobStatus.totalRows} contacts`
            : isFailed
              ? 'Import Failed'
              : 'Importing Customers...'}
        </h3>
        {(!isComplete || isFailed) && (
          <p className="text-sm text-muted-foreground mt-1">
            {isFailed
              ? 'An error occurred during the import.'
              : `Processing ${jobStatus.fileName}...`}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <Progress value={percent} className="h-2" />
        <p className="text-xs text-muted-foreground text-center mt-2">
          {totalDone} of {jobStatus.totalRows} contacts processed ({percent}% complete)
        </p>
      </div>

      {/* Accordion of skipped/failed rows */}
      {isComplete && (jobStatus.skippedRows > 0 || jobStatus.failedRows > 0) && (
        <Accordion type="single" collapsible className="w-full max-w-md border border-border rounded-lg bg-card">
          <AccordionItem value="skipped-details" className="border-none">
            <AccordionTrigger className="flex items-center justify-between px-4 py-2.5 text-xs font-medium hover:no-underline text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                <span>{jobStatus.skippedRows + jobStatus.failedRows} skipped contacts</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3 pt-1.5 text-xs border-t border-border/50">
              <div className="max-h-[160px] overflow-y-auto pr-1 flex flex-col gap-3 mt-2 scrollbar-thin">
                {jobStatus.issues && jobStatus.issues.length > 0 ? (
                  jobStatus.issues.map((issue, idx) => (
                    <div key={idx} className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="text-foreground/90">
                          {issue.name || 'Unnamed Row'}
                        </span>
                        <span className={cn(
                          "text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0",
                          issue.type === "failed" 
                            ? "bg-red-500/10 text-red-600 dark:text-red-400" 
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}>
                          {issue.type}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-muted-foreground/50 text-[9px] uppercase tracking-wider font-semibold shrink-0">Reason:</span>
                        <span className="text-muted-foreground/80 font-normal">{issue.reason}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col gap-2">
                    {jobStatus.skippedRows > 0 && (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-muted-foreground/60 text-[10px] uppercase tracking-wider font-semibold shrink-0">Reason:</span>
                        <span className="font-medium text-foreground">Duplicate contact or missing required name</span>
                      </div>
                    )}
                    {jobStatus.failedRows > 0 && (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-muted-foreground/60 text-[10px] uppercase tracking-wider font-semibold shrink-0">Reason:</span>
                        <span className="font-medium text-foreground">Unexpected error occurred during row processing</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

// ─── Progress Banner (for CustomersPage) ───────────────────

export function ImportProgressBanner() {
  const activeImports = useQuery(api.customerImportPool.listActiveImports);

  if (!activeImports || activeImports.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {activeImports.map((job) => {
        const totalDone = job.processedRows + job.failedRows + job.skippedRows;
        const percent = job.totalRows > 0 ? Math.round((totalDone / job.totalRows) * 100) : 0;

        return (
          <div
            key={job._id}
            className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Loader2 className="size-4 text-primary animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium text-foreground truncate">
                  Importing {job.fileName}
                </p>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {job.processedRows} of {job.totalRows} customers
                  {job.failedRows > 0 && (
                    <span className="text-red-500 ml-1">({job.failedRows} failed)</span>
                  )}
                </span>
              </div>
              <Progress value={percent} className="h-1.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
