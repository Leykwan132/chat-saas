import { PlanAdvancedAnalyticsHoverHint } from './PlanAdvancedAnalyticsHoverHint';
import { PlanAutoLeadTaggingHoverHint } from './PlanAutoLeadTaggingHoverHint';
import { PlanChannelsHoverHint } from './PlanChannelsHoverHint';
import { PlanDescriptionHoverHint } from './PlanDescriptionHoverHint';
import { PlanKnowledgeBaseHoverHint } from './PlanKnowledgeBaseHoverHint';
import { PlanModelsHoverHint } from './PlanModelsHoverHint';
import {
  isAutoLeadTaggingLabel,
  isChannelLimitLabel,
  isChannelsComparisonLabel,
  isKnowledgeBaseLimitLabel,
  isPlanFeatureDescriptionHoverLabel,
  isPlanModelAccessLabel,
  isTopicAnalyticsLabel,
  type PlanKey,
} from '../../../shared/planCatalog';
import { pricingFeatureTextClass } from './pricingStyles';

export function renderPricingFeatureLabel(
  text: string,
  planId: PlanKey | undefined,
  isEnterprise: boolean,
) {
  const className = pricingFeatureTextClass(isEnterprise);

  if (planId && isPlanModelAccessLabel(text)) {
    return <PlanModelsHoverHint planId={planId} label={text} className={className} />;
  }

  if (isKnowledgeBaseLimitLabel(text)) {
    return <PlanKnowledgeBaseHoverHint label={text} className={className} />;
  }

  if (isAutoLeadTaggingLabel(text)) {
    return <PlanAutoLeadTaggingHoverHint label={text} className={className} />;
  }

  if (isPlanFeatureDescriptionHoverLabel(text)) {
    return <PlanDescriptionHoverHint label={text} className={className} />;
  }

  if (isChannelLimitLabel(text) || isChannelsComparisonLabel(text)) {
    return <PlanChannelsHoverHint label={text} className={className} />;
  }

  if (isTopicAnalyticsLabel(text)) {
    return <PlanAdvancedAnalyticsHoverHint label={text} className={className} />;
  }

  return text;
}

export function renderPricingComparisonRowLabel(label: string) {
  const className = 'text-sm font-medium text-muted-foreground';

  if (isAutoLeadTaggingLabel(label)) {
    return <PlanAutoLeadTaggingHoverHint label={label} className={className} />;
  }

  if (isPlanFeatureDescriptionHoverLabel(label)) {
    return <PlanDescriptionHoverHint label={label} className={className} />;
  }

  if (isChannelsComparisonLabel(label)) {
    return <PlanChannelsHoverHint label={label} className={className} />;
  }

  if (isTopicAnalyticsLabel(label)) {
    return <PlanAdvancedAnalyticsHoverHint label={label} className={className} />;
  }

  return <span className="leading-snug">{label}</span>;
}
