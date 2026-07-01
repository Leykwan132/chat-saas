import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import {
  ChevronLeft,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Phone,
  Reply,
  Video as VideoIcon,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { cn } from '@/lib/utils';
import { renderWhatsAppPreviewText } from './templates/WhatsAppPreviewText';

interface ButtonType {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
  text: string;
  url?: string;
  phone_number?: string;
  example?: string;
}

type TemplateComponentInput = {
  type: string;
  format?: string;
  text?: string;
  r2Key?: string;
  previewUrl?: string;
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

function componentOfType(components: TemplateComponentInput[] | null | undefined, type: string) {
  return components?.find((component) => component.type.toUpperCase() === type) ?? null;
}

function HeaderMediaPreview({
  headerType,
  previewUrl,
  compact,
}: {
  headerType: string;
  previewUrl: string | null;
  compact: boolean;
}) {
  const frameClass = cn(
    'flex w-full items-center justify-center overflow-hidden rounded-md bg-neutral-50 dark:bg-neutral-700',
    compact ? 'aspect-[5/3] max-h-20' : 'aspect-video',
  );

  if (headerType === 'DOCUMENT') {
    return (
      <div className={frameClass}>
        <div className="flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FileText aria-hidden />
          <span>PDF document</span>
        </div>
      </div>
    );
  }

  if (previewUrl && headerType === 'IMAGE') {
    return <img src={previewUrl} alt="Header preview" className={cn(frameClass, 'object-cover')} />;
  }

  if (previewUrl && headerType === 'VIDEO') {
    return (
      <video
        src={previewUrl}
        className={cn(frameClass, 'object-cover')}
        controls={false}
        muted
        autoPlay
        loop
      />
    );
  }

  const Icon = headerType === 'VIDEO' ? VideoIcon : ImageIcon;
  return (
    <div className={frameClass}>
      <div className="flex flex-col items-center gap-1.5 p-4 text-xs text-muted-foreground">
        <Icon aria-hidden />
        <span>No {headerType === 'VIDEO' ? 'video' : 'image'}</span>
      </div>
    </div>
  );
}

function TemplateButtonIcon({ type }: { type: ButtonType['type'] }) {
  const className = 'size-3 shrink-0';
  if (type === 'URL') return <ExternalLink className={className} aria-hidden />;
  if (type === 'PHONE_NUMBER') return <Phone className={className} aria-hidden />;
  if (type === 'COPY_CODE') return <Copy className={className} aria-hidden />;
  return <Reply className={className} aria-hidden />;
}

export function WhatsAppTemplatePreview({
  templateName,
  components,
  isLoading = false,
  emptyMessage = 'Select a message template to view preview',
  overrideBodyText,
  overrideHeaderMediaPreviewUrl,
  className,
  compact = false,
  fillWidth = false,
}: WhatsAppTemplatePreviewProps) {
  const headerComp = useMemo(() => componentOfType(components, 'HEADER'), [components]);
  const bodyComp = useMemo(() => componentOfType(components, 'BODY'), [components]);
  const footerComp = useMemo(() => componentOfType(components, 'FOOTER'), [components]);
  const buttonsComp = useMemo(() => componentOfType(components, 'BUTTONS'), [components]);
  const headerType = headerComp?.format?.toUpperCase() ?? 'TEXT';
  const headerR2Key = headerComp?.r2Key;
  const publicMediaUrl = useQuery(
    api.media.attachments.getPublicUrl,
    headerR2Key ? { r2Key: headerR2Key } : 'skip',
  );
  const headerMediaPreviewUrl =
    overrideHeaderMediaPreviewUrl ?? headerComp?.previewUrl ?? publicMediaUrl ?? null;
  const bodyText = overrideBodyText ?? bodyComp?.text ?? '';
  const footerText = footerComp?.text ?? '';
  const templateButtons = buttonsComp?.buttons ?? [];
  const hasInput =
    Boolean(headerComp) ||
    bodyText.trim().length > 0 ||
    footerText.trim().length > 0 ||
    templateButtons.some((button) => button.text.trim());

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex w-full items-center justify-center rounded-2xl border border-border/80 bg-[#FAFAFA] shadow-3xs dark:bg-neutral-900/30',
          compact ? 'min-h-[200px] p-6' : 'min-h-[380px] p-12',
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="animate-spin" aria-hidden />
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  if (!components || components.length === 0 || !hasInput) {
    return (
      <div
        className={cn(
          'flex w-full items-center justify-center rounded-2xl border border-border/80 bg-[#FAFAFA] shadow-3xs dark:bg-neutral-900/30',
          compact ? 'min-h-[200px] p-6' : 'min-h-[380px] p-12',
          className,
        )}
      >
        <p className="rounded-lg border border-black/5 bg-white px-3 py-2 text-center text-xs font-medium text-muted-foreground dark:bg-neutral-800">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full select-none flex-col rounded-2xl bg-[#FAFAFA] shadow-3xs dark:bg-neutral-900/50',
        compact ? 'p-4' : 'p-6',
        className,
      )}
    >
      <span className={cn('select-none font-semibold text-neutral-400', compact ? 'mb-2 text-xs' : 'mb-4 text-xs')}>
        Preview {templateName ? `· ${templateName}` : ''}
      </span>

      <div
        className={cn(
          'mx-auto flex w-full flex-col justify-start overflow-hidden bg-neutral-50 shadow-md dark:bg-neutral-955',
          compact
            ? 'h-[320px] max-w-[260px] rounded-[26px] border-[6px] border-neutral-200 dark:border-neutral-850'
            : fillWidth
              ? 'aspect-[9/19] max-w-[340px] rounded-[32px] border-[7px] border-neutral-200 dark:border-neutral-850'
              : 'aspect-[9/19] max-w-[315px] rounded-[32px] border-[7px] border-neutral-200 dark:border-neutral-850',
        )}
      >
        <div className={cn('flex w-full shrink-0 items-center gap-3 bg-transparent', compact ? 'px-3.5 pt-3 pb-2' : 'px-5 pt-5 pb-3')}>
          <ChevronLeft className="shrink-0 text-neutral-300 dark:text-neutral-600" aria-hidden />
          <img src="/icon.svg" className={cn('shrink-0 dark:invert', compact ? 'size-6' : 'size-8')} alt="Customer" />
          <span className={cn('font-semibold text-neutral-600 dark:text-neutral-350', compact ? 'text-[11px]' : 'text-[13px]')}>Customer</span>
        </div>

        <div className={cn('border-b border-neutral-200/60 dark:border-neutral-800/60', compact ? 'mx-3.5' : 'mx-5')} />

        <div className={cn('flex min-h-0 flex-1 flex-col justify-start overflow-y-auto bg-transparent', compact ? 'p-3' : 'p-5')}>
          <div
            className={cn(
              'flex w-full select-text flex-col rounded-lg border border-neutral-200/10 bg-white dark:border-neutral-700/10 dark:bg-neutral-800',
              compact ? 'gap-2 p-2.5' : 'gap-3 p-3.5',
            )}
          >
            {headerComp && ['DOCUMENT', 'IMAGE', 'VIDEO'].includes(headerType) && (
              <HeaderMediaPreview
                headerType={headerType}
                previewUrl={headerMediaPreviewUrl}
                compact={compact}
              />
            )}

            <div className="flex flex-col gap-1">
              {headerType === 'TEXT' && headerComp?.text?.trim() && (
                <h4 className="m-0 break-words text-sm font-bold leading-snug text-neutral-900 dark:text-neutral-100">
                  {headerComp.text.trim()}
                </h4>
              )}

              {bodyText.trim() && (
                <p className="m-0 whitespace-pre-wrap break-words text-xs font-normal leading-normal text-neutral-800 dark:text-neutral-200">
                  {renderWhatsAppPreviewText(bodyText)}
                </p>
              )}

              {footerText.trim() && (
                <p className="m-0 break-words pt-1 text-[10px] leading-none text-neutral-400 dark:text-neutral-500">
                  {footerText.trim()}
                </p>
              )}
            </div>

            {templateButtons.some((button) => button.text.trim()) && (
              <div className="flex flex-col gap-1.5 border-t border-neutral-100 pt-2 dark:border-neutral-700">
                {templateButtons
                  .filter((button) => button.text.trim())
                  .map((button, index) => (
                    <div
                      key={index}
                      className="flex w-full items-center justify-center gap-1 rounded-md bg-neutral-50 py-1.5 text-center text-[10px] font-semibold text-primary dark:bg-neutral-700/50"
                    >
                      <TemplateButtonIcon type={button.type} />
                      {button.text.trim()}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!compact && (
        <div className="mt-6 w-full select-none text-center text-[11px] leading-normal text-neutral-400 dark:text-neutral-500">
          <p>
            Note: This template is subject to review and approval by Meta. The preview shown here is simulated and may vary slightly from the final rendering in official WhatsApp clients.
          </p>
        </div>
      )}
    </div>
  );
}
