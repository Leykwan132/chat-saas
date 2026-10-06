type MessagingWindowExplanationProps = {
  window: 'conversation' | 'free';
};

const conversationSections = [
  { title: 'Cost', body: 'Normal replies are charged as “service” messages. The first 1,000 per business phone number each month are free; after that, Meta rates apply.' },
  { title: 'What you can send', body: 'You and your AI can reply within the 24-hour window. After it closes, use an approved template.' },
];

const freeMessagingSections = [
  { title: 'Cost', body: 'No Meta messaging charges while this 72-hour window is open.' },
  { title: 'What you can send', body: 'After the 24-hour window closes, use an approved template to restart the conversation. The template is free while this 72-hour window is open.' },
];

export function MessagingWindowExplanation({ window }: MessagingWindowExplanationProps) {
  const sections = window === 'conversation' ? conversationSections : freeMessagingSections;

  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground">{section.title}</span>
          <p className="text-muted-foreground">{section.body}</p>
          {window === 'conversation' && section.title === 'Cost' && (
            <a
              href="https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing#rate-cards-effective-october-1-2026"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium w-fit"
            >
              Check Meta rates
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
