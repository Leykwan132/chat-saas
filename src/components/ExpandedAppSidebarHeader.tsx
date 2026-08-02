import { PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarHeader } from '@/components/ui/sidebar';

type ExpandedAppSidebarHeaderProps = {
  onCollapse: () => void;
};

export function ExpandedAppSidebarHeader({
  onCollapse,
}: ExpandedAppSidebarHeaderProps) {
  return (
    <SidebarHeader className="flex flex-row items-center justify-between px-[0.9rem] py-[0.7875rem]">
      <a href="/workspace" className="flex items-center gap-[0.45rem]">
        <img src="/icon.svg" className="size-5 dark:invert" alt="" />
        <span className="font-title text-[18px] font-semibold tracking-normal">
          Kilobot
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
