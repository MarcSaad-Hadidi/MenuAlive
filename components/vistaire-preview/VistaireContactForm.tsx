"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import styles from "./VistaireRendezVousPreview.module.css";

type ContactField = "name" | "email" | "restaurant" | "message";

type ContactFormValues = Record<ContactField, string>;

type ContactFormErrors = Partial<Record<ContactField, string>>;

type SubmitState = "idle" | "error" | "preparing" | "handoff";

const initialValues: ContactFormValues = {
  name: "",
  email: "",
  restaurant: "",
  message: ""
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeValues(values: ContactFormValues): ContactFormValues {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    restaurant: values.restaurant.trim(),
    message: values.message.trim()
  };
}

function validateContactForm(values: ContactFormValues): ContactFormErrors {
  const errors: ContactFormErrors = {};

  if (!values.name) {
    errors.name = "Indiquez votre nom.";
  }

  if (!values.email) {
    errors.email = "Indiquez votre courriel.";
  } else if (!emailPattern.test(values.email)) {
    errors.email = "Indiquez un courriel valide.";
  }

  if (!values.restaurant) {
    errors.restaurant = "Indiquez le nom du restaurant.";
  }

  if (!values.message) {
    errors.message = "Ajoutez un message.";
  } else if (values.message.length < 10) {
    errors.message = "Ajoutez quelques détails sur votre projet.";
  }

  return errors;
}

function buildMailtoHref(values: ContactFormValues): string {
  const subject = `Rendez-vous Vistaire - ${values.restaurant}`;
  const body = [
    "Bonjour Vistaire,",
    "",
    "Je souhaite planifier un rendez-vous pour discuter de Vistaire.",
    "",
    `Nom: ${values.name}`,
    `Courriel: ${values.email}`,
    `Restaurant: ${values.restaurant}`,
    "Region: Montreal / Quebec",
    "",
    "Message:",
    values.message
  ].join("\n");

  return `mailto:contact@vistaire.ca?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

function getErrorId(field: ContactField): string {
  return `contact-${field}-error`;
}

function getFieldId(field: ContactField): string {
  return `contact-${field}`;
}

export function VistaireContactForm() {
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const updateField =
    (field: ContactField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = event.target.value;

      setValues((current) => ({
        ...current,
        [field]: nextValue
      }));
      setErrors((current) => {
        if (!current[field]) return current;

        const nextErrors = { ...current };
        delete nextErrors[field];
        return nextErrors;
      });
      if (submitState !== "idle") {
        setSubmitState("idle");
      }
    };

  const submitContactRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedValues = normalizeValues(values);
    const nextErrors = validateContactForm(normalizedValues);
    const firstInvalidField = Object.keys(nextErrors)[0] as
      | ContactField
      | undefined;

    setValues(normalizedValues);
    setErrors(nextErrors);

    if (firstInvalidField) {
      setSubmitState("error");

      const invalidElement =
        event.currentTarget.elements.namedItem(firstInvalidField);
      if (invalidElement instanceof HTMLElement) {
        invalidElement.focus();
      }

      return;
    }

    setSubmitState("preparing");
    window.location.href = buildMailtoHref(normalizedValues);
    window.setTimeout(() => setSubmitState("handoff"), 250);
  };

  const statusMessage =
    submitState === "error"
      ? "Veuillez corriger les champs indiqués."
      : submitState === "preparing"
        ? "Préparation de votre courriel..."
        : submitState === "handoff"
          ? "Votre courriel est prêt dans votre application de messagerie. Si rien ne s'ouvre, écrivez à contact@vistaire.ca."
          : "";

  return (
    <form
      aria-busy={submitState === "preparing"}
      className={styles.contactForm}
      noValidate
      onSubmit={submitContactRequest}
    >
      <div className={styles.formField}>
        <label className={styles.srOnly} htmlFor={getFieldId("name")}>
          Nom
        </label>
        <input
          aria-describedby={errors.name ? getErrorId("name") : undefined}
          aria-invalid={errors.name ? "true" : undefined}
          autoComplete="name"
          id={getFieldId("name")}
          name="name"
          onChange={updateField("name")}
          placeholder="Nom"
          required
          type="text"
          value={values.name}
        />
        {errors.name ? (
          <p className={styles.fieldError} id={getErrorId("name")}>
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className={styles.formField}>
        <label className={styles.srOnly} htmlFor={getFieldId("email")}>
          Courriel
        </label>
        <input
          aria-describedby={errors.email ? getErrorId("email") : undefined}
          aria-invalid={errors.email ? "true" : undefined}
          autoComplete="email"
          id={getFieldId("email")}
          name="email"
          onChange={updateField("email")}
          placeholder="Courriel"
          required
          type="email"
          value={values.email}
        />
        {errors.email ? (
          <p className={styles.fieldError} id={getErrorId("email")}>
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className={styles.formField}>
        <label className={styles.srOnly} htmlFor={getFieldId("restaurant")}>
          Restaurant
        </label>
        <input
          aria-describedby={
            errors.restaurant ? getErrorId("restaurant") : undefined
          }
          aria-invalid={errors.restaurant ? "true" : undefined}
          autoComplete="organization"
          id={getFieldId("restaurant")}
          name="restaurant"
          onChange={updateField("restaurant")}
          placeholder="Restaurant"
          required
          type="text"
          value={values.restaurant}
        />
        {errors.restaurant ? (
          <p className={styles.fieldError} id={getErrorId("restaurant")}>
            {errors.restaurant}
          </p>
        ) : null}
      </div>

      <div className={styles.formField}>
        <label className={styles.srOnly} htmlFor={getFieldId("message")}>
          Message
        </label>
        <textarea
          aria-describedby={errors.message ? getErrorId("message") : undefined}
          aria-invalid={errors.message ? "true" : undefined}
          id={getFieldId("message")}
          name="message"
          onChange={updateField("message")}
          placeholder="Message"
          required
          rows={4}
          value={values.message}
        />
        {errors.message ? (
          <p className={styles.fieldError} id={getErrorId("message")}>
            {errors.message}
          </p>
        ) : null}
      </div>

      <button
        className={styles.submitButton}
        disabled={submitState === "preparing"}
        type="submit"
      >
        Envoyer la demande
      </button>

      <p
        className={styles.formStatus}
        aria-live="polite"
        role={submitState === "error" ? "alert" : "status"}
      >
        {statusMessage}
      </p>
      <p className={styles.formNote}>
        Aucun message n&apos;est envoy&eacute; sans votre confirmation dans
        votre application de messagerie.
      </p>
    </form>
  );
}
