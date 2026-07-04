import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { EarlyAdopterApplicationForm } from '@/components/early-adopter/EarlyAdopterApplicationForm';
import { EarlyAdopterBenefits } from '@/components/early-adopter/EarlyAdopterBenefits';
import { EarlyAdopterFaqSection } from '@/components/early-adopter/EarlyAdopterFaqSection';
import { EarlyAdopterHero } from '@/components/early-adopter/EarlyAdopterHero';

export default function EarlyUserPage() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex min-h-[100svh] flex-col overflow-x-clip bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-[#060606] dark:text-zinc-100 selection:bg-zinc-200 dark:selection:bg-zinc-800">
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col pb-24">
        <EarlyAdopterHero
          onApplyClick={() => scrollToSection('apply-form')}
          onBenefitsClick={() => scrollToSection('benefits')}
        />
        <div className="mx-auto box-border w-full max-w-4xl shrink-0 px-5 sm:px-6">
          <EarlyAdopterBenefits />
          <EarlyAdopterFaqSection />
          <EarlyAdopterApplicationForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
