type EarlyAdopterHeroProps = {
  onApplyClick: () => void;
  onBenefitsClick: () => void;
};

export function EarlyAdopterHero({ onApplyClick, onBenefitsClick }: EarlyAdopterHeroProps) {
  return (
    <section className="text-center w-full max-w-4xl mx-auto px-5 sm:px-6 min-h-[100svh] flex flex-col justify-center items-center">
      <div className="max-w-2xl mx-auto flex flex-col items-center pt-12 pb-24">
        <h1 className="font-title text-[40px] sm:text-5xl font-normal leading-tight tracking-tight text-zinc-950 dark:text-white md:text-6xl">
          Early Adopters
        </h1>
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-lg">
          Deploy AI agents on WhatsApp, Instagram, and Messenger. Get three months of our Growth plan free in exchange for early feedback.
        </p>
        <div className="mt-8 flex flex-row items-center gap-3 sm:gap-3.5 w-full sm:w-auto max-w-sm justify-center">
          <button
            type="button"
            onClick={onApplyClick}
            className="inline-flex h-11 flex-1 sm:flex-none sm:w-auto items-center justify-center gap-2 rounded-full bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 px-4 sm:px-6 text-sm font-semibold transition-colors cursor-pointer shadow-sm"
          >
            Apply now
          </button>
          <button
            type="button"
            onClick={onBenefitsClick}
            className="inline-flex h-11 flex-1 sm:flex-none sm:w-auto items-center justify-center gap-2 rounded-full border border-zinc-200 bg-transparent px-4 sm:px-6 text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-50 dark:border-white/20 dark:text-white dark:hover:bg-white/5 cursor-pointer"
          >
            See benefits
          </button>
        </div>
      </div>
    </section>
  );
}
