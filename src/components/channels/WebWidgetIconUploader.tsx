import { Loader2, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';

type WebWidgetIconUploaderProps = {
  canUseCustomIcon: boolean;
  compact?: boolean;
  iconUrl?: string;
  name: string;
  uploading: boolean;
  onFileSelected: (file: File | undefined) => void;
};

export function WebWidgetIconUploader({
  canUseCustomIcon,
  compact = false,
  iconUrl,
  name,
  uploading,
  onFileSelected,
}: WebWidgetIconUploaderProps) {
  const avatarSize = compact ? 'size-10' : 'size-16';
  const iconSize = compact ? 'size-4' : 'size-5';
  const control = (
    <label
      className="group relative block"
      data-disabled={!canUseCustomIcon || uploading}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={!canUseCustomIcon || uploading}
        onChange={(event) => {
          onFileSelected(event.target.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      <span
        className={cn(
          'flex cursor-pointer items-center justify-center rounded-full bg-muted/40 transition group-hover:bg-muted group-data-[disabled=true]:cursor-not-allowed group-data-[disabled=true]:opacity-50',
          avatarSize,
        )}
      >
        <Avatar className={avatarSize}>
          {iconUrl ? <AvatarImage src={iconUrl} alt={name} /> : null}
          <AvatarFallback className="bg-transparent">
            {uploading ? (
              <Loader2 className={cn(iconSize, 'animate-spin')} />
            ) : (
              <Plus className={iconSize} />
            )}
          </AvatarFallback>
        </Avatar>
      </span>
    </label>
  );

  if (compact) {
    return (
      <Field data-disabled={!canUseCustomIcon}>
        <FieldLabel>Avatar</FieldLabel>
        <div className="flex items-center">
          {control}
        </div>
      </Field>
    );
  }

  return (
    <Field data-disabled={!canUseCustomIcon}>
      <FieldLabel>Avatar</FieldLabel>
      <FieldDescription>
        Custom icons are available on paid plans.
      </FieldDescription>
      <div className="flex items-center gap-3">
        {control}
      </div>
    </Field>
  );
}
