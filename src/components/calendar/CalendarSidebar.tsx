import type { ReactNode } from 'react';
import { Calendar as CalendarIcon, Plus, User } from 'lucide-react';
import { SidebarPageTitleRow } from '@/components/SidebarPageTitleRow';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  inboxColumnClassName,
  inboxColumnScrollClassName,
} from '@/components/inbox/inboxLayout';
import {
  inboxSidebarCountClassName,
  inboxSidebarGroupLabelClassName,
  inboxSidebarIconSlotClassName,
  inboxSidebarItemActiveClassName,
  inboxSidebarItemClassName,
  inboxSidebarItemInactiveClassName,
} from '@/lib/sidebarNavStyles';
import { cn } from '@/lib/utils';

type CalendarSidebarProps = {
  selectedDate: Date;
  visibleMonth: Date;
  canManageCalendar: boolean;
  assignedToMeOnly: boolean;
  hasCurrentUser: boolean;
  eventFilterCounts?: {
    all?: number;
    assigned?: number;
  };
  onChangeMonth: (date: Date) => void;
  onCreateBooking: () => void;
  onShowAllEvents: () => void;
  onAssignedToMe: () => void;
  connectionCard?: ReactNode;
};

function CalendarSidebarFilterRow({
  label,
  icon,
  isActive,
  count,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  isActive: boolean;
  count?: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        inboxSidebarItemClassName,
        isActive ? inboxSidebarItemActiveClassName : inboxSidebarItemInactiveClassName,
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span className={inboxSidebarIconSlotClassName}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined ? (
        <span className={inboxSidebarCountClassName}>{count}</span>
      ) : null}
    </button>
  );
}

function CalendarSidebarFilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="px-4 py-[0.45rem]">
      <div className={inboxSidebarGroupLabelClassName}>{title}</div>
      <div className="flex flex-col gap-[0.1125rem]">{children}</div>
    </div>
  );
}

export function CalendarSidebar({
  selectedDate,
  visibleMonth,
  canManageCalendar,
  assignedToMeOnly,
  hasCurrentUser,
  eventFilterCounts,
  onChangeMonth,
  onCreateBooking,
  onShowAllEvents,
  onAssignedToMe,
  connectionCard,
}: CalendarSidebarProps) {
  return (
    <aside className={cn(inboxColumnClassName, 'border-r border-border')}>
      <SidebarPageTitleRow title="Calendar" />
      <div className={cn(inboxColumnScrollClassName, 'no-scrollbar px-[0.45rem] py-[0.675rem]')}>
        <div
          className="flex justify-center pb-[0.675rem]"
          data-calendar-sidebar-section="month"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            month={visibleMonth}
            onMonthChange={onChangeMonth}
            className="rounded-xl border border-border bg-card p-2"
          />
        </div>

        {canManageCalendar ? (
          <div className="px-4 pb-3">
            <Button
              type="button"
              size="lg"
              className="h-11 w-full gap-2 px-5 py-3"
              onClick={onCreateBooking}
            >
              <Plus data-icon="inline-start" />
              New Booking
            </Button>
          </div>
        ) : null}

        <CalendarSidebarFilterSection title="View">
          <CalendarSidebarFilterRow
            label="All events"
            icon={<CalendarIcon className="text-muted-foreground" />}
            isActive={!assignedToMeOnly}
            count={eventFilterCounts?.all}
            onClick={onShowAllEvents}
          />
          <CalendarSidebarFilterRow
            label="Assigned to me"
            icon={<User className="text-muted-foreground" />}
            isActive={assignedToMeOnly}
            count={eventFilterCounts?.assigned}
            onClick={onAssignedToMe}
            disabled={!hasCurrentUser}
          />
        </CalendarSidebarFilterSection>

        {connectionCard}
      </div>
    </aside>
  );
}
