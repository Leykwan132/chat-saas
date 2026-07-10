import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Spinner } from '@/components/ui/spinner';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { ModelIcon, Tencent } from '@lobehub/icons';
import {
  ModelLeaderboardPanel,
  ModelLeaderboardSkeleton,
} from '@/components/analytics/ModelLeaderboardPanel';

function ModelLogo({
  model,
  imageUrl,
  size = 20,
}: {
  model: string;
  imageUrl?: string;
  size?: number;
}) {
  if (imageUrl) {
    return (
      <img
        alt=""
        className="select-none object-contain"
        height={size}
        src={imageUrl}
        width={size}
      />
    );
  }

  if (model.startsWith('tencent/')) {
    return <Tencent.Color className="select-none" size={size} />;
  }

  return (
    <ModelIcon
      model={model}
      size={size}
      type="color"
      className="select-none"
    />
  );
}

export default function LeaderboardPage() {
  const aggregates = useQuery(api.agentUsage.getLifetimeModelUsage);
  const monthlyAggregates = useQuery(api.agentUsage.getMonthlyUsageAggregates);
  const supportedModels = useQuery(api.llm.modelPricing.listEnabled);

  const isLoading = aggregates === undefined || monthlyAggregates === undefined;

  return (
    <div className="min-h-[100svh] bg-zinc-50 dark:bg-[#060606] font-sans text-zinc-900 dark:text-zinc-100 antialiased selection:bg-zinc-200 dark:selection:bg-zinc-800 selection:text-zinc-900 dark:selection:text-zinc-50 flex flex-col justify-between">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 pt-20 pb-12 sm:px-6 sm:pt-24 sm:pb-16">
        <div className="animate-fade-in flex flex-col items-center justify-center gap-2 py-32 text-center">
          <h1 className="m-0 font-title text-4xl font-normal tracking-tight text-zinc-950 dark:text-white sm:text-5xl">
            Model Leaderboard
          </h1>
          <p className="mt-1 max-w-xl text-sm font-medium text-zinc-500 dark:text-zinc-400 sm:text-base">
            Platform-wide token spend across every model and agent.
          </p>
        </div>

        {isLoading ? (
          <ModelLeaderboardSkeleton />
        ) : (
          <>
            <ModelLeaderboardPanel
              aggregates={aggregates}
              monthlyAggregates={monthlyAggregates}
              supportedModels={supportedModels}
            />

            <Accordion type="single" collapsible className="w-full animate-fade-in">
              <AccordionItem
                value="supported-models"
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.02]"
              >
                <AccordionTrigger className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-zinc-900 hover:no-underline sm:text-base dark:text-white">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 font-mono text-sm font-bold text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.08] dark:text-zinc-100">
                      {supportedModels?.length || 0}
                    </span>
                    <span>Supported LLM Models</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  {supportedModels === undefined ? (
                    <div className="flex justify-center py-6">
                      <Spinner className="size-5 text-muted-foreground" />
                    </div>
                  ) : supportedModels.length === 0 ? (
                    <div className="py-2 text-sm text-muted-foreground">
                      No supported models configured.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2 lg:grid-cols-3">
                      {supportedModels.map((model) => (
                        <div
                          key={model.value}
                          className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/30 p-3 transition-colors duration-200 hover:bg-zinc-50 dark:border-white/[0.04] dark:bg-white/[0.005] dark:hover:bg-white/[0.01]"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200/80 bg-white dark:border-white/[0.08] dark:bg-zinc-950">
                            <ModelLogo model={model.value} imageUrl={model.imageUrl} />
                          </div>
                          <div className="flex min-w-0 flex-col leading-tight">
                            <span className="truncate text-[13px] font-semibold text-zinc-900 dark:text-white">
                              {model.label}
                            </span>
                            <span className="mt-0.5 text-[10px] text-zinc-500">
                              by{' '}
                              <span className="font-medium text-zinc-600 dark:text-zinc-300">
                                {model.chef}
                              </span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
