import type { SeoPageData } from "@/lib/seoPages";

type SeoComparisonTableProps = {
  comparison: SeoPageData["comparison"];
  tone?: "neutral" | "confrontation";
};

export function SeoComparisonTable({
  comparison,
  tone = "neutral"
}: SeoComparisonTableProps) {
  const beforeTone =
    tone === "confrontation"
      ? "text-[#9a8a78] bg-[#0a0807]"
      : "text-[#b7a891]";
  const afterTone =
    tone === "confrontation"
      ? "text-[#f0e3cf] bg-[#110d0a]"
      : "text-[#eadcc6]";

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0c0907]">
      <div className="hidden grid-cols-[0.5fr_1fr_1fr] border-b border-white/10 bg-white/[0.035] text-xs font-semibold uppercase tracking-[0.16em] text-champagne/80 md:grid">
        <div className="px-5 py-4">Critère</div>
        <div className="border-l border-white/10 px-5 py-4">
          {comparison.beforeLabel}
        </div>
        <div className="border-l border-white/10 px-5 py-4">
          {comparison.afterLabel}
        </div>
      </div>
      <div className="divide-y divide-white/10">
        {comparison.rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-4 p-5 md:grid-cols-[0.5fr_1fr_1fr] md:gap-0 md:p-0"
          >
            <div className="font-semibold text-champagne md:px-5 md:py-5">
              {row.label}
            </div>
            <div
              className={`text-sm leading-6 md:border-l md:border-white/10 md:px-5 md:py-5 ${beforeTone}`}
            >
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/36 md:hidden">
                {comparison.beforeLabel}
              </span>
              {row.before}
            </div>
            <div
              className={`text-sm leading-6 md:border-l md:border-white/10 md:px-5 md:py-5 ${afterTone}`}
            >
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-champagne/70 md:hidden">
                {comparison.afterLabel}
              </span>
              {row.after}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
