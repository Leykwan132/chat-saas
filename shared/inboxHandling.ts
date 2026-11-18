export type InboxHandling = "ai" | "human" | "attention";
export type InboxHandlingFilter = "all" | "ai" | "human";

export function matchesInboxHandling(
  handling: InboxHandling | undefined,
  filter: InboxHandlingFilter,
) {
  return (
    filter === "all" ||
    (filter === "ai"
      ? handling === "ai"
      : handling === "human" || handling === "attention")
  );
}
