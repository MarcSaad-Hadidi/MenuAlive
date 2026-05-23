"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type SubmitState =
  | { status: "idle"; message: "" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const statusOptions = [
  { value: "demo", label: "Démo interne" },
  { value: "active", label: "Actif" },
  { value: "setup_needed", label: "À configurer" }
];

function fieldValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function RestaurantCreateForm() {
  const router = useRouter();
  const [state, setState] = useState<SubmitState>({
    status: "idle",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);
    setState({ status: "idle", message: "" });

    try {
      const response = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fieldValue(formData, "name"),
          slug: fieldValue(formData, "slug"),
          location: fieldValue(formData, "location"),
          cuisineType: fieldValue(formData, "cuisineType"),
          status: fieldValue(formData, "status"),
          contactName: fieldValue(formData, "contactName"),
          contactEmail: fieldValue(formData, "contactEmail"),
          contactPhone: fieldValue(formData, "contactPhone"),
          notes: fieldValue(formData, "notes")
        })
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Création impossible.");
      }

      form.reset();
      setState({
        status: "success",
        message: "Restaurant créé. La liste a été actualisée."
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
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-[#090705]/88 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom du restaurant" name="name" required />
        <Field label="Slug" name="slug" required />
        <Field label="Ville / emplacement" name="location" required />
        <Field label="Type de cuisine" name="cuisineType" required />
        <label className="block">
          <span className="mb-2 block text-sm text-[#ded0bb]">Statut</span>
          <select
            name="status"
            defaultValue="setup_needed"
            className="h-12 w-full rounded-[6px] border border-white/14 bg-black/38 px-4 text-base text-cream outline-none transition focus:border-champagne focus:ring-2 focus:ring-champagne/25"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Field label="Contact principal" name="contactName" required />
        <Field label="Email contact" name="contactEmail" type="email" required />
        <Field label="Téléphone optionnel" name="contactPhone" type="tel" />
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm text-[#ded0bb]">
          Notes internes optionnelles
        </span>
        <textarea
          name="notes"
          rows={4}
          className="w-full resize-none rounded-[6px] border border-white/14 bg-black/38 px-4 py-3 text-base text-cream outline-none transition focus:border-champagne focus:ring-2 focus:ring-champagne/25"
        />
      </label>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-champagne/50 bg-champagne px-6 py-3 text-base font-semibold text-charcoal shadow-[0_18px_48px_rgba(217,184,121,0.2)] transition hover:bg-[#f0d396] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? "Création..." : "Créer le restaurant"}
        </button>
        {state.message ? (
          <p
            role="status"
            className={`text-sm leading-6 ${
              state.status === "error" ? "text-[#e8b9a4]" : "text-[#e9d7b2]"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false
}: {
  label: string;
  name: string;
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
        className="h-12 w-full rounded-[6px] border border-white/14 bg-black/38 px-4 text-base text-cream outline-none transition placeholder:text-white/30 focus:border-champagne focus:ring-2 focus:ring-champagne/25"
      />
    </label>
  );
}
