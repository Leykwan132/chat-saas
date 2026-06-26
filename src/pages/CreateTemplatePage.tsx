import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useMutation, useAction, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Upload,
  Trash2,
  Loader2,
  Plus,
  Phone,
  ExternalLink,
  Video,
  Copy,
  Type,
  Image,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { uploadWithProgress } from '@/lib/r2Upload';
import { cn } from '@/lib/utils';

const r2ClientApi = (api as any)["media/r2Client"];

type Purpose = 'broadcasting' | 'follow_up';
type HeaderType = 'TEXT' | 'IMAGE' | 'VIDEO';
type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';

type TemplateButton =
  | { type: 'QUICK_REPLY'; text: string }
  | { type: 'URL'; text: string; url: string }
  | { type: 'PHONE_NUMBER'; text: string; phone_number: string }
  | { type: 'COPY_CODE'; text: string; example: string };

function VariableTextarea({
  id,
  value,
  onChange,
  placeholder,
  className,
  rows,
  maxLength,
  required
}: {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  maxLength?: number;
  required?: boolean;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const handleScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  React.useEffect(() => {
    handleScroll();
  });

  const renderedParts = React.useMemo(() => {
    if (!value) return null;
    const regex = /(\{\{[^}]+\}\}|\{[^}]+\}|\[[^\]]+\])/g;
    const parts = value.split(regex);
    return parts.map((part, index) => {
      const isVar = part.startsWith('{') || part.startsWith('[');
      if (isVar) {
        return (
          <span
            key={index}
            className="inline-block px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold text-xs uppercase select-all"
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }, [value]);

  return (
    <div
      className={cn(
        "relative w-full rounded-lg border border-transparent bg-input/50 transition-[color,box-shadow,background-color] outline-none",
        isFocused && "border-ring ring-3 ring-ring/30",
        className
      )}
    >
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Background Highlighted Div */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none select-none overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words text-foreground text-sm px-3 py-3 font-sans leading-relaxed no-scrollbar"
        style={{
          color: 'var(--foreground)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {renderedParts || (
          <span className="text-muted-foreground/50">{placeholder}</span>
        )}
      </div>

      {/* Actual Textarea */}
      <textarea
        id={id}
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={value ? "" : placeholder}
        rows={rows}
        className={cn(
          "w-full resize-y min-h-[240px] bg-transparent text-transparent caret-foreground outline-none px-3 py-3 text-sm font-sans leading-relaxed selection:bg-primary/20 selection:text-transparent block",
          "placeholder:text-transparent"
        )}
        style={{
          caretColor: 'var(--foreground)',
        }}
        maxLength={maxLength}
        required={required}
      />
    </div>
  );
}





export default function CreateTemplatePage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const createLocalTemplate = useMutation(api.whatsappTemplates.createLocalTemplate);
  const generateUploadUrl = useMutation(r2ClientApi.generateUploadUrl);
  const syncMetadata = useAction(r2ClientApi.syncMetadata);

  // Form states
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('en_US');
  const [templateType, setTemplateType] = useState<'marketing' | 'utility'>('marketing');
  const purpose: Purpose = templateType === 'marketing' ? 'broadcasting' : 'follow_up';
  const [bodyText, setBodyText] = useState('');
  
  // Section Switches
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [footerEnabled, setFooterEnabled] = useState(false);
  const [buttonsEnabled, setButtonsEnabled] = useState(false);

  // Header options
  const [headerType, setHeaderType] = useState<HeaderType>('TEXT');
  const [headerText, setHeaderText] = useState('');
  const [headerMediaR2Key, setHeaderMediaR2Key] = useState<string | null>(null);
  const [headerMediaPreviewUrl, setHeaderMediaPreviewUrl] = useState<string | null>(null);
  const [pendingHeaderFile, setPendingHeaderFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'ready' | 'failed'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);

  // Footer options
  const [footerText, setFooterText] = useState('');

  // Buttons options
  const [templateButtons, setTemplateButtons] = useState<TemplateButton[]>([
    { type: 'QUICK_REPLY', text: '' }
  ]);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // Find active channels
  const whatsappChannels = useMemo(() => {
    if (!channels) return [];
    return channels.filter(
      (c: any) =>
        c.service === 'whatsapp' &&
        c.status === 'connected' &&
        Boolean(c.wabaId?.trim()) &&
        Boolean(c.phoneNumberId?.trim())
    );
  }, [channels]);

  const activeChannelId = useMemo(() => {
    return whatsappChannels[0]?._id || null;
  }, [whatsappChannels]);



  // Media Upload (Staged locally first)
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = headerType === 'VIDEO';
    const isImage = headerType === 'IMAGE';

    if (isVideo && !file.type.startsWith('video/')) {
      toast.error('Please upload a valid video file (e.g. MP4).');
      return;
    }
    if (isImage && !file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (e.g. PNG, JPG).');
      return;
    }

    setPendingHeaderFile(file);
    setFileName(file.name);
    setFileSize(file.size);
    setFileMime(file.type);

    // Local blob preview url
    const localUrl = URL.createObjectURL(file);
    setHeaderMediaPreviewUrl(localUrl);
    setUploadStatus('ready');
  };

  const handleMediaDelete = () => {
    setPendingHeaderFile(null);
    setHeaderMediaPreviewUrl(null);
    setHeaderMediaR2Key(null);
    setFileName(null);
    setFileSize(null);
    setFileMime(null);
    setUploadStatus('idle');
    setUploadProgress(0);
  };

  // Helper file info formatting
  const fileDetailsLabel = useMemo(() => {
    if (!fileName) return '';
    const ext = fileName.split('.').pop()?.toUpperCase() || (fileMime?.split('/')[1] || 'BIN').toUpperCase();
    const sizeMb = fileSize ? (fileSize / (1024 * 1024)).toFixed(1) : '0.0';
    return `${ext} · ${sizeMb} MB`;
  }, [fileName, fileSize, fileMime]);

  // Variables parsed for preview
  const parsedPreviewBody = useMemo(() => {
    if (!bodyText) return <span className="text-muted-foreground/50 italic text-sm">Type message body...</span>;
    const regex = /(\{\{[^}]+\}\}|\{[^}]+\}|\[[^\]]+\])/g;
    const parts = bodyText.split(regex);
    return parts.map((part, i) => {
      const isVar = part.startsWith('{') || part.startsWith('[');
      if (isVar) {
        const lower = part.toLowerCase();
        const isBlue = lower.includes('name') || lower.includes('first') || lower.includes('user');
        return (
          <span
            key={i}
            className={cn(
              "inline-block px-1 py-0.5 rounded text-[11px] font-semibold border mx-0.5 leading-none align-middle select-all",
              isBlue
                ? "bg-[#E6F0FF] text-[#0066FF] border-[#CCE0FF]/40 dark:bg-blue-950/40 dark:text-blue-400"
                : "bg-[#FFF0D4] text-[#D97706] border-[#FFE2B3]/40 dark:bg-amber-950/40 dark:text-amber-400"
            )}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }, [bodyText]);

  const hasInput = useMemo(() => {
    return (
      bodyText.trim().length > 0 ||
      (headerEnabled && (headerType === 'TEXT' ? headerText.trim().length > 0 : !!headerMediaPreviewUrl)) ||
      (footerEnabled && footerText.trim().length > 0) ||
      (buttonsEnabled && templateButtons.some(b => b.text.trim().length > 0))
    );
  }, [
    bodyText,
    headerEnabled,
    headerType,
    headerText,
    headerMediaPreviewUrl,
    footerEnabled,
    footerText,
    buttonsEnabled,
    templateButtons
  ]);



  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeChannelId) {
      toast.error('No active WhatsApp channel connected.');
      return;
    }

    const nameStr = templateName.trim();
    if (!nameStr) {
      toast.error('Template name is required.');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(nameStr)) {
      toast.error('Template name must be lower_case_snake_case only.');
      return;
    }

    if (!bodyText.trim()) {
      toast.error('Main message body is required.');
      return;
    }

    setSubmitting(true);

    try {
      let r2Key = headerMediaR2Key;
      if (headerEnabled && (headerType === 'IMAGE' || headerType === 'VIDEO') && pendingHeaderFile) {
        try {
          setUploadStatus('uploading');
          setUploadProgress(0);

          const clientId = crypto.randomUUID();
          const { url, key } = await generateUploadUrl({
            clientId,
            mediaType: pendingHeaderFile.type,
            filename: pendingHeaderFile.name,
          });

          await uploadWithProgress(url, pendingHeaderFile, (progress) => {
            const pct = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(pct);
          });

          await syncMetadata({ key, clientId });

          r2Key = key;
          setHeaderMediaR2Key(key);
          setUploadStatus('ready');
          setPendingHeaderFile(null);
        } catch (uploadErr) {
          setUploadStatus('failed');
          throw new Error('Header media upload failed. Please try again.');
        }
      }

      // Parse brackets to numbered placeholders
      const variables: string[] = [];
      const regex = /\{\{([^}]+)\}\}|\{([^}]+)\}|\[([^\]]+)\]/g;
      let count = 0;
      const normalizedText = bodyText.replace(regex, (_m, g1, g2, g3) => {
        count++;
        const varName = (g1 || g2 || g3 || `var${count}`).trim();
        variables.push(varName);
        return `{{${count}}}`;
      });

      const components: any[] = [];

      // 1. Header Component
      if (headerEnabled) {
        if (headerType === 'TEXT' && headerText.trim()) {
          components.push({
            type: 'HEADER',
            format: 'TEXT',
            text: headerText.trim()
          });
        } else if ((headerType === 'IMAGE' || headerType === 'VIDEO') && r2Key) {
          components.push({
            type: 'HEADER',
            format: headerType,
            r2Key: r2Key
          });
        }
      }

      // 2. Body Component (Main Message)
      const bodyComponent: any = {
        type: 'BODY',
        text: normalizedText.trim(),
      };

      if (variables.length > 0) {
        bodyComponent.example = {
          body_text: [
            variables.map(v => v) // Map matching variable labels as reviewer examples
          ]
        };
      }
      components.push(bodyComponent);

      // 3. Footer Component
      if (footerEnabled && footerText.trim()) {
        components.push({
          type: 'FOOTER',
          text: footerText.trim()
        });
      }

      // 4. Buttons Component
      if (buttonsEnabled && templateButtons.length > 0) {
        const formattedButtons = templateButtons
          .filter(b => b.text.trim())
          .map(b => {
            if (b.type === 'QUICK_REPLY') {
              return { type: 'QUICK_REPLY', text: b.text.trim() };
            }
            if (b.type === 'URL') {
              return { type: 'URL', text: b.text.trim(), url: b.url.trim() };
            }
            if (b.type === 'PHONE_NUMBER') {
              return { type: 'PHONE_NUMBER', text: b.text.trim(), phone_number: b.phone_number.trim() };
            }
            if (b.type === 'COPY_CODE') {
              return { type: 'COPY_CODE', text: b.text.trim(), example: b.example.trim() };
            }
            return null;
          })
          .filter(Boolean);

        if (formattedButtons.length > 0) {
          components.push({
            type: 'BUTTONS',
            buttons: formattedButtons
          });
        }
      }

      await createLocalTemplate({
        channelId: activeChannelId,
        name: nameStr,
        language: templateLanguage.trim() || 'en_US',
        purpose,
        components
      });

      toast.success('Template saved. Submitting to Meta in the background.');
      navigate(`/dashboard/${agentId}/templates`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to save template.');
    } finally {
      setSubmitting(false);
    }
  };

  if (channels === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl pb-20 animate-fade-in">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          asChild
        >
          <Link to={`/dashboard/${agentId}/templates`}>
            <ArrowLeft className="size-4" />
            Back to Message Template
          </Link>
        </Button>
      </div>

      <header className="border-b border-border pb-6 mb-6">
        <h1 className="m-0 text-2xl font-bold tracking-tight text-foreground">
          Create template
        </h1>
      </header>



      {/* Two Column Layout */}
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 items-start">
        {/* Left Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          
          {/* Card 1: Basic Info */}
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground m-0">Basic Information</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Template Name
                </Label>
                <Input
                  id="tpl-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder="e.g. order_update"
                  autoComplete="off"
                  required
                />
                <span className="text-[10px] text-muted-foreground/85">
                  Lower case letters, numbers and underscores only.
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tpl-lang" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Language
                </Label>
                <Input
                  id="tpl-lang"
                  value={templateLanguage}
                  onChange={(e) => setTemplateLanguage(e.target.value)}
                  placeholder="en_US"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Type
                </Label>
                <Select
                  value={templateType}
                  onValueChange={(val) => setTemplateType(val as 'marketing' | 'utility')}
                >
                  <SelectTrigger className="w-full h-9 bg-card border border-input rounded-md text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="utility">Utility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Card 4: Main Message */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground m-0">
                  Main Message <span className="text-red-500 font-bold ml-0.5">*</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">The primary body copy of your template (required).</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <VariableTextarea
                id="tpl-body"
                value={bodyText}
                onChange={setBodyText}
                placeholder="Type your WhatsApp message. Variables are auto-detected inside brackets, e.g. [name], {discount}, or {{order_id}}."
                rows={10}
                maxLength={1024}
                required
              />
              <span className={cn(
                "text-[10px] font-medium self-end select-none",
                bodyText.length >= 1024 ? "text-destructive font-bold" : "text-muted-foreground/80"
              )}>
                {bodyText.length}/1024 chars{bodyText.length >= 1024 && " (You have hit the limit)"}
              </span>
            </div>
          </div>

          {/* Card 3: Header (Optional) */}
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4 shadow-3xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground m-0">Header</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Optional intro as text, image, or video.</p>
              </div>
              <Switch
                checked={headerEnabled}
                onCheckedChange={setHeaderEnabled}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>

            {headerEnabled && (
              <div className="flex flex-col gap-4 mt-2 animate-fade-in">
                {/* Segment tabs selector */}
                <div className="flex rounded-lg bg-muted p-1 border border-border w-fit select-none">
                  {(['TEXT', 'IMAGE', 'VIDEO'] as HeaderType[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setHeaderType(tab);
                        handleMediaDelete();
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold capitalize transition-all cursor-pointer ${
                        headerType === tab
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab === 'TEXT' && <Type className="size-3.5" />}
                      {tab === 'IMAGE' && <Image className="size-3.5" />}
                      {tab === 'VIDEO' && <Video className="size-3.5" />}
                      <span>{tab.toLowerCase()}</span>
                    </button>
                  ))}
                </div>

                {/* Form fields based on selected tab */}
                {headerType === 'TEXT' ? (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="header-text" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Header text
                    </Label>
                    <Input
                      id="header-text"
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      placeholder="e.g. Order Confirmation"
                      maxLength={60}
                    />
                    <span className={cn(
                      "text-[10px] self-end",
                      headerText.length >= 60 ? "text-destructive font-bold" : "text-muted-foreground/80"
                    )}>
                      {headerText.length}/60 chars{headerText.length >= 60 && " (You have hit the limit)"}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {uploadStatus === 'idle' && (
                      <div className="border border-dashed border-border rounded-lg p-5 flex flex-col items-center justify-center bg-muted/10 relative hover:bg-muted/20 transition-colors">
                        <input
                          type="file"
                          accept={headerType === 'IMAGE' ? 'image/*' : 'video/*'}
                          onChange={handleMediaUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Upload className="size-6 text-muted-foreground mb-2" />
                        <p className="text-xs font-medium text-muted-foreground">
                          Drag & drop or click to upload {headerType.toLowerCase()}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {headerType === 'IMAGE' ? 'PNG or JPG up to 5MB' : 'MP4 video up to 16MB'}
                        </p>
                      </div>
                    )}

                    {uploadStatus === 'uploading' && (
                      <div className="border border-border rounded-lg p-5 flex flex-col items-center justify-center bg-muted/15">
                        <Loader2 className="size-6 animate-spin text-primary mb-2" />
                        <p className="text-xs font-semibold text-foreground">Staging file to R2...</p>
                        <div className="w-full max-w-xs bg-muted rounded-full h-1.5 mt-3 overflow-hidden">
                          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1.5">{uploadProgress}%</span>
                      </div>
                    )}

                    {(uploadStatus === 'ready' || uploadStatus === 'failed') && (
                      <div className="border border-border rounded-lg p-3.5 flex items-center justify-between bg-card">
                        <div className="flex items-center gap-3">
                          {headerType === 'IMAGE' && headerMediaPreviewUrl ? (
                            <img
                              src={headerMediaPreviewUrl}
                              alt="Header thumbnail"
                              className="size-10 rounded object-cover border border-border"
                            />
                          ) : (
                            <div className="size-10 rounded bg-muted flex items-center justify-center border border-border">
                              <Video className="size-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold truncate max-w-[180px] text-foreground">
                              {fileName || 'staged_file'}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                              {uploadStatus === 'ready' ? (
                                fileDetailsLabel
                              ) : (
                                <span className="text-red-500 font-semibold">Upload failed</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleMediaDelete}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-8 rounded-lg"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 5: Footer (Optional) */}
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4 shadow-3xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground m-0">Footer</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Optional grey text shown below the message body.</p>
              </div>
              <Switch
                checked={footerEnabled}
                onCheckedChange={setFooterEnabled}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>

            {footerEnabled && (
              <div className="flex flex-col gap-1.5 mt-2 animate-fade-in">
                <Input
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="e.g. Reply STOP to opt out."
                  maxLength={60}
                />
                <span className={cn(
                  "text-[10px] self-end",
                  footerText.length >= 60 ? "text-destructive font-bold" : "text-muted-foreground/80"
                )}>
                  {footerText.length}/60 chars{footerText.length >= 60 && " (You have hit the limit)"}
                </span>
              </div>
            )}
          </div>

          {/* Card 6: Buttons (Optional) */}
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4 shadow-3xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground m-0">Buttons</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Add interactive actions to the message.</p>
              </div>
              <Switch
                checked={buttonsEnabled}
                onCheckedChange={setButtonsEnabled}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>

            {buttonsEnabled && (
              <div className="flex flex-col gap-5 mt-2 animate-fade-in">
                {templateButtons.map((btn, idx) => (
                  <div key={idx} className="flex flex-col gap-3.5">
                    {idx > 0 && <div className="h-px bg-border/40 my-1" />}
                    
                    <div className="flex flex-wrap items-end gap-3">
                      {/* Button Text Input (First) */}
                      <div className="flex flex-col gap-1.5 w-[240px]">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Button Text</Label>
                        <Input
                          value={btn.text}
                          onChange={(e) => {
                            const updated = [...templateButtons];
                            updated[idx] = { ...updated[idx], text: e.target.value } as any;
                            setTemplateButtons(updated);
                          }}
                          maxLength={25}
                          placeholder={
                            btn.type === 'QUICK_REPLY'
                              ? 'e.g. Reply back'
                              : btn.type === 'URL'
                                ? 'e.g. Visit Website'
                                : btn.type === 'PHONE_NUMBER'
                                  ? 'e.g. Call Us'
                                  : 'e.g. Copy Code'
                          }
                          required
                        />
                      </div>

                      {/* Button Type Select (Next to it) */}
                      <div className="flex flex-col gap-1.5 w-[160px]">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Type</Label>
                        <Select
                          value={btn.type}
                          onValueChange={(val) => {
                            const newType = val as ButtonType;
                            const updated = [...templateButtons];
                            if (newType === 'QUICK_REPLY') {
                              updated[idx] = { type: 'QUICK_REPLY', text: '' };
                            } else if (newType === 'URL') {
                              updated[idx] = { type: 'URL', text: 'Visit Website', url: 'https://' };
                            } else if (newType === 'PHONE_NUMBER') {
                              updated[idx] = { type: 'PHONE_NUMBER', text: 'Call Us', phone_number: '' };
                            } else if (newType === 'COPY_CODE') {
                              updated[idx] = { type: 'COPY_CODE', text: 'Copy Code', example: 'PROMO20' };
                            }
                            setTemplateButtons(updated);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                            <SelectItem value="URL">Visit URL</SelectItem>
                            <SelectItem value="PHONE_NUMBER">Call Phone</SelectItem>
                            <SelectItem value="COPY_CODE">Copy Code</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Delete Button */}
                      {templateButtons.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = templateButtons.filter((_, i) => i !== idx);
                            setTemplateButtons(updated.length > 0 ? updated : [{ type: 'QUICK_REPLY', text: '' }]);
                          }}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-9 rounded-lg"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>

                    {/* URL Address */}
                    {btn.type === 'URL' && (
                      <div className="flex flex-col gap-1.5 w-[412px] max-w-full">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">URL Address</Label>
                        <Input
                          value={btn.url}
                          onChange={(e) => {
                            const updated = [...templateButtons];
                            if (updated[idx].type === 'URL') {
                              (updated[idx] as any).url = e.target.value;
                            }
                            setTemplateButtons(updated);
                          }}
                          placeholder="https://example.com"
                          required
                        />
                      </div>
                    )}

                    {/* Phone Number */}
                    {btn.type === 'PHONE_NUMBER' && (
                      <div className="flex flex-col gap-1.5 w-[412px] max-w-full">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Phone Number</Label>
                        <Input
                          value={btn.phone_number}
                          onChange={(e) => {
                            const updated = [...templateButtons];
                            if (updated[idx].type === 'PHONE_NUMBER') {
                              (updated[idx] as any).phone_number = e.target.value;
                            }
                            setTemplateButtons(updated);
                          }}
                          placeholder="e.g. +60123456789"
                          required
                        />
                      </div>
                    )}

                    {btn.type === 'COPY_CODE' && (
                      <div className="flex flex-col gap-1.5 w-[412px] max-w-full">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Example OTP/Promo Code</Label>
                        <Input
                          value={btn.example}
                          onChange={(e) => {
                            const updated = [...templateButtons];
                            if (updated[idx].type === 'COPY_CODE') {
                              (updated[idx] as any).example = e.target.value;
                            }
                            setTemplateButtons(updated);
                          }}
                          maxLength={15}
                          placeholder="e.g. OTP123"
                          required
                        />
                      </div>
                    )}
                  </div>
                ))}

                {/* Add button trigger at the end */}
                {templateButtons.length < 10 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTemplateButtons([...templateButtons, { type: 'QUICK_REPLY', text: '' }])}
                    className="w-fit h-auto p-0 text-primary hover:text-primary/80 hover:bg-transparent font-semibold flex items-center gap-1.5 cursor-pointer shadow-none"
                  >
                    <Plus className="size-4" />
                    Add button
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/dashboard/${agentId}/templates`)}
              disabled={submitting}
              className="px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || (headerEnabled && (headerType === 'IMAGE' || headerType === 'VIDEO') && uploadStatus !== 'ready')}
              className="px-6 gap-2 font-semibold shadow-sm animate-fade-in"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Confirm & Submit'
              )}
            </Button>
          </div>
        </form>

        {/* Right Preview Panel */}
        <aside className="w-full md:sticky md:top-6 flex flex-col bg-[#FAFAFA] rounded-2xl p-12 shadow-3xs select-none">
          <span className="text-xs font-semibold text-neutral-400 select-none">
            Preview
          </span>
          
          {/* Phone Aspect Ratio Container */}
          <div className="w-full max-w-[315px] mx-auto aspect-[9/19] my-8 bg-neutral-50 dark:bg-neutral-900 rounded-[32px] flex flex-col justify-start overflow-hidden border-[7px] border-neutral-200 dark:border-neutral-800">
            {/* Top Bar with Minimal Avatar */}
            <div className="w-full px-5 pt-5 pb-3 flex items-center gap-3 bg-transparent shrink-0">
              <ChevronLeft className="size-4.5 text-neutral-300 dark:text-neutral-600 shrink-0" />
              <img src="/icon.svg" className="size-8 shrink-0 dark:invert" alt="Customer" />
              <span className="text-[13px] font-semibold text-neutral-600 dark:text-neutral-350">Customer</span>
            </div>
            
            {/* Separator with spacing on ends */}
            <div className="mx-5 border-b border-neutral-200/60 dark:border-neutral-800/60" />

            {/* Chat Content Area (shares same bg color) */}
            <div className="flex-1 p-5 bg-transparent flex flex-col justify-start overflow-y-auto">
              {hasInput && (
                /* Minimal Message Cell */
                <div className="w-full bg-white dark:bg-neutral-800 rounded-lg p-3.5 flex flex-col gap-3 select-text border border-neutral-200/10 dark:border-neutral-700/10">
                  {/* Header Image/Video Preview */}
                  {headerEnabled && (headerType === 'IMAGE' || headerType === 'VIDEO') && (
                    <div className="w-full aspect-video bg-neutral-50 dark:bg-neutral-700 flex items-center justify-center overflow-hidden rounded-md">
                      {headerMediaPreviewUrl ? (
                        headerType === 'IMAGE' ? (
                          <img
                            src={headerMediaPreviewUrl}
                            alt="Header preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={headerMediaPreviewUrl}
                            className="w-full h-full object-cover"
                            controls={false}
                            muted
                            autoPlay
                            loop
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-muted-foreground text-xs p-4">
                          {headerType === 'IMAGE' ? (
                            <>
                              <Image className="size-4.5 text-muted-foreground" />
                              <span>No image</span>
                            </>
                          ) : (
                            <>
                              <Video className="size-4.5 text-muted-foreground" />
                              <span>No video</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Area */}
                  <div className="flex flex-col gap-1">
                    {/* Header Text */}
                    {headerEnabled && headerType === 'TEXT' && headerText.trim() && (
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-snug m-0 break-words">
                        {headerText.trim()}
                      </h4>
                    )}

                    {/* Main Message Body */}
                    {bodyText.trim() && (
                      <p className="text-xs leading-normal text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-normal m-0 break-words">
                        {parsedPreviewBody}
                      </p>
                    )}

                    {/* Footer Text */}
                    {footerEnabled && footerText.trim() && (
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-none m-0 pt-1 break-words">
                        {footerText.trim()}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {buttonsEnabled && templateButtons.filter(b => b.text.trim()).length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                      {templateButtons.filter(b => b.text.trim()).map((btn, idx) => (
                        <div
                          key={idx}
                          className="w-full py-1.5 bg-neutral-50 dark:bg-neutral-700/50 rounded-md text-center text-[10px] font-semibold text-primary flex items-center justify-center gap-1"
                        >
                          {btn.type === 'URL' && <ExternalLink className="size-3" />}
                          {btn.type === 'PHONE_NUMBER' && <Phone className="size-3" />}
                          {btn.type === 'COPY_CODE' && <Copy className="size-3" />}
                          {btn.text.trim()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Meta Review Disclaimer */}
          <div className="mt-6 text-[11px] text-neutral-400 dark:text-neutral-500 leading-normal text-center w-full select-none">
            <p>
              Note: This template is subject to review and approval by Meta. The preview shown here is simulated and may vary slightly from the final rendering in official WhatsApp clients.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
