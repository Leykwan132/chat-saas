import { useState } from 'react';
import { pricingFaqs } from '@/content/pricingFaqs';
import { cn } from '@/lib/utils';

export function PricingFaqSection() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="scroll-mt-28 pt-8">
      <h2 className="font-title text-[38px] sm:text-4xl font-normal text-zinc-950 dark:text-white mb-10 text-center">
        FAQ
      </h2>
      <div className="max-w-2xl mx-auto border-t border-zinc-200 dark:border-white/[0.08]">
        {pricingFaqs.map((faq, idx) => {
          const isOpen = openFaqIndex === idx;
          return (
            <div key={faq.question} className="border-b border-zinc-200 dark:border-white/[0.08] py-4 text-left">
              <button
                type="button"
                onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                className="w-full flex justify-between items-center text-left py-2.5 font-medium text-zinc-950 dark:text-white text-base sm:text-lg focus:outline-none cursor-pointer group"
              >
                <span className="group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">{faq.question}</span>
                <span className="text-zinc-400 dark:text-zinc-500 text-xl font-light ml-4 select-none group-hover:text-zinc-650 dark:group-hover:text-zinc-300 transition-colors">
                  {isOpen ? '−' : '＋'}
                </span>
              </button>
              <div className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out text-sm text-zinc-500 dark:text-zinc-400 mt-1",
                isOpen ? "max-h-40 pb-3 opacity-100" : "max-h-0 opacity-0"
              )}>
                <p className="leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
