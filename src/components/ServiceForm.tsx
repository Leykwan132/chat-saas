import { Separator } from '@/components/ui/separator';
import {
  SERVICE_SECTION_COPY,
  ServiceAssignmentFields,
  ServiceDataCollectionFields,
  ServiceSectionHeading,
  ServiceDetailsFields,
  ServiceTimingFields,
} from '@/components/services/serviceFormShared';
import type { ServiceForm, TeamUserOption } from '@/lib/serviceForm';

interface ServiceFormProps {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  teamUserOptions: TeamUserOption[];
  canManage: boolean;
}

export function ServiceForm({
  form,
  setForm,
  teamUserOptions,
  canManage,
}: ServiceFormProps) {
  const disabled = !canManage;

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-8">
        <ServiceSectionHeading
          title={SERVICE_SECTION_COPY.details.title}
          subtitle={SERVICE_SECTION_COPY.details.subtitle}
        />
        <ServiceDetailsFields form={form} setForm={setForm} disabled={disabled} />
      </section>

      <Separator />

      <section className="flex flex-col gap-8">
        <ServiceSectionHeading
          title={SERVICE_SECTION_COPY.timing.title}
          subtitle={SERVICE_SECTION_COPY.timing.subtitle}
        />
        <ServiceTimingFields form={form} setForm={setForm} disabled={disabled} />
      </section>

      <Separator />

      <section className="flex flex-col gap-8">
        <ServiceSectionHeading
          title={SERVICE_SECTION_COPY.data.title}
          subtitle={SERVICE_SECTION_COPY.data.subtitle}
        />
        <ServiceDataCollectionFields form={form} setForm={setForm} disabled={disabled} />
      </section>

      <Separator />

      <section className="flex flex-col gap-8">
        <ServiceSectionHeading
          title={SERVICE_SECTION_COPY.assignment.title}
          subtitle={SERVICE_SECTION_COPY.assignment.subtitle}
        />
        <ServiceAssignmentFields
          form={form}
          setForm={setForm}
          teamUserOptions={teamUserOptions}
          disabled={disabled}
        />
      </section>
    </div>
  );
}
