type MessagingWindowExplanationProps = {
  window: 'conversation' | 'free';
};

const conversationSections = [
  { title: 'While open', body: 'Type a reply or let your AI respond.' },
  { title: 'When it restarts', body: 'Each customer message starts another 24 hours.' },
  { title: 'After it closes', body: 'Use an approved template to contact them again.' },
];

const freeMessagingSections = [
  { title: 'What’s free', body: 'Meta messaging charges are waived for 72 hours.' },
  { title: 'When it starts', body: 'Reply within 24 hours to an eligible ad or Facebook Page CTA message.' },
  { title: 'Reply rules', body: 'If the 24-hour conversation window closes, use an approved template.' },
];

export function MessagingWindowExplanation({ window }: MessagingWindowExplanationProps) {
  const sections = window === 'conversation' ? conversationSections : freeMessagingSections;

  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) => (
        <div key={section.title} className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground">{section.title}</span>
          <p className="text-muted-foreground">{section.body}</p>
        </div>
      ))}
    </div>
  );
}
