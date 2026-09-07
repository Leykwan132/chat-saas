import { PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarHeader } from '@/components/ui/sidebar';
import { HostBrandMark } from '@/components/HostBrandMark';
import { hostBrandName, type HostBrand } from '@/lib/hostBranding';

type ExpandedAppSidebarHeaderProps = {
  onCollapse: () => void;
  brand: HostBrand | null | undefined;
};

export function ExpandedAppSidebarHeader({
  onCollapse,
  brand,
}: ExpandedAppSidebarHeaderProps) {
  return (
    <SidebarHeader className="flex flex-row items-center justify-between px-[0.9rem] py-[0.7875rem]">
      <a href="/workspace" className="flex min-w-0 items-center gap-[0.45rem]">
        <HostBrandMark brand={brand} className="size-5 shrink-0" />
        <span className="truncate font-title text-[18px] font-semibold tracking-normal">
          {hostBrandName(brand)}
        </span>
      </a>
      <Button
        variant="ghost"
        size="icon"
        onClick={onCollapse}
        className="size-[1.8rem] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      >
        <PanelLeftClose className="size-[1.125rem]" />
        <span className="sr-only">Collapse Sidebar</span>
      </Button>
    </SidebarHeader>
  );
}
