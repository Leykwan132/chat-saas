import type { ChangeEvent } from 'react';
import { FileText, Image, Trash2, Type, Upload, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  assertWhatsAppTemplateMediaSpec,
  getWhatsAppTemplateMediaSpec,
  whatsappTemplateMediaAcceptForFormat,
  type WhatsAppTemplateHeaderFormat,
} from '../../../shared/whatsappTemplateMedia';
import { createTemplateInputClass } from './templateBuilderConstants';
import { TemplateSectionSwitch } from './TemplateSectionSwitch';
import type { HeaderMediaByType, HeaderMediaState, HeaderType } from './templateBuilderTypes';
import {
  headerMediaForType,
  initialHeaderMedia,
  isMediaHeader,
  revokeHeaderMediaPreviewUrl,
  setHeaderMediaForType,
} from './templateHeaderMediaState';

const HEADER_TYPES: Array<{
  value: HeaderType;
  label: string;
  Icon: typeof Type;
}> = [
  { value: 'TEXT', label: 'Text', Icon: Type },
  { value: 'IMAGE', label: 'Image', Icon: Image },
  { value: 'VIDEO', label: 'Video', Icon: Video },
  { value: 'DOCUMENT', label: 'PDF', Icon: FileText },
];

type TemplateHeaderSectionProps = {
  enabled: boolean;
  headerType: HeaderType;
  headerText: string;
  media: HeaderMediaState;
  mediaByType?: HeaderMediaByType;
  onEnabledChange: (enabled: boolean) => void;
  onHeaderTypeChange: (type: HeaderType) => void;
  onHeaderTextChange: (text: string) => void;
  onMediaChange: (media: HeaderMediaState) => void;
  onMediaByTypeChange?: (mediaByType: HeaderMediaByType) => void;
  availableHeaderTypes?: HeaderType[];
  description?: string;
};

function mediaHelpText(type: HeaderType) {
  if (type === 'DOCUMENT') return 'PDF document';
  if (type === 'IMAGE') return 'JPEG, JPG, or PNG image';
  if (type === 'VIDEO') return 'MP4 video';
  return '';
}

function fileDetailsLabel(media: HeaderMediaState) {
  if (!media.fileName) return '';
  const spec = getWhatsAppTemplateMediaSpec(media.fileMime);
  const fallback = media.fileName.split('.').pop()?.toUpperCase() || 'FILE';
  const sizeMb = media.fileSize ? (media.fileSize / (1024 * 1024)).toFixed(1) : '0.0';
  return `${spec?.label ?? fallback} · ${sizeMb} MB`;
}

export function TemplateHeaderSection({
  enabled,
  headerType,
  headerText,
  media,
  mediaByType,
  onEnabledChange,
  onHeaderTypeChange,
  onHeaderTextChange,
  onMediaChange,
  onMediaByTypeChange,
  availableHeaderTypes,
  description = 'Optional intro as text, image, video, or PDF document.',
}: TemplateHeaderSectionProps) {
  const mediaFormat = isMediaHeader(headerType) ? headerType : null;
  const activeMedia =
    mediaFormat && mediaByType ? headerMediaForType(mediaByType, mediaFormat) : media;
  const usingMediaSlots = mediaByType !== undefined && onMediaByTypeChange !== undefined;

  const commitMedia = (nextMedia: HeaderMediaState) => {
    if (mediaFormat && usingMediaSlots) {
      onMediaByTypeChange(setHeaderMediaForType(mediaByType, mediaFormat, nextMedia));
      return;
    }
    onMediaChange(nextMedia);
  };

  const resetMedia = () => {
    revokeHeaderMediaPreviewUrl(activeMedia);
    commitMedia(initialHeaderMedia);
  };

  const selectHeaderType = (nextType: HeaderType) => {
    if (nextType === headerType) return;
    onHeaderTypeChange(nextType);
    if (!usingMediaSlots) onMediaChange(initialHeaderMedia);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const spec = assertWhatsAppTemplateMediaSpec(file.type);
      if (spec.headerFormat !== headerType) {
        throw new Error(`Please upload a ${mediaHelpText(headerType).toLowerCase()} for this header.`);
      }
      const nextMedia: HeaderMediaState = {
        r2Key: null,
        previewUrl: URL.createObjectURL(file),
        pendingFile: file,
        uploadStatus: 'ready',
        fileName: file.name,
        fileSize: file.size,
        fileMime: spec.mimeType,
      };
      revokeHeaderMediaPreviewUrl(activeMedia);
      commitMedia(nextMedia);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unsupported header media.');
    }
  };

  const MediaIcon = headerType === 'DOCUMENT' ? FileText : headerType === 'VIDEO' ? Video : Image;
  const headerTypeOptions = HEADER_TYPES.filter(
    ({ value }) => !availableHeaderTypes || availableHeaderTypes.includes(value),
  );
  const visibleHeaderTypes = headerTypeOptions.some(({ value }) => value === headerType)
    ? headerTypeOptions
    : [
        ...headerTypeOptions,
        HEADER_TYPES.find(({ value }) => value === headerType) ?? HEADER_TYPES[0],
      ];

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-3xs">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-base font-semibold text-foreground">Header</h2>
          <p className="m-0 text-xs text-muted-foreground">
            {description}
          </p>
        </div>
        <TemplateSectionSwitch
          enabled={enabled}
          label="Header"
          onEnabledChange={onEnabledChange}
        />
      </div>

      {enabled && (
        <FieldGroup className="gap-4">
          <div className="flex w-fit rounded-lg border border-border bg-muted p-1">
            {visibleHeaderTypes.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => selectHeaderType(value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  headerType === value
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {headerType === 'TEXT' ? (
            <Field className="gap-2">
              <FieldLabel htmlFor="header-text">Header text</FieldLabel>
              <Input
                id="header-text"
                value={headerText}
                onChange={(event) => onHeaderTextChange(event.target.value)}
                placeholder="e.g. Appointment reminder"
                maxLength={60}
                className={createTemplateInputClass}
              />
              <FieldDescription className="self-end text-xs">
                {headerText.length}/60 chars
              </FieldDescription>
            </Field>
          ) : (
            <Field className="gap-2">
              <FieldLabel>Header media</FieldLabel>
              {activeMedia.uploadStatus === 'idle' ? (
                <label className="relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center transition-colors hover:bg-muted/40">
                  <input
                    type="file"
                    accept={
                      mediaFormat
                        ? whatsappTemplateMediaAcceptForFormat(
                            mediaFormat as WhatsAppTemplateHeaderFormat,
                          )
                        : undefined
                    }
                    onChange={handleFileChange}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  <Upload className="size-5 text-muted-foreground" aria-hidden />
                  <span className="text-xs font-medium text-muted-foreground">
                    Upload {mediaHelpText(headerType)}
                  </span>
                </label>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {headerType === 'IMAGE' && activeMedia.previewUrl ? (
                      <img
                        src={activeMedia.previewUrl}
                        alt="Header thumbnail"
                        className="size-10 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                        <MediaIcon className="size-5" aria-hidden />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {activeMedia.fileName ?? 'Selected media'}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {activeMedia.uploadStatus === 'failed' ? 'Upload failed' : fileDetailsLabel(activeMedia)}
                      </span>
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={resetMedia}
                    aria-label="Remove header media"
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </Field>
          )}
        </FieldGroup>
      )}
    </section>
  );
}
