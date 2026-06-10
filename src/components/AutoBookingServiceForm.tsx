import { Separator } from '@/components/ui/separator';
import {
  AUTO_BOOKING_SECTION_COPY,
  AutoBookingAssignmentFields,
  AutoBookingDataCollectionFields,
  AutoBookingSectionHeading,
  AutoBookingServiceDetailsFields,
  AutoBookingTimingFields,
} from '@/components/auto-booking/autoBookingFormShared';
import type { ServiceForm, TeamUserOption } from '@/lib/autoBookingServiceForm';

interface AutoBookingServiceFormProps {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  teamUserOptions: TeamUserOption[];
  canManage: boolean;
}

export function AutoBookingServiceForm({
  form,
  setForm,
  teamUserOptions,
  canManage,
}: AutoBookingServiceFormProps) {
  const disabled = !canManage;

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-8">
        <AutoBookingSectionHeading
          title={AUTO_BOOKING_SECTION_COPY.details.title}
          subtitle={AUTO_BOOKING_SECTION_COPY.details.subtitle}
        />
        <AutoBookingServiceDetailsFields form={form} setForm={setForm} disabled={disabled} />
      </section>

      <Separator />

      <section className="flex flex-col gap-8">
        <AutoBookingSectionHeading
          title={AUTO_BOOKING_SECTION_COPY.timing.title}
          subtitle={AUTO_BOOKING_SECTION_COPY.timing.subtitle}
        />
        <AutoBookingTimingFields form={form} setForm={setForm} disabled={disabled} />
      </section>

      <Separator />

      <section className="flex flex-col gap-8">
        <AutoBookingSectionHeading
          title={AUTO_BOOKING_SECTION_COPY.data.title}
          subtitle={AUTO_BOOKING_SECTION_COPY.data.subtitle}
        />
        <AutoBookingDataCollectionFields form={form} setForm={setForm} disabled={disabled} />
      </section>

      <Separator />

      <section className="flex flex-col gap-8">
        <AutoBookingSectionHeading
          title={AUTO_BOOKING_SECTION_COPY.assignment.title}
          subtitle={AUTO_BOOKING_SECTION_COPY.assignment.subtitle}
        />
        <AutoBookingAssignmentFields
          form={form}
          setForm={setForm}
          teamUserOptions={teamUserOptions}
          disabled={disabled}
        />
      </section>
    </div>
  );
}
