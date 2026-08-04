import { useState } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TraditionalWhatsAppIcon } from './TraditionalWhatsAppIcon';
import {
  WebWidgetPreviewDeviceToggle,
  type WebWidgetPreviewDevice,
} from './WebWidgetPreviewDeviceToggle';
import { WebWidgetPreviewFrame } from './WebWidgetPreviewFrame';

type WebWidgetTraditionalPreviewProps = {
  className?: string;
  label: string;
  phoneNumber?: string;
  prefillMessage: string;
  poweredBy: boolean;
};

export function WebWidgetTraditionalPreview({
  className,
  label,
  phoneNumber,
  prefillMessage,
  poweredBy,
}: WebWidgetTraditionalPreviewProps) {
  const [previewDevice, setPreviewDevice] = useState<WebWidgetPreviewDevice>('desktop');
  const mobilePreview = previewDevice === 'mobile';
  const destinationUrl = `https://wa.me/${(phoneNumber ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(prefillMessage)}`;

  return (
    <div className={cn('relative flex min-h-[520px] flex-1 flex-col gap-4 text-foreground', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2"><Globe className="size-4 text-muted-foreground" /><span className="text-sm font-medium">Preview</span></div>
        <WebWidgetPreviewDeviceToggle value={previewDevice} onChange={setPreviewDevice} />
      </div>
      <WebWidgetPreviewFrame device={previewDevice} onPointerDownCapture={() => undefined}>
        <div className={cn('relative flex h-full w-full items-end', mobilePreview ? 'mx-auto max-w-[390px]' : 'max-w-[460px] ml-auto')}>
          <div className="absolute bottom-0 right-0 flex flex-col items-center gap-2">
            <a className="flex max-w-[min(100%,320px)] items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-normal text-black" style={{ fontFamily: 'Google Sans Flex, sans-serif' }} href={destinationUrl} target="_blank" rel="noreferrer">
              <TraditionalWhatsAppIcon className="size-7" />
              <span className="truncate">{label || 'Chat with us'}</span>
            </a>
            {poweredBy ? <span className="text-xs text-muted-foreground">Powered by <a className="hover:text-foreground hover:underline" href="https://kilobot.app/" target="_blank" rel="noreferrer">Kilobot</a></span> : null}
          </div>
        </div>
      </WebWidgetPreviewFrame>
    </div>
  );
}
