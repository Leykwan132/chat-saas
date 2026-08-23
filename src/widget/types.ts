export type WidgetConfig = {
  agentDisplayName: string;
  teamName: string;
  theme: "dark" | "light";
  suggestions: string[];
  suggestionsEnabled: boolean;
  poweredBy: boolean;
  iconUrl?: string;
  home: {
    greeting: string;
    introduction: string;
    availabilityText: string;
    replyTimeText: string;
  };
  leadForm: {
    enabled: boolean;
    heading: string;
    description: string;
    submitLabel: string;
    fields: Record<
      "name" | "email" | "phone",
      { visible: boolean; required: boolean }
    >;
    customFields: Array<{
      id: string;
      label: string;
      type: "text" | "select";
      options: string[];
      required: boolean;
    }>;
  };
};

export type WidgetVisitorProfile = {
  name: string;
  email: string;
  phone: string;
  customFields: Record<string, string>;
};

export type WidgetMessage = {
  id: string;
  direction: "incoming" | "outgoing";
  sender: "visitor" | "ai" | "team";
  senderName?: string;
  content: string;
  createdAt: number;
};

export type WidgetScreen = "closed" | "form" | "chat";
