import type { EngagementFunnelStep } from "@/lib/demoAdminInsights";

type AdminEngagementFunnelProps = {
  steps: EngagementFunnelStep[];
};

export function AdminEngagementFunnel({ steps }: AdminEngagementFunnelProps) {
  return (
    <section
      aria-labelledby="engagement-funnel-heading"
      className="rounded-xl border border-white/10 bg-[#090705]/88 p-5 shadow-[0_16px_52px_rgba(0,0,0,0.24)] sm:p-6"
    >
      <h2 id="engagement-funnel-heading" className="font-display text-2xl text-cream">
        Chemin de lecture du menu
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#a99a86]">
        Du menu ouvert jusqu&apos;à la vue immersive, pour lire l&apos;attention réelle.
      </p>

      <div className="mt-7 space-y-4">
        {steps.map((step) => (
          <article key={step.id} className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold text-cream">{step.label}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#8f806e]">
                  {step.helper}
                </p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="font-display text-2xl tabular-nums text-champagne">
                  {step.value}
                </p>
                <p className="text-xs text-[#8f806e]">{step.share} %</p>
              </div>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-champagne/60 to-[#f0d396]"
                style={{ width: `${Math.min(100, Math.max(0, step.share))}%` }}
                aria-hidden
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
