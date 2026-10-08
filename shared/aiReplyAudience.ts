export type AiReplyAudience = 'all' | 'ads' | 'new';

export const AI_REPLY_AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All customers', description: 'Reply to all customers.' },
  { value: 'ads', label: 'Only customers from ads', description: 'Reply to customers who contacted you through an ad, including their future messages.' },
  { value: 'new', label: 'Only new customers', description: 'Reply to customers added after you first publish this setting, including those from ads. Existing contacts are excluded.' },
] as const;
