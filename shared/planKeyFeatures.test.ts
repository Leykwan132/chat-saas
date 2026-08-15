import { expect, test } from 'vitest';
import {
  AI_LEAD_TEMPERATURE_LABEL,
  getPlanKeyFeatures,
  TOPIC_ANALYTICS_LABEL,
} from './planCatalog';

test('compact pricing cards surface AI Lead Temperature only on Growth', () => {
  expect(getPlanKeyFeatures('free')).not.toContain(AI_LEAD_TEMPERATURE_LABEL);
  expect(getPlanKeyFeatures('starter')).not.toContain(AI_LEAD_TEMPERATURE_LABEL);
  expect(getPlanKeyFeatures('business')).not.toContain(AI_LEAD_TEMPERATURE_LABEL);

  const growthFeatures = getPlanKeyFeatures('growth');

  expect(growthFeatures).toContain(AI_LEAD_TEMPERATURE_LABEL);
  expect(growthFeatures.indexOf(AI_LEAD_TEMPERATURE_LABEL)).toBeLessThan(
    growthFeatures.indexOf(TOPIC_ANALYTICS_LABEL),
  );
});
