export const vistaireClerkAppearance = {
  variables: {
    colorBackground: "#080706",
    colorInputBackground: "#110c08",
    colorInputText: "#f7eddd",
    colorPrimary: "#d9b879",
    colorText: "#f7eddd",
    colorTextSecondary: "#cdbfa9",
    borderRadius: "8px",
    fontFamily: '"Avenir Next", Optima, "Segoe UI", ui-sans-serif, system-ui'
  },
  elements: {
    rootBox: "w-full",
    cardBox:
      "w-full rounded-[8px] border border-white/12 bg-[#0b0806]/95 shadow-[0_28px_90px_rgba(0,0,0,0.42)]",
    card: "bg-transparent text-cream shadow-none",
    headerTitle: "font-display text-3xl font-normal text-cream",
    headerSubtitle: "text-sm leading-6 text-[#cdbfa9]",
    socialButtonsBlockButton:
      "border-white/12 bg-white/[0.03] text-cream hover:bg-white/[0.06]",
    dividerLine: "bg-white/10",
    dividerText: "text-[#8f806e]",
    formFieldLabel: "text-[#ded0bb]",
    formFieldInput:
      "border-white/14 bg-black/35 text-cream focus:border-champagne focus:ring-champagne/25",
    formButtonPrimary:
      "bg-champagne text-charcoal hover:bg-[#f0d396] shadow-[0_18px_48px_rgba(217,184,121,0.2)]",
    footerAction: "hidden",
    footer: "hidden"
  }
} as const;

export const vistaireClerkLocalization = {
  dividerText: "ou",
  formButtonPrimary: "Continuer",
  formFieldLabel__emailAddress: "Adresse email",
  formFieldLabel__password: "Mot de passe",
  formFieldInputPlaceholder__emailAddress: "vous@restaurant.com",
  formFieldInputPlaceholder__password: "Votre mot de passe",
  socialButtonsBlockButton: "Continuer avec {{provider|titleize}}",
  signIn: {
    start: {
      title: "Accès interne Vistaire",
      subtitle: "Espace réservé au pilotage des expériences restaurant.",
      actionText: "",
      actionLink: ""
    },
    password: {
      title: "Accès interne Vistaire",
      subtitle: "Entrez votre mot de passe pour continuer."
    },
    emailCode: {
      title: "Vérification Vistaire",
      subtitle: "Entrez le code reçu pour ouvrir l’espace de pilotage.",
      formTitle: "Code de vérification",
      resendButton: "Renvoyer le code"
    },
    forgotPassword: {
      title: "Réinitialisation de l’accès",
      subtitle: "Recevez un lien de réinitialisation pour votre espace Vistaire.",
      subtitle_email:
        "Recevez un lien de réinitialisation pour votre espace Vistaire.",
      subtitle_phone:
        "Recevez un code de réinitialisation pour votre espace Vistaire.",
      formTitle: "Réinitialiser l’accès",
      resendButton: "Renvoyer"
    }
  }
} as const;
