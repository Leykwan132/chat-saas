import type { ConversationPlatform } from '@/components/ChatRow';

export function getPlatformIconClassName(platform: ConversationPlatform): string {
  switch (platform) {
    case 'whatsapp':
      return 'text-[#25D366]';
    case 'messenger':
      return 'text-[#0866FF]';
    case 'instagram':
      return 'text-muted-foreground';
  }
}
