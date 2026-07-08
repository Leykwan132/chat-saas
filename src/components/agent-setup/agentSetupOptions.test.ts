import { expect, test } from 'vitest';
import { templateOptions } from './agentSetupOptions';

test('template options include a product sales agent beside real estate sales', () => {
  expect(templateOptions.map((option) => option.key)).toEqual([
    'blank',
    'sales',
    'productSales',
    'support',
  ]);
});
