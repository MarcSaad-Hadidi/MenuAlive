import type { SearchInsight } from "@/lib/demoAdminInsights";

type AdminSearchInsightsProps = {
  searches: SearchInsight[];
};

export function AdminSearchInsights({ searches }: AdminSearchInsightsProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#090705]/88 p-5 shadow-[0_16px_52px_rgba(0,0,0,0.24)] sm:p-6">
      <h3 className="font-display text-xl text-cream">Recherches clients</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#a99a86]">
        Les mots qui reviennent quand les clients explorent la carte.
      </p>

      <div className="mt-5 space-y-3">
        {searches.map((search) => (
          <article
            key={search.term}
            className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h4 className="text-base font-semibold text-cream [overflow-wrap:anywhere]">
                  {search.term}
                </h4>
                {search.interpretation ? (
                  <p className="mt-1 text-sm leading-relaxed text-[#b9aa94] [overflow-wrap:anywhere]">
                    {search.interpretation}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 font-display text-xl tabular-nums text-champagne sm:text-right">
                {search.count}
                <span className="ml-1 font-sans text-xs text-[#8f806e]">
                  recherche{search.count > 1 ? "s" : ""}
                </span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
