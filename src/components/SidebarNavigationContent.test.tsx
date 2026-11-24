import type { MouseEvent } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { SidebarNavigationContent } from "./SidebarNavigationContent";

const sidebar = vi.hoisted(() => ({ isMobile: true, setOpenMobile: vi.fn() }));
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => sidebar,
  SidebarContent: "div",
}));

class NavigationTarget {
  constructor(private link: boolean) {}
  closest() {
    return this.link ? {} : null;
  }
}

afterEach(() => {
  sidebar.isMobile = true;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function click(
  link: boolean,
  overrides = {},
  onClick?: (event: MouseEvent<HTMLDivElement>) => void,
) {
  vi.stubGlobal("Element", NavigationTarget);
  const content = SidebarNavigationContent({ onClickCapture: onClick });
  content.props.onClickCapture({
    target: new NavigationTarget(link),
    button: 0,
    defaultPrevented: false,
    ...overrides,
  } as unknown as MouseEvent<HTMLDivElement>);
}

test("mobile navigation closes the drawer, including nested link targets", () => {
  click(true);
  expect(sidebar.setOpenMobile).toHaveBeenCalledWith(false);
});

test("desktop navigation leaves the drawer state alone", () => {
  sidebar.isMobile = false;
  click(true);
  expect(sidebar.setOpenMobile).not.toHaveBeenCalled();
});

test("expanding sidebar categories does not close the drawer", () => {
  click(false);
  expect(sidebar.setOpenMobile).not.toHaveBeenCalled();
});

test("modified and cancelled navigation does not close the drawer", () => {
  for (const overrides of [
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
    { defaultPrevented: true },
  ]) {
    click(true, overrides);
  }
  expect(sidebar.setOpenMobile).not.toHaveBeenCalled();
  const handler = vi.fn();
  click(false, {}, handler);
  expect(handler).toHaveBeenCalledTimes(1);
});
