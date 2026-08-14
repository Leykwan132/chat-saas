import type { ServiceForm } from './serviceForm';

export function includeAllServiceTeammates(
  form: ServiceForm,
  teamUserOptions: Array<{ value: string }>,
): ServiceForm {
  return {
    ...form,
    assignedWorkosUserIds: teamUserOptions.map((user) => user.value),
  };
}
