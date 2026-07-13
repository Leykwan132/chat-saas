export function DirectContactDetails() {
  return (
    <div className="mt-8 max-w-md border-t border-zinc-200 pt-6 dark:border-white/[0.08]">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        If you prefer to reach out directly, here are the details.
      </p>
      <div className="mt-3 flex flex-col items-start gap-2">
        <a
          href="mailto:support@kilobot.app"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          support@kilobot.app
        </a>
        <a
          href="tel:+60129499394"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          +60129499394 (Kwan)
        </a>
      </div>
    </div>
  );
}
