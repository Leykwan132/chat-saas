import { Switch } from '@/components/ui/switch';
import type { ServiceForm, TeamUserOption } from '@/lib/serviceForm';

export function CreateServiceTeamStep({
  form,
  setForm,
  teamUserOptions,
}: {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  teamUserOptions: TeamUserOption[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Assign team</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose who can take this service.</p>
      </div>
      <div className="grid gap-2">
        {teamUserOptions.map((user) => {
          const checked = form.assignedWorkosUserIds.includes(user.value);
          return (
            <div key={user.value} className="flex items-center justify-between gap-3 rounded-xl border p-3">
              <label htmlFor={`create-service-teammate-${user.value}`} className="min-w-0 cursor-pointer">
                <span className="block text-sm font-medium text-foreground">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.roleLabel}</span>
              </label>
              <Switch
                id={`create-service-teammate-${user.value}`}
                checked={checked}
                onCheckedChange={(nextChecked) => setForm((previous) => ({
                  ...previous,
                  assignedWorkosUserIds: nextChecked
                    ? [...previous.assignedWorkosUserIds, user.value]
                    : previous.assignedWorkosUserIds.filter((id) => id !== user.value),
                }))}
                aria-label={`${checked ? 'Remove' : 'Add'} ${user.name}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
