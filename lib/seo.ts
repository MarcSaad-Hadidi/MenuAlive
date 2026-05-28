export const SITE_NAME = "Vistaire";
export const SITE_URL_FALLBACK = "https://www.vistaire.ca";
export const DEFAULT_SITE_DESCRIPTION =
  "Vistaire transforme le QR code restaurant en carte digitale immersive pour restaurants haut de gamme : fiches plats, visuels, allergènes, 3D/AR sélective et aperçu restaurateur.";

const SITE_URL_ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL"
] as const;

export const INTERNAL_ROBOTS_DISALLOW = [
  "/api/",
  "/owner",
  "/owner/",
  "/sign-in",
  "/sign-in/",
  "/todos",
  "/todos/"
] as const;

type SiteUrlEnv = {
  [key: string]: string | undefined;
};

type SitemapDish = {
  slug: string;
  isAvailable?: boolean;
};

export const PUBLIC_SEO_SITEMAP_ENTRIES = [
  {
    path: "/menu-digital-restaurant",
    changeFrequency: "monthly",
    priority: 0.88
  },
  {
    path: "/menu-qr-code-restaurant",
    changeFrequency: "monthly",
    priority: 0.82
  },
  {
    path: "/menu-3d-ar-restaurant",
    changeFrequency: "monthly",
    priority: 0.78
  },
  {
    path: "/menu-pdf-vs-menu-digital",
    changeFrequency: "monthly",
    priority: 0.84
  }
] as const;

export const PUBLIC_PRODUCT_SITEMAP_ENTRIES = [
  {
    path: "/a-propos",
    changeFrequency: "monthly",
    priority: 0.72
  },
  {
    path: "/contact",
    changeFrequency: "monthly",
    priority: 0.7
  },
  {
    path: "/prendre-rendez-vous",
    changeFrequency: "monthly",
    priority: 0.74
  },
  {
    path: "/apercu-restaurateur",
    changeFrequency: "monthly",
    priority: 0.76
  }
] as const;

export type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: "weekly" | "monthly";
  priority: number;
};

export type RobotsRule = {
  userAgent: string;
  allow: string;
  disallow: string[];
};

type JsonLdPrimitive = string | number | boolean | null;
export type JsonLdValue =
  | JsonLdPrimitive
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type JsonLdObject = {
  [key: string]: JsonLdValue;
};

export function resolveSiteUrl(value?: string | null): URL {
  const trimmed = value?.trim();
  if (!trimmed) return new URL(SITE_URL_FALLBACK);

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return new URL(SITE_URL_FALLBACK);
    }
    return new URL(url.origin);
  } catch {
    return new URL(SITE_URL_FALLBACK);
  }
}

export function getSiteUrl(env: SiteUrlEnv = process.env): URL {
  for (const key of SITE_URL_ENV_KEYS) {
    const candidate = env[key];
    if (candidate) return resolveSiteUrl(candidate);
  }

  return resolveSiteUrl();
}

export function absoluteUrl(path = "/", env?: SiteUrlEnv): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, getSiteUrl(env)).toString();
}

export function buildSitemapEntries(
  dishes: SitemapDish[] = [],
  lastModified = new Date(),
  env?: SiteUrlEnv
): SitemapEntry[] {
  void dishes;

  const seoPageEntries = PUBLIC_SEO_SITEMAP_ENTRIES.map((entry) => ({
    url: absoluteUrl(entry.path, env),
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority
  }));
  const productPageEntries = PUBLIC_PRODUCT_SITEMAP_ENTRIES.map((entry) => ({
    url: absoluteUrl(entry.path, env),
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority
  }));

  return [
    {
      url: absoluteUrl("/", env),
      lastModified,
      changeFrequency: "monthly",
      priority: 1
    },
    ...productPageEntries,
    ...seoPageEntries,
    {
      url: absoluteUrl("/demo", env),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.62
    }
  ];
}

export function buildRobotsRules(): RobotsRule[] {
  return [
    {
      userAgent: "OAI-SearchBot",
      allow: "/",
      disallow: [...INTERNAL_ROBOTS_DISALLOW]
    },
    {
      userAgent: "*",
      allow: "/",
      disallow: [...INTERNAL_ROBOTS_DISALLOW]
    }
  ];
}

export function buildOrganizationJsonLd(env?: SiteUrlEnv): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${absoluteUrl("/", env)}#organization`,
    name: SITE_NAME,
    url: absoluteUrl("/", env),
    description:
      "Vistaire conçoit des expériences de menu digital premium pour restaurants."
  };
}

export function buildWebsiteJsonLd(env?: SiteUrlEnv): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${absoluteUrl("/", env)}#website`,
    name: SITE_NAME,
    url: absoluteUrl("/", env),
    inLanguage: "fr-CA",
    publisher: {
      "@id": `${absoluteUrl("/", env)}#organization`
    }
  };
}

export function buildVistaireServiceJsonLd(env?: SiteUrlEnv): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${absoluteUrl("/", env)}#service`,
    name: "Carte digitale immersive Vistaire",
    serviceType: "Menu digital QR premium pour restaurants haut de gamme",
    url: absoluteUrl("/", env),
    description: DEFAULT_SITE_DESCRIPTION,
    mainEntityOfPage: {
      "@id": `${absoluteUrl("/", env)}#webpage`
    },
    provider: {
      "@id": `${absoluteUrl("/", env)}#organization`
    },
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Restaurants"
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Expérience Vistaire",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Carte QR mobile"
          }
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Fiches plats visuelles"
          }
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "3D/AR sélective pour plats signatures"
          }
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Aperçu restaurateur des signaux d'attention"
          }
        }
      ]
    }
  };
}

export function buildWebPageJsonLd(
  page: {
    path: string;
    name: string;
    description: string;
    dateModified?: Date | string;
  },
  env?: SiteUrlEnv
): JsonLdObject {
  const dateModified =
    page.dateModified instanceof Date
      ? page.dateModified.toISOString()
      : page.dateModified;

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${absoluteUrl(page.path, env)}#webpage`,
    url: absoluteUrl(page.path, env),
    name: page.name,
    description: page.description,
    inLanguage: "fr-CA",
    isPartOf: {
      "@id": `${absoluteUrl("/", env)}#website`
    },
    publisher: {
      "@id": `${absoluteUrl("/", env)}#organization`
    },
    ...(dateModified ? { dateModified } : {})
  };
}

export function buildPageServiceJsonLd(
  service: {
    path: string;
    name: string;
    serviceType: string;
    description: string;
  },
  env?: SiteUrlEnv
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${absoluteUrl(service.path, env)}#service`,
    name: service.name,
    serviceType: service.serviceType,
    description: service.description,
    url: absoluteUrl(service.path, env),
    provider: {
      "@id": `${absoluteUrl("/", env)}#organization`
    },
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Restaurants"
    }
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
  env?: SiteUrlEnv
): JsonLdObject {
  const currentPath = items.at(-1)?.path ?? "/";

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${absoluteUrl(currentPath, env)}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, env)
    }))
  };
}

export function buildFaqPageJsonLd(
  faqs: Array<{ question: string; answer: string }>,
  pagePath: string,
  env?: SiteUrlEnv
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${absoluteUrl(pagePath, env)}#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };
}
