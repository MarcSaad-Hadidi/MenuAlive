"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { MenuQrCode } from "@/components/owner/MenuQrCode";
import { buildRestaurantMenuPath, slugifyRestaurantSlug } from "@/lib/owner/menuUrlCore";
import type { OwnerRestaurant } from "@/lib/owner/types";

type SubmitState =
  | { status: "idle"; message: "" }
  | { status: "success"; message: string; restaurant: OwnerRestaurant }
  | { status: "error"; message: string };

type RestaurantCreateFormProps = {
  siteOrigin: string;
};

const statusOptions = [
  { value: "setup_needed", label: "A configurer" },
  { value: "demo", label: "Presentation" },
  { value: "active", label: "Actif" }
];

function absoluteMenuUrl(siteOrigin: string, path: string): string {
  try {
    return new URL(path, siteOrigin).toString();
  } catch {
    return path;
  }
}

export function RestaurantCreateForm({ siteOrigin }: RestaurantCreateFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [location, setLocation] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [status, setStatus] = useState("setup_needed");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<SubmitState>({
    status: "idle",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveSlug = slug || slugifyRestaurantSlug(name);
  const previewMenuPath = buildRestaurantMenuPath(effectiveSlug || name);
  const previewMenuUrl = useMemo(
    () => absoluteMenuUrl(siteOrigin, previewMenuPath),
    [previewMenuPath, siteOrigin]
  );

  function updateName(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugifyRestaurantSlug(value));
    }
  }

  function updateSlug(value: string) {
    setSlugTouched(true);
    setSlug(slugifyRestaurantSlug(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setState({ status: "idle", message: "" });

    try {
      const response = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: effectiveSlug,
          location,
          cuisineType,
          status,
          contactName,
          contactEmail,
          contactPhone,
          notes
        })
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        restaurant?: OwnerRestaurant;
      };

      if (!response.ok || !result.ok || !result.restaurant) {
        throw new Error(result.error ?? "Creation impossible.");
      }

      setState({
        status: "success",
        message: "Restaurant cree. QR et liens prets pour la prochaine etape.",
        restaurant: result.restaurant
      });
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Le restaurant n'a pas pu etre cree."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.62fr)_minmax(320px,0.38fr)]">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-white/10 bg-[#090705]/88 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Nom du restaurant"
            name="name"
            required
            value={name}
            onChange={updateName}
          />
          <Field
            label="Slug public"
            name="slug"
            required
            value={effectiveSlug}
            onChange={updateSlug}
          />
          <Field
            label="Ville / emplacement"
            name="location"
            required
            value={location}
            onChange={setLocation}
          />
          <Field
            label="Type de cuisine"
            name="cuisineType"
            required
            value={cuisineType}
            onChange={setCuisineType}
          />
          <label className="block">
            <span className="mb-2 block text-sm text-[#ded0bb]">Statut</span>
            <select
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-12 w-full rounded-[6px] border border-white/14 bg-black/38 px-4 text-base text-cream outline-none transition focus:border-champagne focus:ring-2 focus:ring-champagne/25"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Contact principal"
            name="contactName"
            required
            value={contactName}
            onChange={setContactName}
          />
          <Field
            label="Email contact"
            name="contactEmail"
            type="email"
            required
            value={contactEmail}
            onChange={setContactEmail}
          />
          <Field
            label="Telephone optionnel"
            name="contactPhone"
            type="tel"
            value={contactPhone}
            onChange={setContactPhone}
          />
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm text-[#ded0bb]">
            Notes internes optionnelles
          </span>
          <textarea
            name="notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full resize-none rounded-[6px] border border-white/14 bg-black/38 px-4 py-3 text-base text-cream outline-none transition focus:border-champagne focus:ring-2 focus:ring-champagne/25"
          />
        </label>

        <div className="mt-6 rounded-lg border border-champagne/18 bg-champagne/[0.055] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne/85">
            URL menu preview
          </p>
          <p className="mt-2 break-all text-sm leading-relaxed text-[#e4d4b8]">
            {previewMenuUrl}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[#9f907d]">
            Lien derive depuis le domaine configure du site, jamais hardcode sur
            localhost.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-champagne/50 bg-champagne px-6 py-3 text-base font-semibold text-charcoal shadow-[0_18px_48px_rgba(217,184,121,0.2)] transition hover:bg-[#f0d396] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Creation..." : "Creer le restaurant"}
          </button>
          {state.status === "error" ? (
            <p role="status" className="text-sm leading-6 text-[#e8b9a4]">
              {state.message}
            </p>
          ) : null}
        </div>
      </form>

      <aside className="rounded-xl border border-white/10 bg-[#0d0906]/88 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-6">
        {state.status === "success" ? (
          <SuccessPanel state={state} />
        ) : (
          <PreviewPanel
            name={name || "Nouveau restaurant"}
            slug={effectiveSlug || "slug-menu"}
            menuUrl={previewMenuUrl}
          />
        )}
      </aside>
    </div>
  );
}

function PreviewPanel({
  name,
  slug,
  menuUrl
}: {
  name: string;
  slug: string;
  menuUrl: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne/80">
        Avant creation
      </p>
      <h3 className="mt-3 font-display text-2xl leading-tight text-cream">
        {name}
      </h3>
      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="text-[#7f705f]">Slug</dt>
          <dd className="mt-1 break-all text-[#e2d2b8]">{slug}</dd>
        </div>
        <div>
          <dt className="text-[#7f705f]">Menu public</dt>
          <dd className="mt-1 break-all text-[#e2d2b8]">{menuUrl}</dd>
        </div>
      </dl>
      <p className="mt-5 text-sm leading-relaxed text-[#a99a86]">
        Apres creation, Vistaire affichera le QR scannable et les prochaines
        etapes de setup.
      </p>
    </div>
  );
}

function SuccessPanel({
  state
}: {
  state: Extract<SubmitState, { status: "success" }>;
}) {
  const restaurant = state.restaurant;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-champagne/80">
        Creation terminee
      </p>
      <h3 className="mt-3 font-display text-2xl leading-tight text-cream">
        {restaurant.name}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#d9ccb8]">
        {state.message}
      </p>

      <dl className="mt-5 space-y-3 text-sm">
        <div>
          <dt className="text-[#7f705f]">Slug</dt>
          <dd className="mt-1 break-all text-[#e2d2b8]">{restaurant.slug}</dd>
        </div>
        <div>
          <dt className="text-[#7f705f]">Menu public</dt>
          <dd className="mt-1 break-all text-[#e2d2b8]">{restaurant.menuUrl}</dd>
        </div>
        <div>
          <dt className="text-[#7f705f]">Dashboard restaurateur</dt>
          <dd className="mt-1 break-all text-[#e2d2b8]">
            {restaurant.dashboardHref}
          </dd>
        </div>
      </dl>

      <MenuQrCode
        menuUrl={restaurant.qrTargetUrl}
        restaurantName={restaurant.name}
        className="mt-5"
      />

      <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.025] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#cdbb9f]">
          Prochaines etapes
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#a99a86]">
          <li>Completer les plats et photos du menu.</li>
          <li>Choisir les plats signatures pour 3D / AR.</li>
          <li>Tester le QR sur mobile avant impression.</li>
        </ul>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[#ded0bb]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[6px] border border-white/14 bg-black/38 px-4 text-base text-cream outline-none transition placeholder:text-white/30 focus:border-champagne focus:ring-2 focus:ring-champagne/25"
      />
    </label>
  );
}
