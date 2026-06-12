import {
  AlertCircle,
  Inbox,
  LayoutGrid,
  MessageSquareDot,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Tag,
  User,
  UserX,
} from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  getLeadTemperatureStyle,
  type LeadTemperature,
} from '@/lib/leadTemperature';
import {
  INBOX_SIDEBAR_ICON_RAIL_WIDTH,
  INBOX_SIDEBAR_WIDTH,
  inboxSidebarCountClassName,
  inboxSidebarGroupLabelClassName,
  inboxSidebarHeaderTitleClassName,
  inboxSidebarIconSlotClassName,
  inboxSidebarItemActiveClassName,
  inboxSidebarItemClassName,
  inboxSidebarItemInactiveClassName,
  inboxSidebarSectionClassName,
  inboxSidebarToggleButtonClassName,
  inboxSidebarToggleIconClassName,
} from '@/lib/sidebarNavStyles';
import type { ConversationPlatform } from '@/components/ChatRow';
import { getPlatformIconClassName } from '@/lib/platformIconStyles';
import {
  inboxColumnClassName,
  inboxColumnHeaderClassName,
  inboxColumnScrollClassName,
} from '@/components/inbox/inboxLayout';
import { LeadTemperatureInfo } from '@/components/inbox/LeadTemperatureInfo';
import { BookedCheckIcon } from '@/components/booking/BookingDetailsPanel';

function BookedCheckIconSlot({ className }: { className?: string }) {
  return <BookedCheckIcon size="sm" className={className} />;
}

export type AssignmentFilter = 'all' | 'unread' | 'assigned_me' | 'unassigned';

const PLATFORM_LABEL: Record<ConversationPlatform, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
};

function PlatformIcon({ platform }: { platform: ConversationPlatform }) {
  const className = cn('shrink-0', getPlatformIconClassName(platform));
  const common = { size: 18, className } as const;
  switch (platform) {
    case 'whatsapp':
      return <SiWhatsapp {...common} />;
    case 'instagram':
      return <SiInstagram {...common} />;
    case 'messenger':
      return <SiMessenger {...common} />;
  }
}

function FilterRow({
  label,
  icon,
  isActive,
  count,
  showCount = true,
  onClick,
  className,
}: {
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  count?: number;
  showCount?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        inboxSidebarItemClassName,
        isActive ? inboxSidebarItemActiveClassName : inboxSidebarItemInactiveClassName,
        className,
      )}
    >
      {icon ? <span className={inboxSidebarIconSlotClassName}>{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {showCount && count !== undefined ? (
        <span className={inboxSidebarCountClassName}>{count}</span>
      ) : null}
    </button>
  );
}

function FilterSection({
  title,
  info,
  children,
}: {
  title: string;
  info?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={inboxSidebarSectionClassName}>
      <div className={inboxSidebarGroupLabelClassName}>
        <span className="inline-flex min-w-0 items-center gap-0.5">
          <span className="truncate">{title}</span>
          {info}
        </span>
      </div>
      <div className="flex flex-col gap-[0.1125rem]">{children}</div>
    </div>
  );
}

function RailButton({
  label,
  icon: Icon,
  isActive,
  onClick,
  iconClassName,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  onClick: () => void;
  iconClassName?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          className={cn(
            inboxSidebarToggleButtonClassName,
            isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
          )}
          aria-label={label}
        >
          <Icon className={cn(inboxSidebarToggleIconClassName, iconClassName)} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export type InboxFilterCounts = {
  all: number;
  unread: number;
  assigned_me: number;
  unassigned: number;
  escalated: number;
  booking: number;
  byPlatform: Partial<Record<ConversationPlatform, number>>;
  byLead: Partial<Record<LeadTemperature, number>>;
  byTag: Record<string, number>;
};

export type InboxFilterSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentFilter: AssignmentFilter;
  onAssignmentFilterChange: (filter: AssignmentFilter) => void;
  platformFilter: 'all' | ConversationPlatform;
  onPlatformFilterChange: (platform: 'all' | ConversationPlatform) => void;
  escalatedActive: boolean;
  onEscalatedActiveChange: (active: boolean) => void;
  bookingActive: boolean;
  onBookingActiveChange: (active: boolean) => void;
  activeLeads: LeadTemperature[];
  onToggleLead: (lead: LeadTemperature) => void;
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  connectedPlatforms: ConversationPlatform[];
  userTags: string[];
  counts: InboxFilterCounts;
  canCreateTag?: boolean;
  onCreateTagClick?: () => void;
};

export function InboxFilterSidebar({
  open,
  onOpenChange,
  assignmentFilter,
  onAssignmentFilterChange,
  platformFilter,
  onPlatformFilterChange,
  escalatedActive,
  onEscalatedActiveChange,
  bookingActive,
  onBookingActiveChange,
  activeLeads,
  onToggleLead,
  activeTags,
  onToggleTag,
  connectedPlatforms,
  userTags,
  counts,
  canCreateTag = false,
  onCreateTagClick,
}: InboxFilterSidebarProps) {
  return (
    <div
      className={cn(
        inboxColumnClassName,
        'shrink-0 border-r border-border bg-background transition-[width] duration-200 ease-out',
      )}
      style={{
        width: open ? INBOX_SIDEBAR_WIDTH : INBOX_SIDEBAR_ICON_RAIL_WIDTH,
      }}
    >
      <div
        className={cn(
          inboxColumnHeaderClassName,
          open ? 'justify-between px-[0.675rem]' : 'justify-center px-[0.45rem]',
        )}
      >
        {open ? (
          <>
            <h2 className={inboxSidebarHeaderTitleClassName}>Inbox</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className={inboxSidebarToggleButtonClassName}
              aria-label="Collapse filters"
            >
              <PanelLeftClose className={inboxSidebarToggleIconClassName} />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(true)}
            className={inboxSidebarToggleButtonClassName}
            aria-label="Expand filters"
          >
            <PanelLeftOpen className={inboxSidebarToggleIconClassName} />
          </Button>
        )}
      </div>

      {!open ? (
        <div className="flex flex-1 flex-col items-center gap-[0.225rem] py-[0.225rem]">
          <RailButton
            label="All conversations"
            icon={Inbox}
            isActive={
              assignmentFilter === 'all' &&
              platformFilter === 'all' &&
              !escalatedActive &&
              !bookingActive
            }
            onClick={() => onOpenChange(true)}
          />
          <RailButton
            label="Unread"
            icon={MessageSquareDot}
            isActive={assignmentFilter === 'unread'}
            onClick={() => onOpenChange(true)}
          />
          <RailButton
            label="Assigned to me"
            icon={User}
            isActive={assignmentFilter === 'assigned_me'}
            onClick={() => onOpenChange(true)}
          />
          <RailButton
            label="Unassigned"
            icon={UserX}
            isActive={assignmentFilter === 'unassigned'}
            onClick={() => onOpenChange(true)}
          />
          <RailButton
            label="Escalated"
            icon={AlertCircle}
            iconClassName="text-amber-500"
            isActive={escalatedActive}
            onClick={() => onOpenChange(true)}
          />
          <RailButton
            label="Booked"
            icon={BookedCheckIconSlot}
            isActive={bookingActive}
            onClick={() => onOpenChange(true)}
          />
          <RailButton
            label="Platforms"
            icon={LayoutGrid}
            isActive={platformFilter !== 'all'}
            onClick={() => onOpenChange(true)}
          />
          {userTags.length > 0 ? (
            <RailButton
              label="Tags"
              icon={Tag}
              isActive={activeTags.length > 0}
              onClick={() => onOpenChange(true)}
            />
          ) : null}
        </div>
      ) : (
        <div className={cn(inboxColumnScrollClassName, 'no-scrollbar')}>
          <FilterSection title="Assignment">
            <FilterRow
              label="All"
              icon={<Inbox className="text-muted-foreground" />}
              isActive={assignmentFilter === 'all'}
              count={counts.all}
              onClick={() => onAssignmentFilterChange('all')}
            />
            <FilterRow
              label="Unread"
              icon={<MessageSquareDot className="text-muted-foreground" />}
              isActive={assignmentFilter === 'unread'}
              count={counts.unread}
              onClick={() => onAssignmentFilterChange('unread')}
            />
            <FilterRow
              label="Assigned to me"
              icon={<User className="text-muted-foreground" />}
              isActive={assignmentFilter === 'assigned_me'}
              count={counts.assigned_me}
              onClick={() => onAssignmentFilterChange('assigned_me')}
            />
            <FilterRow
              label="Unassigned"
              icon={<UserX className="text-muted-foreground" />}
              isActive={assignmentFilter === 'unassigned'}
              count={counts.unassigned}
              onClick={() => onAssignmentFilterChange('unassigned')}
            />
          </FilterSection>

          <FilterSection title="Platform">
            <FilterRow
              label="All platforms"
              icon={<LayoutGrid className="text-muted-foreground" />}
              isActive={platformFilter === 'all'}
              showCount={false}
              onClick={() => onPlatformFilterChange('all')}
            />
            {connectedPlatforms.map((platform) => (
              <FilterRow
                key={platform}
                label={PLATFORM_LABEL[platform]}
                icon={<PlatformIcon platform={platform} />}
                isActive={platformFilter === platform}
                count={counts.byPlatform[platform] ?? 0}
                onClick={() => onPlatformFilterChange(platform)}
              />
            ))}
          </FilterSection>

          <FilterSection title="Status">
            <FilterRow
              label="Escalated"
              icon={<AlertCircle className="text-amber-500" />}
              isActive={escalatedActive}
              count={counts.escalated}
              onClick={() => onEscalatedActiveChange(!escalatedActive)}
            />
            <FilterRow
              label="Booked"
              icon={<BookedCheckIcon size="sm" />}
              isActive={bookingActive}
              count={counts.booking}
              onClick={() => onBookingActiveChange(!bookingActive)}
            />
          </FilterSection>

          <FilterSection title="Lead Temperature" info={<LeadTemperatureInfo />}>
            {(['Hot', 'Warm', 'Cold'] as const).map((lead) => {
              const style = getLeadTemperatureStyle(lead);
              const Icon = style.icon;
              return (
                <FilterRow
                  key={lead}
                  label={lead}
                  icon={<Icon className={style.iconClass} />}
                  isActive={activeLeads.includes(lead)}
                  count={counts.byLead[lead] ?? 0}
                  onClick={() => onToggleLead(lead)}
                />
              );
            })}
          </FilterSection>

          <FilterSection title="Tags">
            {userTags.length === 0 ? (
              <Empty className="mx-[0.45rem] my-[0.3375rem] w-auto flex-none gap-[0.45rem] rounded-lg border border-dashed bg-muted/10 p-[0.675rem]">
                <EmptyHeader className="max-w-none gap-[0.3375rem]">
                  <EmptyMedia variant="icon" className="mb-0 size-[1.8rem] [&_svg:not([class*='size-'])]:size-[0.7875rem]">
                    <Tag />
                  </EmptyMedia>
                  <EmptyTitle className="text-[0.675rem] font-semibold">No tags yet</EmptyTitle>
                  <EmptyDescription className="text-[9.9px] leading-snug">
                    Add tags on a contact to organize conversations and filter your inbox.
                  </EmptyDescription>
                </EmptyHeader>
                {canCreateTag && onCreateTagClick ? (
                  <EmptyContent className="max-w-none gap-[0.45rem]">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-[1.575rem] w-full gap-[0.3375rem] text-[9.9px] font-medium"
                      onClick={onCreateTagClick}
                    >
                      <Plus className="size-[0.675rem]" />
                      Create tag
                    </Button>
                  </EmptyContent>
                ) : null}
              </Empty>
            ) : (
              userTags.map((tag) => (
                <FilterRow
                  key={tag}
                  label={tag}
                  icon={<Tag className="text-muted-foreground" />}
                  isActive={activeTags.includes(tag)}
                  count={counts.byTag[tag] ?? 0}
                  onClick={() => onToggleTag(tag)}
                />
              ))
            )}
          </FilterSection>
        </div>
      )}
    </div>
  );
}
