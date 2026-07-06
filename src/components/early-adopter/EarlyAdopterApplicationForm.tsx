import { useState } from 'react';
import { useMutation } from 'convex/react';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { usePostHog } from '@posthog/react';
import { FaFacebookMessenger, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { isValidEmailFormat } from '../../../shared/emailValidation';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const teamSizeOptions = [
  '1 (Just me)',
  '2-5',
  '6-10',
  '11-50',
  '51-200',
  '201+',
] as const;

const channelIcons = {
  WhatsApp: <FaWhatsapp className="size-6" />,
  Instagram: <FaInstagram className="size-6" />,
  Messenger: <FaFacebookMessenger className="size-6" />,
  'Web Chat': <MessageSquare className="size-6" />,
} as const;

export function EarlyAdopterApplicationForm() {
  const posthog = usePostHog();
  const submitContactRequest = useMutation(api.contactRequests.submit);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [useCase, setUseCase] = useState('');
  const [channels, setChannels] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChannelToggle = (channel: string) => {
    setChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      toast.error('Please enter your email.');
      return;
    }
    if (!isValidEmailFormat(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!company.trim()) {
      toast.error('Please enter your company / project name.');
      return;
    }
    if (!teamSize) {
      toast.error('Please select the number of team members.');
      return;
    }
    if (!useCase.trim()) {
      toast.error('Please describe your use case.');
      return;
    }

    setIsSubmitting(true);
    try {
      const details = [
        `Team Size: ${teamSize}`,
        `Use Case: ${useCase.trim()}`,
        `Requested Channels: ${channels.length > 0 ? channels.join(', ') : 'None selected'}`,
      ].join('\n');

      await submitContactRequest({
        intent: 'early_user',
        email: email.trim(),
        contactName: name.trim(),
        companyName: company.trim(),
        numberOfUsers: teamSize,
        additionalDetails: details,
      });
      posthog?.capture('early_adopter_application_submitted', {
        team_size: teamSize,
        channels_count: channels.length,
      });
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      posthog?.captureException(error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="apply-form" className="scroll-mt-28 pt-8">
      <div className="text-center mb-10">
        <h2 className="font-title text-[38px] sm:text-4xl font-normal text-zinc-950 dark:text-white text-center">
          Become our Early Adopter
        </h2>
      </div>
      <div className="max-w-xl mx-auto">
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-6 sm:p-8 md:p-10">
          {submitted ? (
            <div className="flex flex-col justify-center py-10 text-center items-center">
              <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-normal tracking-tight text-zinc-950 dark:text-white">
                  Application Received!
                </h2>
                <p className="max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  Thank you for applying. We will review your application and get in touch with you shortly to set up your account and founder channel.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel className="text-zinc-700 dark:text-zinc-200">
                    Name <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="h-10 w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100/50 dark:bg-zinc-900/60 px-3 text-sm shadow-none text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white placeholder-zinc-400 dark:placeholder-zinc-650"
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-zinc-700 dark:text-zinc-200">
                    Email <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-10 w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100/50 dark:bg-zinc-900/60 px-3 text-sm shadow-none text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white placeholder-zinc-400 dark:placeholder-zinc-650"
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-zinc-700 dark:text-zinc-200">
                    Company / Project Name <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your company or project name"
                    className="h-10 w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100/50 dark:bg-zinc-900/60 px-3 text-sm shadow-none text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white placeholder-zinc-400 dark:placeholder-zinc-650"
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-zinc-700 dark:text-zinc-200">
                    Number of team members <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Select value={teamSize || undefined} onValueChange={setTeamSize}>
                    <SelectTrigger className="h-10 w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100/50 dark:bg-zinc-900/60 px-3 text-sm shadow-none text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white text-left flex justify-between items-center data-placeholder:text-zinc-400 dark:data-placeholder:text-zinc-650">
                      <SelectValue placeholder="Select number of team members" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      className="max-h-48 p-0.5 text-sm shadow-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white rounded-lg"
                    >
                      <SelectGroup>
                        {teamSizeOptions.map((option) => (
                          <SelectItem
                            key={option}
                            value={option}
                            className="!text-sm py-2 pl-3 pr-8 cursor-pointer rounded focus:bg-zinc-100 dark:focus:bg-zinc-900/60"
                          >
                            {option}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel className="text-zinc-700 dark:text-zinc-200">
                    What is your usecase? <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Textarea
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    placeholder="Explain how you plan to use Kilobot (e.g. qualify leads on WhatsApp, automate support questions, schedule meetings)."
                    className="min-h-24 text-sm w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100/50 dark:bg-zinc-900/60 p-3 shadow-none text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white placeholder-zinc-400 dark:placeholder-zinc-650"
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-zinc-700 dark:text-zinc-200">
                    Which channels do you want to connect?
                  </FieldLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(channelIcons).map(([channel, icon]) => {
                      const isSelected = channels.includes(channel);
                      return (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => handleChannelToggle(channel)}
                          className={cn(
                            'flex flex-col items-center justify-center p-5 rounded-xl border text-center transition-all cursor-pointer select-none gap-3 outline-none w-full',
                            isSelected
                              ? 'border-zinc-950 bg-zinc-50/50 ring-1 ring-zinc-950 dark:border-white dark:bg-white/[0.05] dark:ring-1 dark:ring-white'
                              : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:bg-white/[0.04]',
                          )}
                        >
                          <div className={cn(
                            'transition-colors',
                            isSelected ? 'text-zinc-950 dark:text-white' : 'text-zinc-400 dark:text-zinc-500',
                          )}>
                            {icon}
                          </div>
                          <span className={cn(
                            'text-xs font-semibold tracking-tight transition-colors',
                            isSelected ? 'text-zinc-950 dark:text-white' : 'text-zinc-500 dark:text-zinc-400',
                          )}>
                            {channel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </FieldGroup>
              <div className="flex justify-start pt-2">
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting}
                  className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 px-6 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? <Spinner className="size-4" /> : null}
                  Submit Application
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
