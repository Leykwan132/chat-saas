import { useState } from 'react';
import { BriefcaseBusiness, CalendarClock, ClipboardList, UsersRound } from 'lucide-react';
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

const SERVICE_FORM_SECTIONS = [
  { id: 'details', copy: SERVICE_SECTION_COPY.details, Icon: BriefcaseBusiness },
  { id: 'timing', copy: SERVICE_SECTION_COPY.timing, Icon: CalendarClock },
  { id: 'assignment', copy: SERVICE_SECTION_COPY.assignment, Icon: UsersRound },
  { id: 'data', copy: SERVICE_SECTION_COPY.data, Icon: ClipboardList },
] as const;

type ServiceFormSection = (typeof SERVICE_FORM_SECTIONS)[number]['id'];

export function ServiceForm({
  form,
  setForm,
  teamUserOptions,
  canManage,
}: ServiceFormProps) {
  const disabled = !canManage;
  const [activeSection, setActiveSection] = useState<ServiceFormSection>('assignment');

  return (
    <div className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)]">
      <nav className="flex flex-wrap gap-2 md:sticky md:top-6 md:h-fit md:flex-col" aria-label="Service sections">
        {SERVICE_FORM_SECTIONS.map((section) => {
          const selected = activeSection === section.id;
          const Icon = section.Icon;

          return (
            <button
              key={section.id}
              type="button"
              aria-pressed={selected}
              className={
                selected
                  ? 'rounded-xl bg-muted px-3 py-2 text-left text-sm font-medium text-foreground'
                  : 'rounded-xl px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }
              onClick={() => setActiveSection(section.id)}
            >
              <span className="inline-flex items-center gap-2">
                <Icon className="size-4 shrink-0" />
                {section.copy.title}
              </span>
            </button>
          );
        })}
      </nav>

      <section className="flex min-w-0 flex-col gap-8">
        <ServiceSectionHeading
          title={SERVICE_SECTION_COPY[activeSection].title}
          subtitle={SERVICE_SECTION_COPY[activeSection].subtitle}
        />

        {activeSection === 'assignment' ? (
          <ServiceAssignmentFields
            form={form}
            setForm={setForm}
            teamUserOptions={teamUserOptions}
            disabled={disabled}
            showIncludeAll={false}
          />
        ) : null}
        {activeSection === 'details' ? (
          <ServiceDetailsFields form={form} setForm={setForm} disabled={disabled} />
        ) : null}
        {activeSection === 'timing' ? (
          <ServiceTimingFields form={form} setForm={setForm} disabled={disabled} />
        ) : null}
        {activeSection === 'data' ? (
          <ServiceDataCollectionFields form={form} setForm={setForm} disabled={disabled} />
        ) : null}
      </section>
    </div>
  );
}
