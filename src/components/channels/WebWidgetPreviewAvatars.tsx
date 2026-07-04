import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { WebWidgetTheme } from '../../../shared/webWidgetThemes';
import { cn } from '@/lib/utils';

const FALLBACK_WIDGET_ICON_URL = '/icon.svg';

export function LauncherAvatar({
  iconUrl,
  name,
  theme,
}: {
  iconUrl?: string;
  name: string;
  theme: WebWidgetTheme;
}) {
  const dark = theme === 'dark';
  const imageUrl = iconUrl || FALLBACK_WIDGET_ICON_URL;
  return (
    <Avatar className="size-12">
      <AvatarImage src={imageUrl} alt={name} />
      <AvatarFallback
        className={cn(
          'text-sm font-semibold',
          dark ? 'bg-black text-white' : 'bg-white text-foreground',
        )}
      >
        {name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
