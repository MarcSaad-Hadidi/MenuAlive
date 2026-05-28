import type { InterestLevel, TopDishInsight } from "@/lib/demoAdminInsights";

type AdminTopDishesProps = {
  dishes: TopDishInsight[];
};

const INTEREST_STYLES: Record<InterestLevel, string> = {
  "Très fort": "border-champagne/45 bg-champagne/12 text-champagne",
  Bon: "border-white/14 bg-white/[0.05] text-cream",
  "À observer": "border-[#c9a46f]/28 bg-[#c9a46f]/8 text-[#e3c99b]",
  "Plus discret": "border-white/12 bg-white/[0.035] text-[#b9aa94]"
};

export function AdminTopDishes({ dishes }: AdminTopDishesProps) {
  return (
    <section aria-labelledby="top-dishes-heading" className="space-y-5">
      <div>
        <h2 id="top-dishes-heading" className="font-display text-2xl text-cream">
          Ce qui attire les clients
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a99a86]">
          Les plats qui déclenchent le plus de consultations et de vues
          immersives.
        </p>
      </div>

      <div className="overflow-hidden rounded-[13px] border border-white/[0.14] bg-black/[0.08] shadow-[inset_0_1px_0_rgba(255,250,240,0.12)] backdrop-blur-sm">
        <div className="hidden grid-cols-[minmax(0,1.8fr)_0.45fr_0.6fr_0.55fr] gap-4 border-b border-white/[0.12] bg-black/10 px-5 py-4 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#9e8f7c] md:grid">
          <span>Plat</span>
          <span>Vues</span>
          <span>Vues immersives</span>
          <span>Intérêt</span>
        </div>

        <div className="divide-y divide-white/[0.07]">
          {dishes.map((item) => (
            <article
              key={item.dish.slug}
              className="grid gap-4 px-4 py-5 md:grid-cols-[minmax(0,1.8fr)_0.45fr_0.6fr_0.55fr] md:items-center md:px-5"
            >
              <div className="min-w-0">
                <h3 className="font-display text-lg leading-snug text-cream [overflow-wrap:anywhere]">
                  {item.dish.name}
                </h3>
                <p className="mt-1 text-xs text-[#8f806e]">
                  {item.category.name}
                </p>
              </div>

              <Metric label="Vues" value={item.views.toString()} />
              <Metric
                label="Vues immersives"
                value={item.immersiveInteractions.toString()}
              />
              <div>
                <span className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#7f705f] md:hidden">
                  Intérêt
                </span>
                <span
                  className={`inline-flex min-h-8 max-w-full items-center rounded-full border px-3 text-xs font-semibold ${INTEREST_STYLES[item.interestLevel]}`}
                >
                  {item.interestLevel}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#7f705f] md:hidden">
        {label}
      </span>
      <span className="font-display text-xl tabular-nums text-cream md:text-lg">
        {value}
      </span>
    </div>
  );
}
