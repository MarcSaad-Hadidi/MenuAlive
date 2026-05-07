"use client";

import { useState } from "react";

const fields = [
  { id: "name", label: "Nom", type: "text", autoComplete: "name" },
  {
    id: "restaurant",
    label: "Restaurant",
    type: "text",
    autoComplete: "organization"
  },
  { id: "email", label: "Email", type: "email", autoComplete: "email" },
  { id: "phone", label: "Téléphone", type: "tel", autoComplete: "tel" }
];

export function DemoRequestSection() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <section
      id="demo"
      className="border-t border-white/10 bg-[#080706] px-5 py-20 sm:px-10 lg:px-16 lg:py-28"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <h2 className="font-display text-[clamp(2.3rem,5vw,4.75rem)] font-normal leading-[1.03] text-cream">
            Demander une démo MenuAlive
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-[#d1c2aa]">
            Préparez une première expérience autour de vos plats signatures, de
            votre ambiance et de votre carte actuelle.
          </p>
        </div>

        <form
          className="rounded-[8px] border border-white/12 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 sm:p-7"
          onSubmit={(event) => {
            event.preventDefault();
            event.currentTarget.reset();
            setIsSubmitted(true);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <label key={field.id} className="block">
                <span className="mb-2 block text-sm text-[#ded0bb]">
                  {field.label}
                </span>
                <input
                  required
                  id={field.id}
                  name={field.id}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  className="h-12 w-full rounded-[6px] border border-white/12 bg-black/35 px-4 text-base text-cream outline-none transition placeholder:text-white/30 focus:border-champagne focus:ring-2 focus:ring-champagne/25"
                />
              </label>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-[#ded0bb]">Message</span>
            <textarea
              id="message"
              name="message"
              rows={5}
              className="w-full resize-none rounded-[6px] border border-white/12 bg-black/35 px-4 py-3 text-base text-cream outline-none transition placeholder:text-white/30 focus:border-champagne focus:ring-2 focus:ring-champagne/25"
            />
          </label>

          <button
            type="submit"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-champagne/45 bg-champagne px-6 py-3 text-base font-semibold text-charcoal shadow-champagne transition duration-300 hover:bg-[#f0d396] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal sm:w-auto"
          >
            Envoyer la demande
          </button>

          {isSubmitted ? (
            <p role="status" className="mt-4 text-sm leading-6 text-[#e9d7b2]">
              Merci. Votre demande de démo a bien été préparée.
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
