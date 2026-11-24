import { PartnerCustomersTab } from "@/components/partner/PartnerCustomersTab";
import { useAction, useMutation, useQuery } from "convex/react";
import { LayoutDashboard, Palette, Users } from "lucide-react";
import { toast } from "sonner";
import { PartnerBrandingTab } from "@/components/partner/PartnerBrandingTab";
import { PartnerOverviewTab } from "@/components/partner/PartnerOverviewTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { whiteLabelApi } from "@/lib/whiteLabelApi";

export default function PartnerPage() {
  const partner = useQuery(whiteLabelApi.portal.getCurrentPartner);
  const overview = useQuery(
    whiteLabelApi.portal.getOverview,
    partner ? {} : "skip",
  );
  const generateLogoUploadUrl = useMutation(
    whiteLabelApi.portal.generateLogoUploadUrl,
  );
  const updateBrand = useMutation(whiteLabelApi.portal.updateBranding);
  const createCustomHostname = useAction(whiteLabelApi.customHostnames.create);
  const restartCustomHostname = useAction(
    whiteLabelApi.customHostnames.restart,
  );
  const confirmOwnershipDns = useMutation(
    whiteLabelApi.customHostnames.confirmOwnershipDns,
  );
  const confirmDelegatedDcvDns = useMutation(
    whiteLabelApi.customHostnames.confirmDelegatedDcvDns,
  );
  const checkCertificateAgain = useMutation(
    whiteLabelApi.customHostnames.checkCertificateAgain,
  );
  const confirmCutoverDns = useMutation(
    whiteLabelApi.customHostnames.confirmCutoverDns,
  );
  if (partner === undefined) {
    return <PortalState>Loading partner portal…</PortalState>;
  }

  if (partner === null) {
    return (
      <PortalState>
        Partner access is not available in this workspace.
      </PortalState>
    );
  }

  const run = async <Result,>(work: () => Promise<Result>, success: string) => {
    try {
      const result = await work();
      toast.success(success);
      return result;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to complete this request.",
      );
      return null;
    }
  };

  const uploadLogo = (file: File) =>
    run(async () => {
      if (!file.type.startsWith("image/")) {
        throw new Error("Choose an image file for the logo.");
      }
      const uploadUrl = await generateLogoUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Logo upload failed.");
      const result = (await response.json()) as { storageId: string };
      await updateBrand({
        name: partner.name,
        logoStorageId: result.storageId,
      });
    }, "Logo updated.");

  return (
    <main className="mx-auto w-full max-w-7xl p-5 sm:p-8">
      <div className="flex flex-col gap-2 sm:pl-48">
        <h1 className="text-3xl font-semibold tracking-tight">
          Partner Programme
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage customer organizations, users, credits, and your portal
          branding.
        </p>
      </div>
      <Tabs
        defaultValue="overview"
        orientation="vertical"
        className="mt-8 gap-8"
      >
        <TabsList className="w-40 shrink-0 items-stretch rounded-none bg-transparent p-0">
          <TabsTrigger
            value="overview"
            className="rounded-md px-3 py-2.5 text-muted-foreground data-active:bg-transparent data-active:font-semibold data-active:text-foreground after:hidden hover:bg-accent hover:text-foreground"
          >
            <LayoutDashboard data-icon="inline-start" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="rounded-md px-3 py-2.5 text-muted-foreground data-active:bg-transparent data-active:font-semibold data-active:text-foreground after:hidden hover:bg-accent hover:text-foreground"
          >
            <Users data-icon="inline-start" />
            Customers
          </TabsTrigger>
          <TabsTrigger
            value="branding"
            className="rounded-md px-3 py-2.5 text-muted-foreground data-active:bg-transparent data-active:font-semibold data-active:text-foreground after:hidden hover:bg-accent hover:text-foreground"
          >
            <Palette data-icon="inline-start" />
            Branding
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <PartnerOverviewTab overview={overview} />
        </TabsContent>
        <TabsContent value="customers">
          <PartnerCustomersTab overview={overview} />
        </TabsContent>
        <TabsContent value="branding">
          <PartnerBrandingTab
            partner={partner}
            onNameSave={(name) =>
              run(() => updateBrand({ name }), "Brand name updated.")
            }
            onPageTitleSave={(pageTitle) =>
              run(
                () => updateBrand({ name: partner.name, pageTitle }),
                "Browser tab title updated.",
              )
            }
            onLogoUpload={uploadLogo}
            onCreateCustomHostname={(hostname) =>
              run(
                () => createCustomHostname({ hostname }),
                "Custom hostname created. Add the ownership record to continue.",
              )
            }
            onConfirmOwnershipDns={() =>
              run(() => confirmOwnershipDns({}), "Checking ownership DNS.")
            }
            onConfirmDelegatedDcvDns={() =>
              run(() => confirmDelegatedDcvDns({}), "Checking certificate DNS.")
            }
            onCheckCertificateAgain={() =>
              run(
                () => checkCertificateAgain({}),
                "Checking certificate readiness again.",
              )
            }
            onConfirmCutoverDns={() =>
              run(
                () => confirmCutoverDns({}),
                "Checking your custom domain connection.",
              )
            }
            onRestartCustomHostname={() =>
              run(
                () => restartCustomHostname({}),
                "Custom hostname removed. You can enter a new domain.",
              )
            }
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function PortalState({ children }: { children: string }) {
  return <main className="p-8 text-sm text-muted-foreground">{children}</main>;
}
