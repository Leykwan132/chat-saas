import type { InboxHandlingFilter } from "../../../shared/inboxHandling";
import { PiRobot } from "react-icons/pi";
import {
  AlertCircle,
  Globe,
  LayoutGrid,
  ListFilter,
  MailOpen,
  MessageSquareDot,
  ScanFace,
  User,
  UserX,
} from "lucide-react";
import { SiInstagram, SiMessenger, SiWhatsapp } from "react-icons/si";
import { BookedCheckIcon } from "@/components/booking/BookingDetailsPanel";
import { getPlatformIconClassName } from "@/lib/platformIconStyles";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AssignmentFilter } from "./InboxFilterSidebar";
import type { ConversationPlatform } from "@/components/ChatRow";

type Props = {
  assignment: AssignmentFilter | "read";
  handling?: InboxHandlingFilter;
  onHandlingChange?: (filter: InboxHandlingFilter) => void;
  onAssignmentChange: (filter: AssignmentFilter | "read") => void;
  escalated: boolean;
  onEscalatedChange: (active: boolean) => void;
  booked: boolean;
  onBookedChange: (active: boolean) => void;
  platforms: ConversationPlatform[];
  selectedPlatforms: ConversationPlatform[];
  onTogglePlatform: (platform: ConversationPlatform) => void;
};
const platformLabels: Record<ConversationPlatform, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
  web: "Web",
  avatar: "Avatar",
};

const platformIcons = {
  whatsapp: SiWhatsapp,
  instagram: SiInstagram,
  messenger: SiMessenger,
  web: Globe,
  avatar: ScanFace,
};

export function InboxFocusFilters({
  assignment,
  handling = "all",
  onHandlingChange,
  onAssignmentChange,
  escalated,
  onEscalatedChange,
  booked,
  onBookedChange,
  platforms,
  selectedPlatforms,
  onTogglePlatform,
}: Props) {
  return (
    <div
      className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-2"
      aria-label="Conversation filters"
    >
      {(
        [
          ["all", "All", LayoutGrid],
          ["unread", "Unread", MessageSquareDot],
          ["read", "Read", MailOpen],
        ] as const
      ).map(([value, label, Icon]) => (
        <Button
          key={value}
          size="sm"
          className="h-11 min-w-11 md:h-8"
          variant={assignment === value ? "secondary" : "ghost"}
          aria-pressed={assignment === value}
          onClick={() => onAssignmentChange(value)}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {label}
        </Button>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto size-11 md:size-8"
            aria-label="More conversation filters"
          >
            <ListFilter className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="[&_[data-slot=dropdown-menu-checkbox-item]]:min-h-11 md:[&_[data-slot=dropdown-menu-checkbox-item]]:min-h-0"
        >
          {onHandlingChange ? (
            <>
              <DropdownMenuLabel>Handling</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={handling === "ai"}
                onCheckedChange={(checked) =>
                  onHandlingChange(checked ? "ai" : "all")
                }
              >
                <PiRobot className="size-4" aria-hidden="true" />
                AI handling
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={handling === "human"}
                onCheckedChange={(checked) =>
                  onHandlingChange(checked ? "human" : "all")
                }
              >
                <User className="size-4" aria-hidden="true" />
                Human handling
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuLabel>Assignment</DropdownMenuLabel>
          {(
            [
              ["assigned_me", "Assigned to me", User],
              ["unassigned", "Unassigned", UserX],
            ] as const
          ).map(([value, label, Icon]) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={assignment === value}
              onCheckedChange={(checked) =>
                onAssignmentChange(checked ? value : "all")
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={escalated}
            onCheckedChange={onEscalatedChange}
          >
            <AlertCircle className="size-4" aria-hidden="true" />
            Escalated
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={booked}
            onCheckedChange={onBookedChange}
          >
            <BookedCheckIcon size="sm" />
            Booked
          </DropdownMenuCheckboxItem>
          {platforms.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Platform</DropdownMenuLabel>
              {platforms.map((platform) => {
                const Icon = platformIcons[platform];
                return (
                  <DropdownMenuCheckboxItem
                    key={platform}
                    checked={selectedPlatforms.includes(platform)}
                    onCheckedChange={() => onTogglePlatform(platform)}
                  >
                    <Icon
                      className={`size-4 shrink-0 ${getPlatformIconClassName(platform)}`}
                      aria-hidden="true"
                    />
                    {platformLabels[platform]}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
