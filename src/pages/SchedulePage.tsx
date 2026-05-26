import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function memberLabel(u: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name.length > 0 ? name : u.email;
}

function minutesToTime(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function timeToMinutes(value: string) {
  const [h, min] = value.split(':').map((x) => Number.parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(min)) return 0;
  return h * 60 + min;
}

const ALL_TIMEZONES = Intl.supportedValuesOf('timeZone');

function getAvailabilityStatus(
  schedule: { enabled: boolean; mode: 'manual' | 'scheduled'; manualStatus: 'available' | 'away'; timezone: string },
  shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>,
  timeOff: Array<{ startAt: number; endAt: number }>
): 'eligible' | 'away' | 'disabled' {
  if (!schedule.enabled) return 'disabled';
  
  const now = Date.now();
  const hasTimeOff = timeOff.some((row) => now >= row.startAt && now <= row.endAt);
  if (hasTimeOff) return 'disabled';

  if (schedule.mode === 'manual') {
    return schedule.manualStatus === 'available' ? 'eligible' : 'away';
  }

  if (shifts.length === 0) return 'away';
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: schedule.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(now)).map((p) => [p.type, p.value])
    );
    const WEEKDAY_TO_INDEX: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const dayOfWeek = WEEKDAY_TO_INDEX[parts.weekday ?? "Sun"] ?? 0;
    const hour = Number.parseInt(parts.hour ?? "0", 10);
    const minute = Number.parseInt(parts.minute ?? "0", 10);
    const minutes = hour * 60 + minute;
    
    const onShift = shifts.some(
      (shift) =>
        shift.dayOfWeek === dayOfWeek &&
        minutes >= shift.startMinutes &&
        minutes < shift.endMinutes
    );
    return onShift ? 'eligible' : 'away';
  } catch (e) {
    return 'away';
  }
}

type ShiftDraft = { dayOfWeek: number; startMinutes: number; endMinutes: number };

type RosterEntry = {
  schedule: Doc<'userSchedules'>;
  shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>;
  timeOff: Array<{ _id: Id<'userTimeOff'>; startAt: number; endAt: number; label?: string }>;
};

type TeamUser = {
  _id: Id<'users'>;
  workosUserId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

export default function SchedulePage({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const { agentId } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const { can } = usePermissions();
  const canManage = can(Permission.ROUTING_MANAGE);

  const roster = useQuery(
    api.leadRouting.schedules.listForAgent,
    typedAgentId ? { agentId: typedAgentId } : 'skip',
  );
  const teamUsers = useQuery(api.users.getUsers, {});

  const addUser = useMutation(api.leadRouting.schedules.addUser);
  const updateUser = useMutation(api.leadRouting.schedules.updateUser);
  const removeUser = useMutation(api.leadRouting.schedules.removeUser);
  const setShifts = useMutation(api.leadRouting.schedules.setShifts);
  const addTimeOff = useMutation(api.leadRouting.schedules.addTimeOff);
  const removeTimeOff = useMutation(api.leadRouting.schedules.removeTimeOff);

  const [addUserId, setAddUserId] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const rosterUserIds = useMemo(
    () => new Set((roster ?? []).map((r: RosterEntry) => r.schedule.workosUserId)),
    [roster],
  );

  const availableToAdd = useMemo(
    () => (teamUsers ?? []).filter((u: TeamUser) => !rosterUserIds.has(u.workosUserId)),
    [teamUsers, rosterUserIds],
  );

  const handleAddUser = async () => {
    if (!typedAgentId || !addUserId) return;
    setBusyId('add');
    try {
      await addUser({ agentId: typedAgentId, workosUserId: addUserId });
      setAddUserId('');
      toast.success('User added');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add user');
    } finally {
      setBusyId(null);
    }
  };

  const saveShifts = async (userScheduleId: Id<'userSchedules'>, shifts: ShiftDraft[]) => {
    setBusyId(userScheduleId);
    try {
      await setShifts({ userScheduleId, shifts });
      toast.success('Shifts saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save shifts');
    } finally {
      setBusyId(null);
    }
  };

  if (!typedAgentId) return null;

  const isLoading = roster === undefined || teamUsers === undefined;

  if (isLoading) {
    return <SchedulePageSkeleton hideHeader={hideHeader} />;
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      {!hideHeader && (
        <div>
          <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">Schedule</h1>
        </div>
      )}

      {canManage && availableToAdd.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4">
          <div className="min-w-[200px] flex-1">
            <Label className="text-xs text-muted-foreground">Add user</Label>
            <Select value={addUserId} onValueChange={setAddUserId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select teammate" />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map((u: TeamUser) => (
                  <SelectItem key={u._id} value={u.workosUserId}>
                    {memberLabel(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            disabled={!addUserId || busyId === 'add'}
            onClick={() => void handleAddUser()}
          >
            Add
          </Button>
        </div>
      ) : null}

      {roster.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No users on the roster. Add at least one before going live.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {(roster as RosterEntry[]).map(({ schedule, shifts, timeOff }) => {
            const user = (teamUsers as TeamUser[] | undefined)?.find(
              (u) => u.workosUserId === schedule.workosUserId,
            );
            const label = user ? memberLabel(user) : schedule.workosUserId;
            return (
              <UserScheduleCard
                key={schedule._id}
                label={label}
                schedule={schedule}
                shifts={shifts}
                timeOff={timeOff}
                canManage={canManage}
                busy={busyId === schedule._id}
                onUpdate={(patch) =>
                  void updateUser({ userScheduleId: schedule._id, ...patch }).catch((e) =>
                    toast.error(e instanceof Error ? e.message : 'Update failed'),
                  )
                }
                onRemove={() =>
                  void removeUser({ userScheduleId: schedule._id }).catch((e) =>
                    toast.error(e instanceof Error ? e.message : 'Remove failed'),
                  )
                }
                onSaveShifts={(next) => void saveShifts(schedule._id, next)}
                onAddTimeOff={(startAt, endAt, label) =>
                  void addTimeOff({ userScheduleId: schedule._id, startAt, endAt, label }).catch(
                    (e) => toast.error(e instanceof Error ? e.message : 'Could not add time off'),
                  )
                }
                onRemoveTimeOff={(timeOffId) =>
                  void removeTimeOff({ timeOffId }).catch((e) =>
                    toast.error(e instanceof Error ? e.message : 'Could not remove time off'),
                  )
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SchedulePageSkeleton({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      {!hideHeader && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-40" />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4">
        <div className="min-w-[200px] flex-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-9 w-full" />
        </div>
        <Skeleton className="h-9 w-16" />
      </div>

      <div className="flex flex-col gap-4">
        <UserScheduleCardSkeleton />
        <UserScheduleCardSkeleton />
      </div>
    </div>
  );
}

function UserScheduleCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="size-8 rounded-md" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Skeleton className="h-3 w-10" />
          <Skeleton className="mt-2 h-9 w-full" />
        </div>
        <div>
          <Skeleton className="h-3 w-14" />
          <Skeleton className="mt-2 h-9 w-full" />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-3 w-12" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-[88px]" />
          <Skeleton className="h-9 w-[120px]" />
          <Skeleton className="h-9 w-[120px]" />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-48" />
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <Skeleton className="h-9 w-[200px]" />
          <Skeleton className="h-9 w-[200px]" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  );
}

function UserScheduleCard({
  label,
  schedule,
  shifts,
  timeOff,
  canManage,
  busy,
  onUpdate,
  onRemove,
  onSaveShifts,
  onAddTimeOff,
  onRemoveTimeOff,
}: {
  label: string;
  schedule: {
    _id: Id<'userSchedules'>;
    mode: 'manual' | 'scheduled';
    manualStatus: 'available' | 'away';
    timezone: string;
    enabled: boolean;
    assignmentPriority?: number;
  };
  shifts: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>;
  timeOff: Array<{ _id: Id<'userTimeOff'>; startAt: number; endAt: number; label?: string }>;
  canManage: boolean;
  busy: boolean;
  onUpdate: (patch: {
    mode?: 'manual' | 'scheduled';
    manualStatus?: 'available' | 'away';
    timezone?: string;
    enabled?: boolean;
    assignmentPriority?: number;
  }) => void;
  onRemove: () => void;
  onSaveShifts: (shifts: ShiftDraft[]) => void;
  onAddTimeOff: (startAt: number, endAt: number, label?: string) => void;
  onRemoveTimeOff: (timeOffId: Id<'userTimeOff'>) => void;
}) {
  const [shiftDraft, setShiftDraft] = useState<ShiftDraft[]>(
    shifts.length > 0
      ? shifts.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startMinutes: s.startMinutes,
          endMinutes: s.endMinutes,
        }))
      : [{ dayOfWeek: 1, startMinutes: 9 * 60, endMinutes: 17 * 60 }],
  );
  const [timeOffStart, setTimeOffStart] = useState('');
  const [timeOffEnd, setTimeOffEnd] = useState('');
  const [timeOffLabel, setTimeOffLabel] = useState('');
  const [openTimezone, setOpenTimezone] = useState(false);

  const status = getAvailabilityStatus(schedule, shifts, timeOff);
  const statusColor = status === 'eligible' ? 'bg-foreground' : status === 'away' ? 'bg-muted-foreground/60' : 'bg-muted-foreground/20 border border-border';
  const statusText = status === 'eligible' ? 'Eligible now' : status === 'away' ? 'Away / Off-shift' : 'Disabled / Time off';

  const daysOfWeek = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full animate-pulse", statusColor)} />
          <p className="m-0 font-semibold text-foreground">{label}</p>
          <span className="text-xs text-muted-foreground">({statusText})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={schedule.enabled ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-2.5"
            disabled={!canManage}
            onClick={() => onUpdate({ enabled: !schedule.enabled })}
          >
            {schedule.enabled ? "Enabled" : "Disabled"}
          </Button>
          {canManage ? (
            <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
              <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs text-muted-foreground">Mode</Label>
          <Select
            value={schedule.mode}
            onValueChange={(v) => onUpdate({ mode: v as 'manual' | 'scheduled' })}
            disabled={!canManage}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {schedule.mode === 'manual' ? (
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={schedule.manualStatus}
              onValueChange={(v) => onUpdate({ manualStatus: v as 'available' | 'away' })}
              disabled={!canManage}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="away">Away</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label className="text-xs text-muted-foreground block mb-1">Timezone</Label>
            <Popover open={openTimezone} onOpenChange={setOpenTimezone}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openTimezone}
                  className="w-full justify-between font-normal text-sm mt-1 h-9"
                  disabled={!canManage}
                >
                  {schedule.timezone || "Select timezone..."}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search timezone..." />
                  <CommandList className="max-h-[200px] overflow-y-auto">
                    <CommandEmpty>No timezone found.</CommandEmpty>
                    <CommandGroup>
                      {ALL_TIMEZONES.map((tz) => (
                        <CommandItem
                          key={tz}
                          value={tz}
                          onSelect={() => {
                            onUpdate({ timezone: tz });
                            setOpenTimezone(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              schedule.timezone === tz ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {tz}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div>
          <Label className="text-xs text-muted-foreground">Priority</Label>
          <Input
            type="number"
            min={1}
            value={schedule.assignmentPriority ?? 1}
            disabled={!canManage}
            className="mt-1 h-9"
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              if (!Number.isNaN(next)) {
                onUpdate({ assignmentPriority: next });
              }
            }}
          />
        </div>
      </div>

      {schedule.mode === 'scheduled' ? (
        <div className="mt-4 flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Shifts</Label>
          <div className="flex flex-col gap-2">
            {shiftDraft.map((shift, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Select
                  value={String(shift.dayOfWeek)}
                  onValueChange={(v) => {
                    const next = [...shiftDraft];
                    next[i] = { ...shift, dayOfWeek: Number.parseInt(v, 10) };
                    setShiftDraft(next);
                  }}
                  disabled={!canManage}
                >
                  <SelectTrigger className="w-[88px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_LABELS.map((d, idx) => (
                      <SelectItem key={d} value={String(idx)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  className="w-[120px]"
                  value={minutesToTime(shift.startMinutes)}
                  disabled={!canManage}
                  onChange={(e) => {
                    const next = [...shiftDraft];
                    next[i] = { ...shift, startMinutes: timeToMinutes(e.target.value) };
                    setShiftDraft(next);
                  }}
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  type="time"
                  className="w-[120px]"
                  value={minutesToTime(shift.endMinutes)}
                  disabled={!canManage}
                  onChange={(e) => {
                    const next = [...shiftDraft];
                    next[i] = { ...shift, endMinutes: timeToMinutes(e.target.value) };
                    setShiftDraft(next);
                  }}
                />
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      const next = shiftDraft.filter((_, idx) => idx !== i);
                      setShiftDraft(next);
                    }}
                  >
                    <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-2 flex flex-col gap-2">
            {/* Weekly Shift Coverage Visualization */}
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 p-2.5">
              <span className="text-[11px] font-medium text-muted-foreground">Weekly Shift Coverage (Draft Preview)</span>
              <div className="flex gap-1.5 mt-1">
                {dayNames.map((name, idx) => {
                  const dayNum = daysOfWeek[idx]!;
                  const dayShifts = shiftDraft.filter((s) => s.dayOfWeek === dayNum);
                  const hasShifts = dayShifts.length > 0;
                  return (
                    <div
                      key={name}
                      className={cn(
                        "flex flex-1 flex-col items-center justify-center rounded-md border py-1.5 text-center text-[10px] font-semibold transition-all",
                        hasShifts
                          ? "border-foreground/20 bg-foreground/5 text-foreground shadow-xs"
                          : "border-border/50 bg-muted/40 text-muted-foreground/75"
                      )}
                      title={
                        hasShifts
                          ? dayShifts.map(s => `${minutesToTime(s.startMinutes)}–${minutesToTime(s.endMinutes)}`).join(', ')
                          : 'No shifts'
                      }
                    >
                      <span>{name}</span>
                      <span className="mt-0.5 text-[9px] font-normal opacity-75">
                        {hasShifts ? `${dayShifts.length} shift` : 'off'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {canManage ? (
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setShiftDraft([
                      ...shiftDraft,
                      { dayOfWeek: 1, startMinutes: 9 * 60, endMinutes: 17 * 60 },
                    ])
                  }
                >
                  Add shift
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    // Validate overlaps
                    const sorted = [...shiftDraft].sort((a, b) => {
                      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                      return a.startMinutes - b.startMinutes;
                    });
                    for (let j = 0; j < sorted.length - 1; j++) {
                      const cur = sorted[j]!;
                      const next = sorted[j + 1]!;
                      if (cur.dayOfWeek === next.dayOfWeek && cur.endMinutes > next.startMinutes) {
                        toast.error('Cannot save: some shifts overlap on the same day.');
                        return;
                      }
                    }
                    onSaveShifts(shiftDraft);
                  }}
                >
                  Save shifts
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-3">
        <Label className="text-xs text-muted-foreground">Time off</Label>
        {timeOff.length === 0 ? (
          <p className="m-0 text-xs text-muted-foreground">No time off scheduled.</p>
        ) : (
          <ul className="m-0 flex flex-col gap-1 p-0">
            {timeOff.map((entry) => (
              <li
                key={entry._id}
                className="flex items-center justify-between gap-2 text-sm text-foreground"
              >
                <span>
                  {formatTimeOffRange(entry.startAt, entry.endAt)}
                  {entry.label ? ` · ${entry.label}` : ''}
                </span>
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemoveTimeOff(entry._id)}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <div className="flex flex-wrap items-end gap-2 pt-1">
            <div>
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                type="datetime-local"
                className="mt-1 w-[200px]"
                value={timeOffStart}
                onChange={(e) => setTimeOffStart(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End</Label>
              <Input
                type="datetime-local"
                className="mt-1 w-[200px]"
                value={timeOffEnd}
                onChange={(e) => setTimeOffEnd(e.target.value)}
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <Label className="text-xs text-muted-foreground">Label</Label>
              <Input
                className="mt-1"
                placeholder="Optional"
                value={timeOffLabel}
                onChange={(e) => setTimeOffLabel(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!timeOffStart || !timeOffEnd}
              onClick={() => {
                const startAt = new Date(timeOffStart).getTime();
                const endAt = new Date(timeOffEnd).getTime();
                if (Number.isNaN(startAt) || Number.isNaN(endAt) || endAt <= startAt) {
                  toast.error('Enter a valid time off range');
                  return;
                }
                onAddTimeOff(startAt, endAt, timeOffLabel.trim() || undefined);
                setTimeOffStart('');
                setTimeOffEnd('');
                setTimeOffLabel('');
              }}
            >
              Add time off
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatTimeOffRange(startAt: number, endAt: number) {
  const fmt = (ts: number) =>
    new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  return `${fmt(startAt)} – ${fmt(endAt)}`;
}
