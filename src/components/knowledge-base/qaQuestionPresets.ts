export type QAPairDraft = {
  question: string;
  answer: string;
};

export const qaQuestionPresets = [
  { label: 'Refund policy', question: 'What is your refund policy?' },
  { label: 'Shipping & delivery', question: 'What are your shipping and delivery options?' },
  { label: 'Returns & exchanges', question: 'What is your returns and exchanges policy?' },
  { label: 'Pricing', question: 'How much does it cost?' },
  { label: 'Payment methods', question: 'What payment methods do you accept?' },
  { label: 'Opening hours', question: 'What are your opening hours?' },
  { label: 'Contact support', question: 'How can I contact support?' },
] as const;

export function addQAPreset(
  pairs: QAPairDraft[],
  question: string,
): QAPairDraft[] {
  const blankQuestionIndex = pairs.findIndex((pair) => !pair.question.trim());

  if (blankQuestionIndex === -1) {
    return [...pairs, { question, answer: '' }];
  }

  return pairs.map((pair, index) => (
    index === blankQuestionIndex ? { ...pair, question } : pair
  ));
}
