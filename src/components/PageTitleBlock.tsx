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
      <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
        {title}
      </h1>
      <p className="m-0 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
