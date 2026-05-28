import type { ServiceActivity } from "@/lib/demoAdminInsights";

type AdminServiceActivityProps = {
  activity: ServiceActivity[];
};

export function AdminServiceActivity({ activity }: AdminServiceActivityProps) {
  return (
    <div className="rounded-[13px] border border-white/[0.14] bg-black/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,250,240,0.12)] backdrop-blur-sm sm:p-6">
      <h3 className="font-display text-xl text-cream">Moments d&apos;activité</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#a99a86]">
        Quand les clients reviennent le plus souvent au menu.
      </p>

      <div className="mt-6 space-y-4">
        {activity.map((item) => (
          <article key={item.label}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="font-semibold text-cream">{item.label}</h4>
                <p className="mt-1 text-sm leading-relaxed text-[#8f806e] [overflow-wrap:anywhere]">
                  {item.detail}
                </p>
              </div>
              <p className="shrink-0 font-display text-xl tabular-nums text-champagne">
                {item.count}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-champagne/65"
                style={{ width: `${Math.min(100, Math.max(0, item.share))}%` }}
                aria-hidden
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
