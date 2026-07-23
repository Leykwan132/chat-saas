import 'flag-icons/css/flag-icons.min.css';
import { Globe2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function getLanguageFlagRegion(languageCode: string) {
  if (languageCode === 'multi') return undefined;
  try {
    return new Intl.Locale(languageCode).maximize().region?.toLowerCase();
  } catch {
    return undefined;
  }
}

export function AvatarLanguageFlag({
  languageCode,
  className,
}: {
  languageCode: string;
  className?: string;
}) {
  const region = getLanguageFlagRegion(languageCode);
  if (!region) {
    return <Globe2 aria-hidden className={cn('size-4 text-muted-foreground', className)} />;
  }
  return <span aria-hidden className={cn('fi rounded-sm', `fi-${region}`, className)} />;
}
