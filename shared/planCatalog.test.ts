import { expect, test } from 'vitest';
import { getPlanPickerCards } from './planCatalog';

test('only exposes paid plans as selectable plan cards', () => {
  expect(getPlanPickerCards().map((plan) => plan.id)).toEqual([
    'starter',
    'growth',
    'business',
  ]);
});
