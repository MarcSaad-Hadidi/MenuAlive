import type {
  AdminRecommendation,
  RecommendationType
} from "@/lib/demoAdminInsights";

type AdminRecommendationsProps = {
  recommendations: AdminRecommendation[];
};

const TYPE_STYLES: Record<RecommendationType, string> = {
  "Fort intérêt": "border-champagne/35 bg-champagne/10 text-champagne",
  "Signal client": "border-white/12 bg-white/[0.04] text-[#d9ccb8]",
  "Tendance du service": "border-white/12 bg-white/[0.04] text-[#d9ccb8]",
  "À observer": "border-[#c9a46f]/28 bg-[#c9a46f]/8 text-[#e3c99b]",
  "Moment fort": "border-champagne/35 bg-champagne/10 text-champagne",
  "Attention client": "border-white/12 bg-white/[0.04] text-[#d9ccb8]",
  "Recherche fréquente": "border-white/12 bg-white/[0.04] text-[#d9ccb8]",
  "Vue immersive": "border-champagne/35 bg-champagne/10 text-champagne"
};

export function AdminRecommendations({
  recommendations
}: AdminRecommendationsProps) {
  return (
    <section aria-labelledby="recommendations-heading" className="space-y-5">
      <div>
        <h2 id="recommendations-heading" className="font-display text-2xl text-cream">
          Signaux clients du menu
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a99a86]">
          Observations anonymes pour lire l&apos;attention pendant le service.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {recommendations.map((recommendation) => (
          <article
            key={recommendation.title}
            className="rounded-xl border border-white/10 bg-gradient-to-br from-[#14100d]/96 to-[#080604] p-5 shadow-[0_16px_52px_rgba(0,0,0,0.24)]"
          >
            <span
              className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold ${TYPE_STYLES[recommendation.type]}`}
            >
              {recommendation.type}
            </span>
            <h3 className="mt-4 font-display text-xl leading-snug text-cream [overflow-wrap:anywhere]">
              {recommendation.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#a99a86] [overflow-wrap:anywhere]">
              {recommendation.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
