import type { ElementType } from 'react';
import { Plug } from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';

export type SupportedChannelService = 'whatsapp' | 'instagram' | 'messenger';

type ChannelServiceMeta = {
  label: string;
  icon: ElementType;
  iconColor: string;
};

export const CHANNEL_SERVICE_META = {
  whatsapp: {
    label: 'WhatsApp',
    icon: SiWhatsapp,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  instagram: {
    label: 'Instagram',
    icon: SiInstagram,
    iconColor: 'text-pink-600 dark:text-pink-400',
  },
  messenger: {
    label: 'Messenger',
    icon: SiMessenger,
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
} satisfies Record<SupportedChannelService, ChannelServiceMeta>;

const UNSUPPORTED_CHANNEL_SERVICE_META: ChannelServiceMeta = {
  label: 'Unsupported channel',
  icon: Plug,
  iconColor: 'text-muted-foreground',
};

export function isSupportedChannelService(
  service: unknown,
): service is SupportedChannelService {
  return typeof service === 'string' && service in CHANNEL_SERVICE_META;
}

export function getChannelServiceMeta(service: unknown): ChannelServiceMeta {
  if (isSupportedChannelService(service)) {
    return CHANNEL_SERVICE_META[service];
  }
  return UNSUPPORTED_CHANNEL_SERVICE_META;
}
