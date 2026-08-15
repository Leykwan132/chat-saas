import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ASSIGNMENT_STRATEGY_OPTIONS,
  type WizardSelectOption,
} from '@/components/services/serviceFormConstants';
import {
  WizardRadioOptionGroup,
  WizardSelectField,
} from '@/components/services/serviceFormControls';
import { includeAllServiceTeammates } from '@/lib/serviceAssignmentSelection';
import type {
  AssignmentStrategy,
  ServiceForm,
  TeamUserOption,
} from '@/lib/serviceForm';

export function ServiceAssignmentFields({
  form,
  setForm,
  teamUserOptions,
  disabled = false,
  showIncludeAll = false,
}: {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  teamUserOptions: TeamUserOption[];
  disabled?: boolean;
  showIncludeAll?: boolean;
}) {
  const specificUserOptions: WizardSelectOption[] = teamUserOptions
    .filter((user) => form.assignedWorkosUserIds.includes(user.value))
    .map((user) => ({ value: user.value, title: user.name, meta: user.roleLabel }));

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label>Service teammates</Label>
            {showIncludeAll ? (
              <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setForm((previous) => includeAllServiceTeammates(previous, teamUserOptions))}>
                Include all teammates
              </Button>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Bookings go to selected teammates who are available.</p>
        </div>
        <div className="grid gap-2">
          {teamUserOptions.map((user) => {
            const checked = form.assignedWorkosUserIds.includes(user.value);
            return (
              <div key={user.value} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                <label htmlFor={`service-teammate-${user.value}`} className="flex min-w-0 cursor-pointer items-center gap-3">
                  <span className="font-medium text-foreground">{user.name}</span>
                  <span className="text-muted-foreground">{user.roleLabel}</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{checked ? 'Included' : 'Not included'}</span>
                  <Switch
                    id={`service-teammate-${user.value}`}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(nextChecked) => setForm((previous) => ({
                      ...previous,
                      assignedWorkosUserIds: nextChecked
                        ? [...previous.assignedWorkosUserIds, user.value]
                        : previous.assignedWorkosUserIds.filter((id) => id !== user.value),
                      specificWorkosUserId: !nextChecked && previous.specificWorkosUserId === user.value
                        ? ''
                        : previous.specificWorkosUserId,
                    }))}
                    aria-label={`${checked ? 'Remove' : 'Add'} ${user.name} as a service teammate`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <WizardRadioOptionGroup
        label="Assignment method"
        value={form.assignmentStrategy}
        options={ASSIGNMENT_STRATEGY_OPTIONS}
        disabled={disabled}
        onChange={(value) => setForm((previous) => ({ ...previous, assignmentStrategy: value as AssignmentStrategy }))}
      />
      {form.assignmentStrategy === 'specific_user' ? (
        <WizardSelectField
          label="Specific teammate"
          value={form.specificWorkosUserId}
          disabled={disabled}
          options={specificUserOptions}
          onChange={(value) => setForm((previous) => ({ ...previous, specificWorkosUserId: value }))}
        />
      ) : null}
    </div>
  );
}
