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
          <div className={cn('absolute bottom-0 right-0 flex flex-col items-center gap-2', mobilePreview && 'gap-1.5')}>
            <a className={cn('flex max-w-[min(100%,320px)] items-center gap-1 rounded-full border-4 border-[#25D366] bg-white px-3.5 py-2 text-sm font-normal text-black', mobilePreview && 'px-3 py-1.5 text-[13px]')} style={{ fontFamily: 'Google Sans Flex, sans-serif' }} href={destinationUrl} target="_blank" rel="noreferrer">
              <TraditionalWhatsAppIcon className={cn('size-6', mobilePreview && 'size-[22px]')} />
              <span className="truncate">{label || 'Chat with us'}</span>
            </a>
            {poweredBy ? <span className={cn('text-[11px] text-muted-foreground', mobilePreview && 'text-[10px]')}>Powered by <a href="https://kilobot.app/" target="_blank" rel="noreferrer">Kilobot</a></span> : null}
          </div>
        </div>
      </WebWidgetPreviewFrame>
    </div>
  );
}
