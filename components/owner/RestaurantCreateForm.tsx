"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { MenuQrCode } from "@/components/owner/MenuQrCode";
import styles from "@/components/owner/OwnerCockpit.module.css";
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
  { value: "setup_needed", label: "À configurer" },
  { value: "demo", label: "Présentation" },
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
        throw new Error(result.error ?? "Création impossible.");
      }

      setState({
        status: "success",
        message: "Restaurant créé. QR et liens prêts pour la prochaine étape.",
        restaurant: result.restaurant
      });
      router.refresh();
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Le restaurant n'a pas pu être créé."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.createGrid}>
      <form onSubmit={handleSubmit} className={styles.formPanel}>
        <div className={styles.formGrid}>
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
          <label className={styles.formField}>
            <span className={styles.filterLabel}>Statut</span>
            <select
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={styles.control}
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
            label="Téléphone optionnel"
            name="contactPhone"
            type="tel"
            value={contactPhone}
            onChange={setContactPhone}
          />
        </div>

        <label className={styles.formField}>
          <span className={styles.filterLabel}>Notes internes optionnelles</span>
          <textarea
            name="notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={styles.textarea}
          />
        </label>

        <div className={styles.urlPreview}>
          <p className={styles.metricLabel}>URL menu preview</p>
          <p className={`${styles.bodyText} ${styles.breakText}`}>{previewMenuUrl}</p>
          <p className={styles.sourceNote}>
            Lien dérivé depuis le domaine configuré du site, jamais hardcodé sur
            localhost.
          </p>
        </div>

        <div className={styles.submitRow}>
          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {isSubmitting ? "Création..." : "Créer le restaurant"}
          </button>
          {state.status === "error" ? (
            <p role="status" className={styles.errorText}>
              {state.message}
            </p>
          ) : null}
        </div>
      </form>

      <aside className={styles.asidePanel}>
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
      <p className={styles.badge}>Avant création</p>
      <h3 className={styles.panelTitle}>{name}</h3>
      <dl className={styles.definitionList}>
        <div>
          <dt>Slug</dt>
          <dd>{slug}</dd>
        </div>
        <div>
          <dt>Menu public</dt>
          <dd>{menuUrl}</dd>
        </div>
      </dl>
      <p className={styles.bodyText}>
        Après création, Vistaire affichera le QR scannable et les prochaines
        étapes de setup.
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
      <p className={styles.badge}>Création terminée</p>
      <h3 className={styles.panelTitle}>{restaurant.name}</h3>
      <p className={styles.bodyText}>{state.message}</p>

      <dl className={styles.definitionList}>
        <div>
          <dt>Slug</dt>
          <dd>{restaurant.slug}</dd>
        </div>
        <div>
          <dt>Menu public</dt>
          <dd>{restaurant.menuUrl}</dd>
        </div>
        <div>
          <dt>Dashboard restaurateur</dt>
          <dd>{restaurant.dashboardHref}</dd>
        </div>
      </dl>

      <MenuQrCode
        menuUrl={restaurant.qrTargetUrl}
        restaurantName={restaurant.name}
        className={styles.successQr}
      />

      <div className={styles.nextSteps}>
        <p className={styles.metricLabel}>Prochaines étapes</p>
        <ul>
          <li>Compléter les plats et photos du menu.</li>
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
    <label className={styles.formField}>
      <span className={styles.filterLabel}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.control}
      />
    </label>
  );
}
