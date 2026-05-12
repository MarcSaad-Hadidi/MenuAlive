import type { AdminSummaryMetric } from "@/lib/demoAdminInsights";

type AdminInsightCardProps = {
  metric: AdminSummaryMetric;
};

export function AdminInsightCard({ metric }: AdminInsightCardProps) {
  return (
    <article className="rounded-xl border border-white/10 bg-gradient-to-br from-[#14100d]/96 via-[#0d0a08]/98 to-[#070504] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <p className="text-[0.68rem] font-semibold uppercase leading-relaxed tracking-[0.18em] text-champagne/80">
        {metric.label}
      </p>
      <p className="mt-4 font-display text-[2rem] leading-none text-cream [overflow-wrap:anywhere] sm:text-[2.35rem]">
        {metric.value}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#a99a86]">
        {metric.helper}
      </p>
    </article>
  );
}
