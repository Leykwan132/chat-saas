import { useState } from "react";
import { useQuery } from "convex/react";
import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  PartnerLimitInput,
  PartnerModelSelect,
  PartnerPlanSelect,
} from "@/components/partner/PartnerCustomerControls";
import { PartnerPlanDetails } from "@/components/partner/PartnerPlanDetails";
import { PLAN_CATALOG } from "../../../shared/planCatalog";
import { catalogMaxAgents } from "../../../shared/partnerEntitlementLimits";
import { DEFAULT_AGENT_MODEL } from "../../../shared/agentModelDefaults";
import { type PlanKey, whiteLabelApi } from "@/lib/whiteLabelApi";

export function PartnerCreateOrganizationDialog({
  organizationName,
  organizationPlan,
  isCreating,
  onOrganizationNameChange,
  onOrganizationPlanChange,
  onCreate,
}: {
  organizationName: string;
  organizationPlan: PlanKey;
  isCreating: boolean;
  onOrganizationNameChange: (value: string) => void;
  onOrganizationPlanChange: (value: PlanKey) => void;
  onCreate: (limits: {
    maxAgents: number;
    monthlyCredits: number;
    modelId: string;
  }) => Promise<boolean>;
}) {
  const models = useQuery(whiteLabelApi.portal.listEnabledAgentModels);
  const [open, setOpen] = useState(false);
  const [maxAgents, setMaxAgents] = useState(
    catalogMaxAgents(organizationPlan),
  );
  const [monthlyCredits, setMonthlyCredits] = useState(
    PLAN_CATALOG[organizationPlan].monthlyCredits,
  );
  const [modelId, setModelId] = useState(DEFAULT_AGENT_MODEL);

  const changePlan = (planKey: PlanKey) => {
    onOrganizationPlanChange(planKey);
    setMaxAgents(catalogMaxAgents(planKey));
    setMonthlyCredits(PLAN_CATALOG[planKey].monthlyCredits);
  };

  const handleCreate = async () => {
    if (await onCreate({ maxAgents, monthlyCredits, modelId })) {
      setOpen(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setMaxAgents(catalogMaxAgents(organizationPlan));
          setMonthlyCredits(PLAN_CATALOG[organizationPlan].monthlyCredits);
          setModelId(DEFAULT_AGENT_MODEL);
        }
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="relative h-36 w-full flex-col items-start justify-start gap-3 rounded-lg px-6 py-5 text-left shadow-none has-data-[icon=inline-start]:pl-6"
        >
          <Building2 data-icon="inline-start" />
          <span className="font-heading text-base font-medium">
            Create organization
          </span>
          <span className="max-w-48 text-sm text-muted-foreground whitespace-normal">
            Start a workspace and choose its plan.
          </span>
          <ArrowRight
            data-icon="inline-end"
            className="absolute bottom-5 right-6"
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-lg border border-border shadow-none ring-0">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Agents, monthly credits, and model override the selected plan for
            this organization.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="organization-name">
              Organization name
            </FieldLabel>
            <Input
              id="organization-name"
              value={organizationName}
              onChange={(event) =>
                onOrganizationNameChange(event.target.value)
              }
              placeholder="Customer organization"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="organization-plan">Plan</FieldLabel>
            <PartnerPlanSelect
              id="organization-plan"
              value={organizationPlan}
              onValueChange={changePlan}
            />
            <PartnerPlanDetails planKey={organizationPlan} />
          </Field>
          <Field>
            <FieldLabel htmlFor="organization-agents">Agents</FieldLabel>
            <PartnerLimitInput
              id="organization-agents"
              value={maxAgents}
              onValueChange={setMaxAgents}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="organization-credits">
              Monthly credits
            </FieldLabel>
            <PartnerLimitInput
              id="organization-credits"
              value={monthlyCredits}
              onValueChange={setMonthlyCredits}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="organization-model">Model</FieldLabel>
            <PartnerModelSelect
              id="organization-model"
              value={modelId}
              models={models}
              onValueChange={setModelId}
            />
          </Field>
        </FieldGroup>
        <DialogFooter className="justify-end gap-2">
          <Button
            disabled={isCreating}
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          <Button
            disabled={!organizationName.trim() || isCreating}
            onClick={() => void handleCreate()}
          >
            {isCreating ? <Spinner data-icon="inline-start" /> : null}
            Create organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
