import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { PartnerCustomerList } from "./PartnerCustomerList";

export type OrganizationUsersProps = ComponentProps<typeof PartnerCustomerList>;

export function PartnerOrganizationRow({
  organizationId,
  name,
  children,
  customerListProps,
}: {
  organizationId: string;
  name: string;
  children: ReactNode;
  customerListProps: OrganizationUsersProps;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const customers = customerListProps.customers.filter(
    (customer) => customer.partnerOrganizationId === organizationId,
  );

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={(event) => {
          if (
            (event.target as HTMLElement).closest(
              "button, input, a, [role=combobox]",
            )
          )
            return;
          setExpanded((value) => !value);
        }}
      >
        <TableCell className="font-medium">
          <Button
            variant="ghost"
            className="h-auto justify-start gap-2 px-0 text-sm"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((value) => !value)}
          >
            <ChevronRight
              className={
                expanded
                  ? "size-4 rotate-90 transition-transform"
                  : "size-4 transition-transform"
              }
            />
            {name}
          </Button>
        </TableCell>
        {children}
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/15 hover:bg-muted/15">
          <TableCell colSpan={10} className="p-4">
            <div id={detailsId} aria-label={`Users in ${name}`}>
              <PartnerCustomerList
                {...customerListProps}
                customers={customers}
                embedded
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
