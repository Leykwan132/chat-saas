import { expect, test } from 'vitest';
import { addQAPreset } from './qaQuestionPresets';

test('fills the first blank Q&A row from a selected preset', () => {
  expect(
    addQAPreset([{ question: '', answer: '' }], 'What is your refund policy?'),
  ).toEqual([{ question: 'What is your refund policy?', answer: '' }]);
});

test('adds a Q&A row when every existing question is filled', () => {
  expect(
    addQAPreset(
      [{ question: 'What are your opening hours?', answer: '' }],
      'What is your refund policy?',
    ),
  ).toEqual([
    { question: 'What are your opening hours?', answer: '' },
    { question: 'What is your refund policy?', answer: '' },
  ]);
});
