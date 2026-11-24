import type { ComponentProps } from "react";
import { SidebarContent, useSidebar } from "@/components/ui/sidebar";

export function SidebarNavigationContent({
  onClickCapture,
  ...props
}: ComponentProps<typeof SidebarContent>) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarContent
      {...props}
      onClickCapture={(event) => {
        onClickCapture?.(event);
        if (
          !isMobile ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        if (
          event.target instanceof Element &&
          event.target.closest("a[href]")
        ) {
          setOpenMobile(false);
        }
      }}
    />
  );
}
