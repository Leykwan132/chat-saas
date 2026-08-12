export type Announcement = {
  title: string;
  summary: string;
  details: string[];
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    title: 'New, more capable AI models',
    summary: 'Choose the model that best fits each customer conversation.',
    details: [
      'Use Qwen3.7 Flash for fast Chinese conversations.',
      'Use NVIDIA Nemotron 3.5 Lightning for faster English responses.',
      'Use GPT-5.6 Luna for slightly stronger performance.',
      'Use GPT-OSS 120B for budget-friendly reasoning.',
    ],
  },
];
