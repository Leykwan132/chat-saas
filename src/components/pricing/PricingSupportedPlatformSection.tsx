import { SUPPORTED_PLATFORM_HOVER_LABEL } from '../../../shared/planCatalog';
import { pricingSquareBulletClass } from './pricingStyles';

type PricingSupportedPlatformSectionProps = {
  platforms: readonly string[];
};

export function PricingSupportedPlatformSection({
  platforms,
}: PricingSupportedPlatformSectionProps) {
  return (
    <div className="mt-3">
      <p className="text-sm font-medium text-foreground">{SUPPORTED_PLATFORM_HOVER_LABEL}</p>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        {platforms.map((platform) => (
          <li key={platform} className="flex items-start gap-2">
            <span className={pricingSquareBulletClass} aria-hidden />
            <span>{platform}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
