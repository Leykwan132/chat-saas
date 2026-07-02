import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  AnalyticsDataTable,
  AnalyticsMemberRoleTag,
} from '@/components/analytics/AnalyticsUi';
import { pricingTableShellClass, pricingSectionBorderClass } from '@/components/pricing/pricingStyles';
import { cn } from '@/lib/utils';
import {
  formatAnalyticsDecimal,
  formatAnalyticsNumber,
  formatAnalyticsRate,
} from '@/components/analytics/analyticsFormatters';

export type TeamAnalyticsMemberRow = {
  workosUserId: string;
  name: string;
  email: string;
  roleSlug?: string | null;
  assignedConversationCount: number;
  activeConversationCount: number;
  messageSentCount: number;
  averageMessagesPerConversation: number;
  averageFirstReplyMs: number | null;
  averageFirstReplyLabel: string;
  conversionRate: number;
  dropRate: number;
};

type TeamAnalyticsMemberTableProps = {
  members: TeamAnalyticsMemberRow[];
  memberSearch: string;
  onMemberSearchChange: (value: string) => void;
};

export function TeamAnalyticsMemberTable({
  members,
  memberSearch,
  onMemberSearchChange,
}: TeamAnalyticsMemberTableProps) {
  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) {
      return members;
    }

    return members.filter((member) =>
      member.name.toLowerCase().includes(query),
    );
  }, [memberSearch, members]);

  return (
    <div className={pricingTableShellClass}>
      <div className={cn('border-b px-8 py-4', pricingSectionBorderClass())}>
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={memberSearch}
            onChange={(event) => onMemberSearchChange(event.target.value)}
            placeholder="Search member name..."
            className="pl-9"
          />
        </div>
      </div>
      <AnalyticsDataTable
        minWidth="760px"
        emptyMessage={
          memberSearch.trim()
            ? 'No members match your search.'
            : 'No member analytics yet.'
        }
        defaultSort={{ key: 'assigned', direction: 'desc' }}
        rowKey={(member) => member.workosUserId}
        rows={filteredMembers}
        columns={[
          {
            key: 'member',
            header: 'Member',
            sortValue: (member) => member.name.toLowerCase(),
            cell: (member) => (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{member.name}</span>
                  <AnalyticsMemberRoleTag roleSlug={member.roleSlug} />
                </div>
                <div className="text-sm text-muted-foreground">{member.email}</div>
              </div>
            ),
          },
          {
            key: 'assigned',
            header: 'Assigned',
            align: 'center',
            sortValue: (member) => member.assignedConversationCount,
            cell: (member) => formatAnalyticsNumber(member.assignedConversationCount),
          },
          {
            key: 'active',
            header: 'Active',
            align: 'center',
            sortValue: (member) => member.activeConversationCount,
            cell: (member) => formatAnalyticsNumber(member.activeConversationCount),
          },
          {
            key: 'sent',
            header: 'Sent',
            align: 'center',
            sortValue: (member) => member.messageSentCount,
            cell: (member) => formatAnalyticsNumber(member.messageSentCount),
          },
          {
            key: 'avg',
            header: 'Avg Msg/Conv',
            align: 'center',
            sortValue: (member) => member.averageMessagesPerConversation,
            cell: (member) => formatAnalyticsDecimal(member.averageMessagesPerConversation),
          },
          {
            key: 'firstReply',
            header: 'First Reply',
            align: 'center',
            sortValue: (member) => member.averageFirstReplyMs,
            cell: (member) => member.averageFirstReplyLabel,
          },
          {
            key: 'conversion',
            header: 'Conv.',
            align: 'center',
            sortValue: (member) => member.conversionRate,
            cell: (member) => formatAnalyticsRate(member.conversionRate),
          },
          {
            key: 'drop',
            header: 'Drop',
            align: 'center',
            sortValue: (member) => member.dropRate,
            cell: (member) => formatAnalyticsRate(member.dropRate),
          },
        ]}
      />
    </div>
  );
}
