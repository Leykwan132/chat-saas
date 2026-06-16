import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  ExternalLink, 
  Phone, 
  Copy,
  Loader2
} from 'lucide-react';

interface ButtonType {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
  text: string;
  url?: string;
  phone_number?: string;
  example?: string;
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  r2Key?: string;
  buttons?: ButtonType[];
}

type TemplateComponentInput = {
  type: string;
  format?: string;
  text?: string;
  r2Key?: string;
  buttons?: ButtonType[];
};

interface WhatsAppTemplatePreviewProps {
  templateName?: string;
  components?: TemplateComponentInput[] | null;
  isLoading?: boolean;
  emptyMessage?: string;
  overrideBodyText?: string;
  overrideHeaderMediaPreviewUrl?: string | null;
  className?: string;
  compact?: boolean;
  fillWidth?: boolean;
}

export function WhatsAppTemplatePreview({
  templateName,
  components,
  isLoading = false,
  emptyMessage = "Select a message template to view preview",
  overrideBodyText,
  overrideHeaderMediaPreviewUrl,
  className,
  compact = false,
  fillWidth = false,
}: WhatsAppTemplatePreviewProps) {
  // Find components
  const headerComp = useMemo(() => components?.find((c: any) => c.type === 'HEADER'), [components]);
  const bodyComp = useMemo(() => components?.find((c: any) => c.type === 'BODY'), [components]);
  const footerComp = useMemo(() => components?.find((c: any) => c.type === 'FOOTER'), [components]);
  const buttonsComp = useMemo(() => components?.find((c: any) => c.type === 'BUTTONS'), [components]);

  // Extract formats
  const headerEnabled = !!headerComp;
  const headerType = headerComp?.format ?? 'TEXT';
  const headerText = headerComp?.text ?? '';
  const headerR2Key = headerComp?.r2Key;

  // Resolve media public url from Convex if r2Key is provided
  const publicMediaUrl = useQuery(
    api.media.attachments.getPublicUrl,
    headerR2Key ? { r2Key: headerR2Key } : 'skip'
  );

  const headerMediaPreviewUrl = overrideHeaderMediaPreviewUrl ?? publicMediaUrl ?? null;

  // Variables parsed for preview
  const parsedPreviewBody = useMemo(() => {
    const rawText = overrideBodyText ?? bodyComp?.text ?? '';
    if (!rawText) return '';

    let result = rawText;
    const matches = rawText.matchAll(/\{\{([^}]+)\}\}/g);
    let count = 1;
    for (const match of matches) {
      const placeholder = match[0];
      const varName = match[1]?.trim() || `${count}`;
      result = result.replace(placeholder, `[${varName}]`);
      count++;
    }
    return result;
  }, [overrideBodyText, bodyComp]);

  const footerEnabled = !!footerComp;
  const footerText = footerComp?.text ?? '';

  const buttonsEnabled = !!buttonsComp;
  const templateButtons = buttonsComp?.buttons ?? [];

  const hasInput = headerEnabled || parsedPreviewBody || footerEnabled || (buttonsEnabled && templateButtons.length > 0);

  if (isLoading) {
    return (
      <div className={cn(
        "w-full flex items-center justify-center bg-[#FAFAFA] dark:bg-neutral-900/30 rounded-2xl border border-border/80 shadow-3xs",
        compact ? "p-6 min-h-[200px]" : "p-12 min-h-[380px]",
        className,
      )}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  if (!components || components.length === 0 || !hasInput) {
    return (
      <div className={cn(
        "w-full flex items-center justify-center bg-[#FAFAFA] dark:bg-neutral-900/30 rounded-2xl border border-border/80 shadow-3xs",
        compact ? "p-6 min-h-[200px]" : "p-12 min-h-[380px]",
        className,
      )}>
        <p className="text-xs text-muted-foreground font-medium bg-white dark:bg-neutral-800 rounded-lg px-3 py-2 border border-black/5 backdrop-blur-xs text-center">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-full flex flex-col bg-[#FAFAFA] dark:bg-neutral-900/50 rounded-2xl shadow-3xs select-none",
      compact ? "p-4" : "p-6",
      className,
    )}>
      <span className={cn(
        "font-semibold text-neutral-400 select-none",
        compact ? "mb-2 text-xs" : "mb-4 text-xs",
      )}>
        Preview {templateName ? `· ${templateName}` : ''}
      </span>
      
      {/* Phone Aspect Ratio Container */}
      <div className={cn(
        "mx-auto flex w-full flex-col justify-start overflow-hidden bg-neutral-50 shadow-md dark:bg-neutral-955",
        compact
          ? "h-[320px] max-w-[260px] rounded-[26px] border-[6px] border-neutral-200 dark:border-neutral-850"
          : fillWidth
            ? "aspect-[9/19] max-w-full rounded-[32px] border-[7px] border-neutral-200 dark:border-neutral-850"
            : "aspect-[9/19] max-w-[315px] rounded-[32px] border-[7px] border-neutral-200 dark:border-neutral-850",
      )}>
        {/* Top Bar with Minimal Avatar */}
        <div className={cn(
          "flex w-full shrink-0 items-center gap-3 bg-transparent",
          compact ? "px-3.5 pt-3 pb-2" : "px-5 pt-5 pb-3",
        )}>
          <ChevronLeft className={cn("shrink-0 text-neutral-300 dark:text-neutral-600", compact ? "size-3.5" : "size-4.5")} />
          <img src="/icon.svg" className={cn("shrink-0 dark:invert", compact ? "size-6" : "size-8")} alt="Customer" />
          <span className={cn("font-semibold text-neutral-600 dark:text-neutral-350", compact ? "text-[11px]" : "text-[13px]")}>Customer</span>
        </div>
        
        {/* Separator with spacing on ends */}
        <div className={cn("border-b border-neutral-200/60 dark:border-neutral-800/60", compact ? "mx-3.5" : "mx-5")} />

        {/* Chat Content Area (shares same bg color) */}
        <div className={cn("flex min-h-0 flex-1 flex-col justify-start overflow-y-auto bg-transparent", compact ? "p-3" : "p-5")}>
          {/* Minimal Message Cell */}
          <div className={cn(
            "flex w-full flex-col rounded-lg border border-neutral-200/10 bg-white select-text dark:border-neutral-700/10 dark:bg-neutral-800",
            compact ? "gap-2 p-2.5" : "gap-3 p-3.5",
          )}>
            {/* Header Image/Video Preview */}
            {headerEnabled && (headerType === 'IMAGE' || headerType === 'VIDEO') && (
              <div className={cn(
                "flex w-full items-center justify-center overflow-hidden rounded-md bg-neutral-50 dark:bg-neutral-700",
                compact ? "aspect-[5/3] max-h-20" : "aspect-video",
              )}>
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
                        <ImageIcon className="size-4.5 text-muted-foreground" />
                        <span>No image</span>
                      </>
                    ) : (
                      <>
                        <VideoIcon className="size-4.5 text-muted-foreground" />
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
              {parsedPreviewBody && (
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
        </div>
      </div>

      {!compact && (
        <div className="mt-4 w-full select-none text-center text-[11px] leading-normal text-neutral-400 dark:text-neutral-500">
          <p>
            Note: This template is subject to review and approval by Meta. The preview shown here is simulated and may vary slightly from the final rendering in official WhatsApp clients.
          </p>
        </div>
      )}
    </div>
  );
}
