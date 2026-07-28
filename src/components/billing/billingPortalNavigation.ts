type CreatePortal = (args: {
  returnPath: string;
}) => Promise<{ url?: string | null } | null>;

export async function openBillingPortalNavigation({
  createPortal,
  returnPath,
  assign,
}: {
  createPortal: CreatePortal;
  returnPath: string;
  assign: (url: string) => void;
}) {
  const session = await createPortal({ returnPath });
  if (!session?.url) {
    throw new Error('Could not load billing portal.');
  }
  assign(session.url);
}
