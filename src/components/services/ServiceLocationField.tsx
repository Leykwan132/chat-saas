import { ChevronDown, MapPin, Video } from 'lucide-react';
import { GOOGLE_MEET_ICON_SRC } from '@/components/calendar/googleCalendarBranding';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useGoogleCalendarConnection } from '@/components/calendar/useGoogleCalendarConnection';
import { isProductFeatureEnabled, useEnableGoogleCalendarConnect } from '@/lib/posthogFeatureFlags';
import type { ServiceForm } from '@/lib/serviceForm';

type ServiceLocationFieldProps = {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  disabled?: boolean;
};

function locationName(locationMode: ServiceForm['locationMode']) {
  if (locationMode === 'remote') return 'Google Meet';
  if (locationMode === 'video_call') return 'Video call';
  return 'In person';
}

function GoogleMeetIcon() {
  return <img src={GOOGLE_MEET_ICON_SRC} alt="" className="size-4 shrink-0" />;
}

function LocationIcon({ locationMode }: { locationMode: ServiceForm['locationMode'] }) {
  if (locationMode === 'remote') return <GoogleMeetIcon />;
  if (locationMode === 'video_call') return <Video className="size-4" />;
  return <MapPin className="size-4" />;
}

export function ServiceLocationField({
  form,
  setForm,
  disabled = false,
}: ServiceLocationFieldProps) {
  const googleCalendar = useGoogleCalendarConnection();
  const googleCalendarEnabled = isProductFeatureEnabled(useEnableGoogleCalendarConnect());
  const googleCalendarConnected = googleCalendar.status?.state === 'connected'
    || googleCalendar.status?.state === 'syncing';
  const canUseGoogleMeet = googleCalendarEnabled && googleCalendarConnected;

  const chooseLocation = (locationMode: ServiceForm['locationMode']) => {
    setForm((previous) => ({
      ...previous,
      locationMode,
      location: locationMode === 'in_person' ? previous.location : '',
    }));
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Location</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" disabled={disabled} className="w-full justify-between">
            <span className="flex items-center gap-2">
              <LocationIcon locationMode={form.locationMode} />
              {locationName(form.locationMode)}
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width)">
          <DropdownMenuItem onSelect={() => chooseLocation('video_call')}>
            <Video />
            Video call
          </DropdownMenuItem>
          {googleCalendarEnabled ? (
            canUseGoogleMeet ? (
              <DropdownMenuItem onSelect={() => chooseLocation('remote')}>
                <GoogleMeetIcon />
                Google Meet
              </DropdownMenuItem>
            ) : (
              <HoverCard openDelay={150} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    aria-disabled="true"
                    disabled={disabled}
                    className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-sm font-medium text-muted-foreground opacity-60 outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={(event) => event.preventDefault()}
                  >
                    <GoogleMeetIcon />
                    Google Meet
                  </button>
                </HoverCardTrigger>
                <HoverCardContent align="start" className="flex flex-col gap-3">
                  <p>Google Meet requires you to connect your Google Calendar.</p>
                  <Button type="button" size="sm" onClick={() => void googleCalendar.connectGoogleCalendar()}>
                    Connect Google Calendar
                  </Button>
                </HoverCardContent>
              </HoverCard>
            )
          ) : null}
          <DropdownMenuItem onSelect={() => chooseLocation('in_person')}>
            <MapPin />
            In person
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {form.locationMode === 'video_call' ? (
        <p className="text-sm text-muted-foreground">
          Create and share a meeting link with your customer.
        </p>
      ) : null}
    </div>
  );
}
