import { useState } from 'react';
import { useMutation } from 'convex/react';
import { ArrowRight, Play, MessageSquare, Link as LinkIcon } from 'lucide-react';
import { FaWhatsapp, FaInstagram, FaFacebookMessenger } from 'react-icons/fa';
import { api } from '../../convex/_generated/api';
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
import { isValidEmailFormat } from '../../shared/emailValidation';

const teamSizeOptions = [
  '1 (Just me)',
  '2–5',
  '6–10',
  '11–50',
  '51–200',
  '201+',
] as const;

const channelIcons: Record<string, React.ReactNode> = {
  WhatsApp: <FaWhatsapp className="size-6" />,
  Instagram: <FaInstagram className="size-6" />,
  Messenger: <FaFacebookMessenger className="size-6" />,
  'Web Chat': <MessageSquare className="size-6" />,
};

export default function EarlyUserPage() {
  const submitContactRequest = useMutation(api.contactRequests.submit);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [useCase, setUseCase] = useState('');
  const [channels, setChannels] = useState<string[]>([]);
  const [feedbackCommitted, setFeedbackCommitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const handleChannelToggle = (channel: string) => {
    setChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    if (!feedbackCommitted) {
      toast.error('Please agree to provide early feedback.');
      return;
    }

    setIsSubmitting(true);
    try {
      const details = [
        `Team Size: ${teamSize}`,
        `Use Case: ${useCase.trim()}`,
        `Requested Channels: ${channels.length > 0 ? channels.join(', ') : 'None selected'}`,
        `Feedback Committed: Yes`
      ].join('\n');

      await submitContactRequest({
        intent: 'early_user',
        email: email.trim(),
        contactName: name.trim(),
        companyName: company.trim(),
        numberOfUsers: teamSize,
        additionalDetails: details,
      });
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      question: "What is the Early Adopter Program?",
      answer: "It is a beta-testing cohort where you get full access to our Growth plan completely free for a year in exchange for testing Kilobot and sharing your honest feedback."
    },
    {
      question: "How does the 1-year free Growth plan work?",
      answer: "Once accepted, we will upgrade your account. You get 10 AI agents, 5,000 monthly credits, calendar auto-booking, and integrations free for 12 months."
    },
    {
      question: "Which messaging channels can I connect?",
      answer: "You can connect your official WhatsApp, Instagram, Messenger, or Web Chat inboxes directly from your Kilobot dashboard using our official Meta API integrations."
    },
    {
      question: "What kind of feedback do you expect?",
      answer: "We expect you to test your AI agents in real customer conversations, report any bugs or operational issues, and share suggestions for improving the platform."
    },
    {
      question: "Will I really have direct access to the founder?",
      answer: "Yes. We set up a private WhatsApp chat for direct, 1-on-1 support with the founder to help you build, tune, and optimize your AI agents."
    }
  ];

  return (
    <div className="flex min-h-[100svh] flex-col overflow-x-clip bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-[#060606] dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800">
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col pb-24">
        
        {/* 1. Centered Introduction section (Full viewport height hero) */}
        <section className="text-center w-full max-w-4xl mx-auto px-5 sm:px-6 min-h-[100svh] flex flex-col justify-center items-center">
          <div className="max-w-2xl mx-auto flex flex-col items-center pt-12 pb-24">
            <h1 className="font-title text-[40px] sm:text-5xl font-normal leading-tight tracking-tight text-zinc-950 dark:text-white md:text-6xl">
              Early Adopters
            </h1>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-lg">
              Deploy AI agents on WhatsApp, Instagram, and Messenger. Get 1 year of our Growth plan free in exchange for early feedback.
            </p>
            <div className="mt-8 flex flex-row items-center gap-3 sm:gap-3.5 w-full sm:w-auto max-w-sm justify-center">
              <button
                type="button"
                onClick={() => scrollToSection('apply-form')}
                className="inline-flex h-11 flex-1 sm:flex-none sm:w-auto items-center justify-center gap-2 rounded-full bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 px-4 sm:px-6 text-sm font-semibold transition-colors cursor-pointer shadow-sm"
              >
                Apply now
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('benefits')}
                className="inline-flex h-11 flex-1 sm:flex-none sm:w-auto items-center justify-center gap-2 rounded-full border border-zinc-200 bg-transparent px-4 sm:px-6 text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-50 dark:border-white/20 dark:text-white dark:hover:bg-white/5 cursor-pointer"
              >
                See benefits
              </button>
            </div>
          </div>
        </section>

        {/* Outer container wrapping the rest of the page sections */}
        <div className="mx-auto box-border w-full max-w-4xl shrink-0 px-5 sm:px-6">

          {/* 2. Benefits section */}
          <section id="benefits" className="scroll-mt-28 mb-24 pt-8">
            <h2 className="font-title text-[38px] sm:text-4xl font-normal text-zinc-950 dark:text-white mb-14 text-center">
              Program Benefits
            </h2>
            
            {/* Vertical list of benefits separated by thin dividers */}
            <div className="max-w-4xl mx-auto flex flex-col divide-y divide-zinc-200 dark:divide-white/[0.08] border-t border-b border-zinc-200 dark:border-white/[0.08]">
              {/* Item 1 */}
              <div className="py-12 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-12 md:gap-32 items-start">
                <div className="flex items-center gap-3.5">
                  <Play className="size-5 text-zinc-400 dark:text-zinc-500 stroke-[1.2] shrink-0" />
                  <h3 className="font-title text-2xl font-normal text-zinc-950 dark:text-white">1 Year Free Growth</h3>
                </div>
                <div>
                  <p className="text-xs sm:text-sm md:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Get a full year of our Growth plan completely free (worth RM 4,788). Includes 10 AI agents and 5,000 monthly chat credits.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="py-12 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-12 md:gap-32 items-start">
                <div className="flex items-center gap-3.5">
                  <MessageSquare className="size-5 text-zinc-400 dark:text-zinc-500 stroke-[1.2] shrink-0" />
                  <h3 className="font-title text-2xl font-normal text-zinc-950 dark:text-white">Founder Direct Line</h3>
                </div>
                <div>
                  <p className="text-xs sm:text-sm md:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Access a private WhatsApp chat directly with our founder to assist you with prompt engineering and integrations.
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="py-12 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-12 md:gap-32 items-start">
                <div className="flex items-center gap-3.5">
                  <LinkIcon className="size-5 text-zinc-400 dark:text-zinc-500 stroke-[1.2] shrink-0" />
                  <h3 className="font-title text-2xl font-normal text-zinc-950 dark:text-white">Roadmap Influence</h3>
                </div>
                <div>
                  <p className="text-xs sm:text-sm md:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Be the first to request custom features, test new messaging channels (WhatsApp, Instagram), and try new models.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. FAQ section matching the provided accordion styling */}
          <section id="faq" className="scroll-mt-28 mb-24 pt-8">
            <h2 className="font-title text-[38px] sm:text-4xl font-normal text-zinc-950 dark:text-white mb-10 text-center">
              FAQ
            </h2>
            <div className="max-w-2xl mx-auto border-t border-zinc-200 dark:border-white/[0.08]">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="border-b border-zinc-200 dark:border-white/[0.08] py-4 text-left">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full flex justify-between items-center text-left py-2.5 font-medium text-zinc-950 dark:text-white text-base sm:text-lg focus:outline-none hover:underline cursor-pointer group"
                    >
                      <span className="group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">{faq.question}</span>
                      <span className="text-zinc-400 dark:text-zinc-500 text-xl font-light ml-4 select-none group-hover:text-zinc-650 dark:group-hover:text-zinc-300 transition-colors">
                        {isOpen ? '−' : '＋'}
                      </span>
                    </button>
                    <div className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out text-sm text-zinc-500 dark:text-zinc-400 mt-1",
                      isOpen ? "max-h-40 pb-3 opacity-100" : "max-h-0 opacity-0"
                    )}>
                      <p className="leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. Form section matching the warm dark mode card styling */}
          <section id="apply-form" className="scroll-mt-28 pt-8">
            <div className="text-center mb-10">
              <h2 className="font-title text-[38px] sm:text-4xl font-normal text-zinc-950 dark:text-white text-center">
                Become an Early Adopter
              </h2>
            </div>
            <div className="max-w-xl mx-auto">
              <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-6 sm:p-8 md:p-10 shadow-sm">
                {submitted ? (
                  <div className="flex flex-col justify-center py-10 text-center items-center">
                    <div className="space-y-4">
                      <h2 className="text-2xl font-normal tracking-tight text-zinc-950 dark:text-white">
                        Application Received!
                      </h2>
                      <p className="max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                        Thank you for applying. We will review your application and get in touch with you shortly to set up your account and founder channel.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">

                    <div className="space-y-5">
                      <label className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                          Name <span className="text-red-500">*</span>
                        </span>
                        <Input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="h-10 w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100/50 dark:bg-zinc-900/60 px-3 text-sm shadow-none text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white placeholder-zinc-400 dark:placeholder-zinc-650"
                        />
                      </label>

                      <label className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                          Email <span className="text-red-500">*</span>
                        </span>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="h-10 w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100/50 dark:bg-zinc-900/60 px-3 text-sm shadow-none text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white placeholder-zinc-400 dark:placeholder-zinc-650"
                        />
                      </label>

                      <label className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                          Company / Project Name <span className="text-red-500">*</span>
                        </span>
                        <Input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Your company or project name"
                          className="h-10 w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100/50 dark:bg-zinc-900/60 px-3 text-sm shadow-none text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white placeholder-zinc-400 dark:placeholder-zinc-650"
                        />
                      </label>

                      <label className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                          Number of team members <span className="text-red-500">*</span>
                        </span>
                        <Select
                          value={teamSize || undefined}
                          onValueChange={setTeamSize}
                        >
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
                            {teamSizeOptions.map((option) => (
                              <SelectItem
                                key={option}
                                value={option}
                                className="!text-sm py-2 pl-3 pr-8 cursor-pointer rounded focus:bg-zinc-100 dark:focus:bg-zinc-900/60"
                              >
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>

                      <label className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                          What is your usecase? <span className="text-red-500">*</span>
                        </span>
                        <Textarea
                          value={useCase}
                          onChange={(e) => setUseCase(e.target.value)}
                          placeholder="Explain how you plan to use Kilobot (e.g. qualify leads on WhatsApp, automate support questions, schedule meetings)."
                          className="min-h-24 text-sm w-full rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100/50 dark:bg-zinc-900/60 p-3 shadow-none text-zinc-900 dark:text-white focus:border-zinc-400 dark:focus:border-white focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white placeholder-zinc-400 dark:placeholder-zinc-650"
                        />
                      </label>

                      <div className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                          Which channels do you want to connect?
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {['WhatsApp', 'Instagram', 'Messenger', 'Web Chat'].map((channel) => {
                            const isSelected = channels.includes(channel);
                            return (
                              <button
                                key={channel}
                                type="button"
                                onClick={() => handleChannelToggle(channel)}
                                className={cn(
                                  "flex flex-col items-center justify-center p-5 rounded-xl border text-center transition-all cursor-pointer select-none gap-3 outline-none w-full",
                                  isSelected
                                    ? "border-zinc-950 bg-zinc-50/50 ring-1 ring-zinc-950 dark:border-white dark:bg-white/[0.05] dark:ring-1 dark:ring-white"
                                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
                                )}
                              >
                                <div className={cn(
                                  "transition-colors",
                                  isSelected ? "text-zinc-950 dark:text-white" : "text-zinc-400 dark:text-zinc-500"
                                )}>
                                  {channelIcons[channel]}
                                </div>
                                <span className={cn(
                                  "text-xs font-semibold tracking-tight transition-colors",
                                  isSelected ? "text-zinc-950 dark:text-white" : "text-zinc-500 dark:text-zinc-400"
                                )}>
                                  {channel}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-white/[0.06] bg-zinc-100/30 dark:bg-white/[0.01] mt-6 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={feedbackCommitted}
                          onChange={(e) => setFeedbackCommitted(e.target.checked)}
                          className="mt-1 rounded border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-zinc-900 dark:focus:ring-white focus:ring-offset-0 focus:ring-0 checked:bg-zinc-900 dark:checked:bg-white checked:border-zinc-900 dark:checked:border-white cursor-pointer size-4"
                        />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
                          I agree to try out Kilobot and provide constructive feedback and bug reports to the founder. <span className="text-red-500">*</span>
                        </span>
                      </label>
                    </div>

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

        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
