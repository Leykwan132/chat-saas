import { SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";

export function whatsappChatUrl(phone?: string | null) {
  const value = phone?.trim();
  if (!value || !/^\+?[\d\s().-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export function InboxWhatsAppButton({ phone }: { phone?: string | null }) {
  const url = whatsappChatUrl(phone);
  const contents = (
    <>
      <SiWhatsapp className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">Open in WhatsApp</span>
    </>
  );
  return url ? (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="ml-auto shrink-0 text-emerald-700 md:hidden dark:text-emerald-400"
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open in WhatsApp"
      >
        {contents}
      </a>
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      disabled
      aria-label="Open in WhatsApp"
      title="A WhatsApp phone number is required"
      className="ml-auto shrink-0 md:hidden"
    >
      {contents}
    </Button>
  );
}
