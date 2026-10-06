type MessagingWindowExplanationProps = {
  window: 'conversation' | 'free';
};

const conversationSections = [
  { title: 'Cost', body: 'Meta charges may apply, depending on the message type and customer’s country.' },
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
        </div>
      ))}
    </div>
  );
}
