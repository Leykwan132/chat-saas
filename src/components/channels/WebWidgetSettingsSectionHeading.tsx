import type { ReactNode } from "react";

type WebWidgetSettingsSectionHeadingProps = {
  title: string;
  description: string;
  badge?: ReactNode;
};

export function WebWidgetSettingsSectionHeading({
  title,
  description,
  badge,
}: WebWidgetSettingsSectionHeadingProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-medium tracking-tight text-foreground">
          {title}
        </h3>
        {badge}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
