type PageTitleBlockProps = {
  title: string;
  description: string;
};

export function PageTitleBlock({
  title,
  description,
}: PageTitleBlockProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="m-0 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
