import { expect, test } from "vitest";
import { formatHumanEscalationMessage } from "../../shared/telegramNotificationMessages";
import { escalationInboxUrl } from "./escalationMessage";

test("human escalation message uses the workspace hostname and includes the request", () => {
  const openUrl = escalationInboxUrl(
    "https://chat.gosolutions.sg",
    "agent-1",
    "conversation-1",
  );
  const message = formatHumanEscalationMessage({
    agentName: "Support Agent",
    customerName: "Alicia Tan",
    contact: "alicia@example.com",
    channel: "WhatsApp",
    latestMessage: "I need a person to change my booking.",
    question: "Customer wants the Thursday appointment moved.",
    context: "The requested Thursday slot is already taken.",
    openUrl,
  });

  expect(openUrl).toBe(
    "https://chat.gosolutions.sg/dashboard/agent-1/inbox?conversation=conversation-1",
  );
  expect(message).toContain("Customer: Alicia Tan");
  expect(message).toContain("Contact: alicia@example.com");
  expect(message).toContain("Channel: WhatsApp");
  expect(message).toContain("Latest message: I need a person to change my booking.");
  expect(message).toContain("Needs help: Customer wants the Thursday appointment moved.");
  expect(message).toContain("Context: The requested Thursday slot is already taken.");
  expect(message).toContain(`Open chat: ${openUrl}`);
});

test('opens WhatsApp using the known phone when Meta supplies a private user ID', async () => {
  const { notificationConversationUrl } = await import('./escalationMessage');
  expect(notificationConversationUrl('https://chat.example.com', 'agent-1', {
    _id: 'conversation-1' as never, service: 'whatsapp', contactAddress: 'US.13491208655302741918',
  }, {
    service: 'whatsapp', contactAddress: 'US.13491208655302741918', phone: '+1 (650) 555-1111',
  })).toBe('https://wa.me/16505551111');
});

test('does not turn a private WhatsApp ID into a different phone number', async () => {
  const { notificationConversationUrl } = await import('./escalationMessage');
  expect(() => notificationConversationUrl('https://chat.example.com', 'agent-1', {
    _id: 'conversation-1' as never, service: 'whatsapp', contactAddress: 'US.13491208655302741918',
  }, null)).toThrow('Customer WhatsApp phone number or username is required');
});

test('opens a WhatsApp username when the customer has no phone number', async () => {
  const { notificationConversationUrl } = await import('./escalationMessage');
  expect(notificationConversationUrl('https://chat.example.com', 'agent-1', {
    _id: 'conversation-1' as never, service: 'whatsapp', contactAddress: 'US.13491208655302741918',
  }, {
    service: 'whatsapp', contactAddress: 'US.13491208655302741918', whatsappUsername: '@alicia.tan',
  })).toBe('https://wa.me/alicia.tan');
});
