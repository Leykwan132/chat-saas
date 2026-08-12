import { expect, test, vi } from 'vitest';

test('groups model credit costs into the four picker price levels', async () => {
  const { getPriceLevel } = await vi.importActual<{
    getPriceLevel: (creditCost: number) => number;
  }>('./modelPickerPrice');

  expect(getPriceLevel(0.5)).toBe(1);
  expect(getPriceLevel(1)).toBe(1);
  expect(getPriceLevel(2)).toBe(2);
  expect(getPriceLevel(3)).toBe(2);
  expect(getPriceLevel(8)).toBe(3);
  expect(getPriceLevel(9)).toBe(4);
});
