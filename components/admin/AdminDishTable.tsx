import type { Category, CurrencyCode, Dish } from "@/lib/demoMenuData";
import { formatPrice } from "@/lib/formatPrice";

type AdminDishTableProps = {
  dishes: Dish[];
  categories: Category[];
  currency: CurrencyCode;
};

export function AdminDishTable({
  dishes,
  categories,
  currency
}: AdminDishTableProps) {
  const categoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.name ?? slug;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/12 bg-[#0a0806]">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-black/40 text-xs uppercase tracking-[0.15em] text-[#b9aa94]">
            <th scope="col" className="px-4 py-4 font-semibold">
              Plat
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              Catégorie
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              Prix
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              Dispo.
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              Photo
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              3D
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              AR
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              Signature
            </th>
            <th scope="col" className="px-4 py-4 text-right font-semibold">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {dishes.map((dish) => {
            const hasPhoto = Boolean(dish.image);
            const hasGlb = Boolean(dish.model3dUrl?.trim());
            const hasUsdz = Boolean(dish.usdzUrl?.trim());

            return (
              <tr
                key={dish.id}
                className="border-b border-white/[0.06] text-[#d1c2aa] last:border-0"
              >
                <td className="px-4 py-3.5 font-medium text-cream">{dish.name}</td>
                <td className="px-4 py-3.5">{categoryName(dish.categorySlug)}</td>
                <td className="px-4 py-3.5 tabular-nums text-champagne/95">
                  {formatPrice(dish.price, currency)}
                </td>
                <td className="px-4 py-3.5">
                  {dish.isAvailable ? (
                    <span className="rounded-md bg-emerald-950/50 px-2 py-1 text-xs font-medium text-emerald-200/95">
                      Oui
                    </span>
                  ) : (
                    <span className="rounded-md bg-red-950/40 px-2 py-1 text-xs font-medium text-red-200/90">
                      Non
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  {hasPhoto ? (
                    <span className="text-emerald-200/90">Publ.</span>
                  ) : (
                    <span className="text-amber-200/85">À fournir</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  {hasGlb ? (
                    <span className="text-emerald-200/90">GLB</span>
                  ) : (
                    <span className="text-[#8a7b68]">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  {hasUsdz ? (
                    <span className="text-emerald-200/90">USDZ</span>
                  ) : hasGlb ? (
                    <span className="text-amber-200/85">Web / Android</span>
                  ) : (
                    <span className="text-[#8a7b68]">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  {dish.isSignature ? (
                    <span className="rounded-full border border-champagne/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-champagne">
                      Signature
                    </span>
                  ) : (
                    <span className="text-white/25">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-white/14 px-3 py-1.5 text-xs font-semibold text-cream transition hover:border-champagne/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-champagne/25 px-3 py-1.5 text-xs font-semibold text-champagne/95 transition hover:border-champagne/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                    >
                      Préparer AR
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-white/10 px-4 py-3 text-center text-xs text-[#7a6c5c]">
        Les modifications ne sont pas enregistrées dans cette prévisualisation.
      </p>
    </div>
  );
}
