import { useRef, type ReactNode } from 'react';
import {
  AlignLeft,
  Calendar,
  Clock,
  Link2,
  NotebookPen,
  Phone,
  User,
} from 'lucide-react';
import { EditableTimeCombobox } from '@/components/EditableTimeCombobox';
import { CalendarDatePickerField } from '@/components/calendar/CalendarDatePickerField';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatOrgRoleLabel } from '../../../shared/teamRoleCatalog';
import {
  customerDetailServiceFields,
  memberLabel,
  type EventEditFormState,
  type ServiceFieldDefinition,
  type TeamUserOption,
} from '@/components/calendar/calendarEventEditModel';

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'TM';
}

function EditRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 py-0.5">
        <p className="mb-1.5 text-sm font-medium text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  );
}

function EditSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function CustomerFieldInputs({
  fields,
  form,
  onCollectedFieldChange,
}: {
  fields: ServiceFieldDefinition[];
  form: EventEditFormState;
  onCollectedFieldChange: (key: string, value: string) => void;
}) {
  const customFields = customerDetailServiceFields(fields);
  if (customFields.length === 0) return null;

  return (
    <EditSection title="Customer detail">
      {customFields.map((field) => {
        const value = form.collectedFields[field.key] ?? '';
        if (field.type === 'boolean') {
          return (
            <EditRow key={field.key} label={field.label} icon={User}>
              <Switch
                checked={value.toLowerCase() === 'yes' || value.toLowerCase() === 'true'}
                onCheckedChange={(checked) =>
                  onCollectedFieldChange(field.key, checked ? 'Yes' : 'No')
                }
              />
            </EditRow>
          );
        }
        if (field.type === 'select' && field.options && field.options.length > 0) {
          return (
            <EditRow key={field.key} label={field.label} icon={User}>
              <SearchableSelect
                value={value || undefined}
                placeholder={`Select ${field.label.toLowerCase()}`}
                searchPlaceholder={`Search ${field.label.toLowerCase()}...`}
                emptyText="No options found."
                options={field.options.map((option) => ({
                  value: option,
                  label: option,
                  searchValue: option,
                }))}
                onChange={(nextValue) => onCollectedFieldChange(field.key, nextValue)}
              />
            </EditRow>
          );
        }
        return (
          <EditRow key={field.key} label={field.label} icon={User}>
            <Input
              type={field.type === 'number' ? 'number' : 'text'}
              value={value}
              onChange={(event) => onCollectedFieldChange(field.key, event.target.value)}
              placeholder={field.label}
            />
          </EditRow>
        );
      })}
    </EditSection>
  );
}

export function CalendarEventDetailsEditBody({
  form,
  serviceFields,
  teamUsers,
  actions,
  bookingFields = true,
  onFormChange,
  onCollectedFieldChange,
}: {
  form: EventEditFormState;
  serviceFields: ServiceFieldDefinition[];
  teamUsers: TeamUserOption[];
  actions?: ReactNode;
  bookingFields?: boolean;
  onFormChange: (patch: Partial<EventEditFormState>) => void;
  onCollectedFieldChange: (key: string, value: string) => void;
}) {
  const comboboxPortalContainerRef = useRef<HTMLDivElement>(null);
  const selectedMember = teamUsers.find((user) => user._id === form.assignedUserId);
  const selectedMemberName = selectedMember ? memberLabel(selectedMember) : 'Team member';

  return (
    <form id="calendar-event-detail-edit-form" className="relative flex flex-col gap-8">
      <div ref={comboboxPortalContainerRef} className="pointer-events-none absolute inset-0" />
      <div className="flex flex-wrap items-start justify-between gap-5">
        <Input
          value={form.title}
          onChange={(event) => onFormChange({ title: event.target.value })}
          placeholder="Event title"
          className="h-auto min-h-12 flex-1 bg-input/35 px-4 py-3 text-2xl font-semibold leading-tight"
        />
        {actions}
      </div>

      <div className="grid grid-cols-1 gap-8 border-y border-border py-6 sm:grid-cols-2">
        <EditSection title="Date">
          <EditRow label="Date" icon={Calendar}>
            <CalendarDatePickerField
              value={form.date}
              onChange={(date) => onFormChange({ date })}
              showLabel={false}
            />
          </EditRow>
          <EditRow label="All day" icon={Clock}>
            <Switch
              checked={form.allDay}
              onCheckedChange={(checked) => onFormChange({ allDay: checked })}
            />
          </EditRow>
          {!form.allDay ? (
            <EditRow label="Time" icon={Clock}>
              <div className="grid grid-cols-2 gap-3">
                <EditableTimeCombobox
                  value={form.startTime}
                  onChange={(startTime) => onFormChange({ startTime })}
                  ariaLabel="Start time"
                  portalContainer={comboboxPortalContainerRef}
                />
                <EditableTimeCombobox
                  value={form.endTime}
                  onChange={(endTime) => onFormChange({ endTime })}
                  ariaLabel="End time"
                  portalContainer={comboboxPortalContainerRef}
                  contentAlign="end"
                />
              </div>
            </EditRow>
          ) : null}
          <EditRow label="Link" icon={Link2}>
            <Input
              type="url"
              value={form.link}
              onChange={(event) => onFormChange({ link: event.target.value })}
              placeholder="https://meet.google.com/..."
            />
          </EditRow>
        </EditSection>

        {bookingFields ? (
        <EditSection title="Customer detail">
          <EditRow label="Name" icon={User}>
            <Input
              value={form.collectedFields.name ?? ''}
              onChange={(event) => onCollectedFieldChange('name', event.target.value)}
              placeholder="Customer name"
            />
          </EditRow>
          <EditRow label="Phone" icon={Phone}>
            <Input
              value={form.collectedFields.phone ?? ''}
              onChange={(event) => onCollectedFieldChange('phone', event.target.value)}
              placeholder="Phone number"
            />
          </EditRow>
        </EditSection>
        ) : null}
      </div>

      <section className="flex flex-col gap-5">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">
          Internal details
        </h3>
        {bookingFields ? (
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarFallback>{initials(selectedMemberName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 py-0.5">
            <p className="mb-1.5 text-sm font-medium text-muted-foreground">Team member</p>
            <SearchableSelect
              value={form.assignedUserId || undefined}
              placeholder="Select team member"
              searchPlaceholder="Search team members..."
              emptyText="No team members found."
              options={teamUsers.map((user) => {
                const role = user.role ? formatOrgRoleLabel(user.role) : 'Member';
                return {
                  value: user._id,
                  label: memberLabel(user),
                  tag: role,
                  tagClassName: 'bg-muted text-foreground border-border',
                  searchValue: `${memberLabel(user)} ${user.email} ${role}`,
                };
              })}
              onChange={(value) => onFormChange({ assignedUserId: value })}
              triggerClassName="w-auto min-w-56 max-w-full"
              contentClassName="w-auto min-w-[var(--radix-popover-trigger-width)]"
            />
          </div>
        </div>
        ) : null}
        {bookingFields ? (
        <EditRow label="Internal notes" icon={NotebookPen}>
          <Textarea
            value={form.remarks}
            onChange={(event) => onFormChange({ remarks: event.target.value })}
            placeholder="Add internal notes for this booking"
            className="min-h-24"
          />
        </EditRow>
        ) : null}
        <EditRow label="Summary" icon={AlignLeft}>
          <Textarea
            value={form.description}
            onChange={(event) => onFormChange({ description: event.target.value })}
            placeholder="AI-generated customer background summary for this booked service"
            className="min-h-28"
          />
        </EditRow>
      </section>

      {bookingFields ? (
      <CustomerFieldInputs
        fields={serviceFields}
        form={form}
        onCollectedFieldChange={onCollectedFieldChange}
      />
      ) : null}
    </form>
  );
}
