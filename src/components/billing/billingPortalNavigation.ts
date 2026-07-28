type CreatePortal = (args: {
  returnPath: string;
}) => Promise<{ url?: string | null } | null>;

type BillingPortalWindow = {
  opener: unknown;
  location: {
    assign: (url: string) => void;
  };
  close: () => void;
};

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

export async function openBillingPortalInNewWindow({
  createPortal,
  returnPath,
  openWindow,
}: {
  createPortal: CreatePortal;
  returnPath: string;
  openWindow: () => BillingPortalWindow | null;
}) {
  const portalWindow = openWindow();
  if (!portalWindow) {
    throw new Error('Allow pop-ups to manage billing.');
  }
  portalWindow.opener = null;
  try {
    await openBillingPortalNavigation({
      createPortal,
      returnPath,
      assign: (url) => portalWindow.location.assign(url),
    });
  } catch (error) {
    portalWindow.close();
    throw error;
  }
}
