import { useState } from 'react';
import { useMutation } from 'convex/react';
import { Link, useSearchParams } from 'react-router';
import { usePostHog } from '@posthog/react';
import { ArrowRight } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { pricingTableShellClass, pricingViewAllLinkClass } from '@/components/pricing/pricingStyles';
import { isValidEmailFormat } from '../../shared/emailValidation';
import {
  contactFieldClass,
  contactSelectContentClass,
  contactSelectContentProps,
  contactSelectItemClass,
  contactSelectTriggerClass,
  intentLabels,
  normalizeIntent,
  numberOfUsersOptions,
  type ContactIntent,
} from './contactPageConfig';
import { OptionalLabel, RequiredLabel } from './ContactFieldLabels';

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const posthog = usePostHog();
  const submitContactRequest = useMutation(api.contactRequests.submit);

  const intentSearchParam = searchParams.get('intent');
  const [intentSelection, setIntentSelection] = useState(() => ({
    searchParam: intentSearchParam,
    intent: normalizeIntent(intentSearchParam),
  }));
  const intent =
    intentSelection.searchParam === intentSearchParam
      ? intentSelection.intent
      : normalizeIntent(intentSearchParam);
  const [email, setEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [numberOfUsers, setNumberOfUsers] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const showBusinessFields = intent === 'enterprise' || intent === 'demo';

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email.');
      return;
    }
    if (!isValidEmailFormat(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (showBusinessFields) {
      if (!contactName.trim()) {
        toast.error('Please enter a contact name.');
        return;
      }
      if (!companyName.trim()) {
        toast.error('Please enter a company.');
        return;
      }
      if (!contactNumber.trim()) {
        toast.error('Please enter a phone number.');
        return;
      }
      if (!numberOfUsers) {
        toast.error('Please select company size.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await submitContactRequest({
        intent,
        email,
        contactName: showBusinessFields ? contactName : undefined,
        companyName: showBusinessFields ? companyName : undefined,
        contactNumber: showBusinessFields ? contactNumber : undefined,
        numberOfUsers: showBusinessFields ? numberOfUsers : undefined,
        additionalDetails: additionalDetails.trim() || undefined,
      });
      posthog?.capture('contact_request_submitted', {
        intent,
        number_of_users: showBusinessFields ? numberOfUsers : undefined,
      });
      setSubmitted(true);
    } catch (error) {
      posthog?.captureException(error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page flex min-h-[100svh] flex-col overflow-x-clip bg-zinc-50 font-sans text-zinc-900 antialiased selection:bg-zinc-200 selection:text-zinc-900 dark:bg-[#060606] dark:text-zinc-100 dark:selection:bg-zinc-800 dark:selection:text-zinc-50">
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col pt-32 pb-24 sm:pt-40 sm:pb-28 lg:pt-44 lg:pb-32">
        <div className="mx-auto box-border w-full max-w-6xl shrink-0 px-5 sm:px-6">
          <div className="grid w-full items-start gap-y-6 lg:grid-cols-2 lg:gap-x-24 lg:gap-y-0">
          <section className="max-lg:mb-2">
            <h1 className="font-title text-4xl font-medium leading-tight tracking-tight text-zinc-950 dark:text-white sm:text-5xl">
              Let&apos;s start a conversation
            </h1>
            <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-500 dark:text-zinc-400 sm:mt-4">
              Enterprise plans, demos, or support — the founder will reach out personally.
            </p>
          </section>

          <section
            className={cn(
              pricingTableShellClass,
              'mt-0 border-zinc-200 bg-white p-6 dark:border-white/[0.08] dark:bg-white/[0.02] sm:p-8 lg:p-10',
            )}
          >
            {submitted ? (
              <div className="flex min-h-80 flex-col justify-between py-4">
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                    Request received
                  </h2>
                  <p className="max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    Thanks for reaching out. The founder will contact you personally soon.
                  </p>
                </div>
                <Link to="/" className={pricingViewAllLinkClass()}>
                  Back to home
                </Link>
              </div>
            ) : (
              <div className="space-y-5 sm:space-y-6">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                  Contact our team
                </h2>

                <div className="space-y-4 sm:space-y-5">
                  <label className="block space-y-2">
                    <RequiredLabel>Email</RequiredLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@company.com"
                      className={contactFieldClass}
                    />
                  </label>

                  <label className="block space-y-2">
                    <RequiredLabel>Purpose</RequiredLabel>
                    <Select
                      value={intent}
                      onValueChange={(value) =>
                        setIntentSelection({
                          searchParam: intentSearchParam,
                          intent: value as ContactIntent,
                        })
                      }
                    >
                      <SelectTrigger className={contactSelectTriggerClass}>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent
                        {...contactSelectContentProps}
                        className={contactSelectContentClass}
                      >
                        <SelectItem value="enterprise" className={contactSelectItemClass}>
                          {intentLabels.enterprise}
                        </SelectItem>
                        <SelectItem value="demo" className={contactSelectItemClass}>
                          {intentLabels.demo}
                        </SelectItem>
                        <SelectItem value="support" className={contactSelectItemClass}>
                          {intentLabels.support}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </label>

                  {showBusinessFields ? (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                        <label className="block space-y-2">
                          <RequiredLabel>Contact name</RequiredLabel>
                          <Input
                            value={contactName}
                            onChange={(event) => setContactName(event.target.value)}
                            className={contactFieldClass}
                          />
                        </label>
                        <label className="block space-y-2">
                          <RequiredLabel>Company</RequiredLabel>
                          <Input
                            value={companyName}
                            onChange={(event) => setCompanyName(event.target.value)}
                            className={contactFieldClass}
                          />
                        </label>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                        <label className="block space-y-2">
                          <RequiredLabel>Phone number</RequiredLabel>
                          <Input
                            type="tel"
                            value={contactNumber}
                            onChange={(event) => setContactNumber(event.target.value)}
                            placeholder="+1 555 000 0000"
                            className={contactFieldClass}
                          />
                        </label>
                        <label className="block space-y-2">
                          <RequiredLabel>Company size</RequiredLabel>
                          <Select
                            value={numberOfUsers || undefined}
                            onValueChange={setNumberOfUsers}
                          >
                            <SelectTrigger className={contactSelectTriggerClass}>
                              <SelectValue placeholder="Select company size" />
                            </SelectTrigger>
                            <SelectContent
                              {...contactSelectContentProps}
                              className={contactSelectContentClass}
                            >
                              {numberOfUsersOptions.map((option) => (
                                <SelectItem
                                  key={option}
                                  value={option}
                                  className={contactSelectItemClass}
                                >
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                      </div>
                    </>
                  ) : null}

                  <label className="block space-y-2">
                    <OptionalLabel>Additional details</OptionalLabel>
                    <Textarea
                      value={additionalDetails}
                      onChange={(event) => setAdditionalDetails(event.target.value)}
                      placeholder="How are you looking to use Kilobot?"
                      className="min-h-28 text-base sm:min-h-32 md:text-sm"
                    />
                  </label>
                </div>

                <div className="flex justify-start">
                  <Button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    {isSubmitting ? <Spinner className="size-4" /> : null}
                    Submit
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
