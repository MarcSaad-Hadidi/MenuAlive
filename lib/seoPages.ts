export type SeoPageSlug =
  | "menu-digital-restaurant"
  | "menu-qr-code-restaurant"
  | "menu-3d-ar-restaurant"
  | "menu-pdf-vs-menu-digital";

type SeoSection = {
  heading: string;
  body: string[];
  points?: string[];
};

type ComparisonRow = {
  label: string;
  before: string;
  after: string;
};

export type SeoPageData = {
  slug: SeoPageSlug;
  path: string;
  metadataTitle: string;
  metadataDescription: string;
  cardDescription: string;
  relatedDescription: string;
  eyebrow: string;
  footerLabel?: string;
  linkTitle?: string;
  h1: string;
  answer: string[];
  takeaway: {
    heading: string;
    text: string;
  };
  visualImage: {
    src: string;
    alt: string;
  };
  sections: SeoSection[];
  comparison: {
    heading: string;
    beforeLabel: string;
    afterLabel: string;
    rows: ComparisonRow[];
  };
  faq: Array<{
    question: string;
    answer: string;
  }>;
  service: {
    name: string;
    serviceType: string;
    description: string;
  };
  primaryCta: {
    href: string;
    label: string;
  };
  secondaryCta?: {
    href: string;
    label: string;
  };
};

export const SEO_PAGES: SeoPageData[] = [
  {
    slug: "menu-digital-restaurant",
    path: "/menu-digital-restaurant",
    metadataTitle: "Menu digital restaurant premium | Vistaire",
    metadataDescription:
      "Vistaire transforme le menu digital restaurant en expérience premium : QR code, fiches plats, allergènes, visuels et 3D/AR sélective.",
    cardDescription:
      "Fiches plats, allergènes, visuels et 3D sélective : ce qu'un menu digital premium doit offrir à table.",
    relatedDescription:
      "Anatomie d'une carte mobile premium : structure, fiches plats et immersion utile.",
    eyebrow: "Menu digital premium",
    footerLabel: "Menu digital restaurant",
    linkTitle: "Anatomie d'un menu digital haut de gamme",
    h1: "Le menu digital premium transforme la carte en expérience.",
    answer: [
      "Un menu digital pour restaurant est une carte consultable sur le téléphone du client, souvent après scan d'un QR code à table. Vistaire en fait une expérience premium : photos, fiches plats, allergènes, prix, accords et vues 3D/AR lorsque le plat le permet, sans téléchargement d'application.",
      "L'objectif n'est pas de transformer la salle en logiciel froid. Vistaire garde la carte, le plat et l'image du restaurant au centre, avec une lecture mobile claire pour le convive et un aperçu restaurateur des signaux anonymes autour du menu."
    ],
    takeaway: {
      heading: "À retenir",
      text:
        "Un menu digital premium structure la carte pour le mobile, met les plats en scène avec fiches et visuels, et garde la 3D/AR sélective pour les signatures qui le méritent."
    },
    visualImage: {
      src: "/images/demo/dishes/homard-bleu-bisque-fenouil.png",
      alt: "Plat signature illustre dans une fiche de menu digital Vistaire"
    },
    sections: [
      {
        heading: "Qu'est-ce qu'un menu digital pour restaurant ?",
        body: [
          "Un menu digital restaurant remplace la lecture statique d'un fichier par une carte pensée pour le téléphone. Les catégories, les descriptions, les allergènes et les visuels restent lisibles pendant le service.",
          "Pour un restaurant haut de gamme, cette expérience doit rester sobre et fidèle à la salle. La technologie soutient le choix du client, elle ne prend pas la place de l'accueil ou du service."
        ],
        points: [
          "Carte accessible par QR code à table",
          "Fiches plats visuelles avec détails utiles",
          "Parcours mobile rapide, sans application à installer"
        ]
      },
      {
        heading: "Ce que Vistaire met en avant",
        body: [
          "Vistaire met les plats signatures en scène avec une hiérarchie claire : nom, prix, récit court, allergènes, accords et visuels. La 3D/AR reste sélective et réservée aux plats qui gagnent à être vus en volume.",
          "Côté restaurateur, l'aperçu aide à comprendre les consultations, recherches et interactions immersives sans promettre des résultats que le menu ne mesure pas."
        ]
      }
    ],
    comparison: {
      heading: "Menu digital simple ou expérience premium ?",
      beforeLabel: "Menu basique",
      afterLabel: "Vistaire",
      rows: [
        {
          label: "Lecture mobile",
          before: "Un fichier ou une liste longue à parcourir.",
          after: "Une carte structurée par catégories, fiches et détails utiles."
        },
        {
          label: "Image de marque",
          before: "Une présentation souvent détachée de l'ambiance du lieu.",
          after: "Un univers visuel cohérent avec la table et les plats signatures."
        },
        {
          label: "Immersion",
          before: "Photos isolées ou absence de contenus visuels.",
          after: "Visuels food-first et 3D/AR uniquement quand elle apporte de la clarté."
        }
      ]
    },
    faq: [
      {
        question: "Le client doit-il installer une application ?",
        answer:
          "Non. Le menu Vistaire s'ouvre dans le navigateur mobile après scan du QR code."
      },
      {
        question: "Tous les plats doivent-ils avoir une vue 3D ou AR ?",
        answer:
          "Non. Vistaire privilégie une 3D/AR sélective pour les plats signatures ou les créations qui gagnent à être explorées en volume."
      },
      {
        question: "Que doit contenir un vrai menu digital pour restaurant ?",
        answer:
          "Catégories lisibles, fiches plats avec prix et allergènes, visuels food-first, parcours mobile rapide et contenus immersifs seulement quand ils clarifient le plat."
      },
      {
        question: "Le menu digital remplace-t-il le menu papier ?",
        answer:
          "Pas nécessairement. Beaucoup de restaurants gardent un menu imprimé et utilisent le digital comme carte complémentaire à table."
      },
      {
        question: "Vistaire convient-il aux restaurants haut de gamme ?",
        answer:
          "Oui, si l'objectif est une présentation sobre, visuelle et fidèle à la salle — pas une interface utilitaire froide."
      },
      {
        question: "Comment le restaurateur met-il à jour la carte ?",
        answer:
          "Via l'aperçu restaurateur Vistaire : plats, catégories, visuels et contenus compatibles peuvent évoluer sans republier un fichier."
      }
    ],
    service: {
      name: "Menu digital restaurant Vistaire",
      serviceType: "Menu digital premium pour restaurants",
      description:
        "Carte mobile premium avec fiches plats, visuels, allergènes et immersion sélective pour restaurants haut de gamme."
    },
    primaryCta: {
      href: "/demo",
      label: "Explorer le menu exemple"
    },
    secondaryCta: {
      href: "/admin",
      label: "Voir l'aperçu restaurateur"
    }
  },
  {
    slug: "menu-qr-code-restaurant",
    path: "/menu-qr-code-restaurant",
    metadataTitle: "Menu QR code restaurant premium | Vistaire",
    metadataDescription:
      "Un menu QR code Vistaire ouvre une carte mobile premium : fiches plats, visuels, allergènes et expérience fidèle au restaurant.",
    cardDescription:
      "Après le scan, une carte mobile structurée — pas un fichier à zoomer. L'entrée QR, l'expérience Vistaire.",
    relatedDescription:
      "Du scan à la fiche plat : ce que le client voit vraiment après un QR code.",
    eyebrow: "QR code restaurant",
    footerLabel: "Menu QR code restaurant",
    linkTitle: "QR code → carte mobile sans application",
    h1: "Le QR code doit ouvrir une expérience, pas un fichier.",
    answer: [
      "Un menu QR code pour restaurant ne devrait pas se limiter à ouvrir un fichier à zoomer. Avec Vistaire, le QR code devient l'entrée vers une carte mobile, visuelle et fluide : le client parcourt les catégories, ouvre une fiche plat et découvre les contenus immersifs disponibles.",
      "La valeur du QR code dépend de ce qui se passe après le scan. Vistaire transforme cet accès en expérience de carte, avec une présentation soignée et adaptée au rythme du service."
    ],
    takeaway: {
      heading: "En résumé",
      text:
        "Le QR code n'est qu'une porte d'entrée. La qualité dépend de la carte mobile qui s'ouvre : claire, visuelle et fidèle au restaurant."
    },
    visualImage: {
      src: "/images/demo/dishes/ravioles-chevre-miel-monteregie.png",
      alt: "Fiche plat accessible depuis un QR code restaurant Vistaire"
    },
    sections: [
      {
        heading: "Que voit le client après le scan ?",
        body: [
          "Le client arrive sur une carte mobile organisée, pas sur un document figé. Les catégories, les fiches plats et les détails importants restent faciles à consulter à table.",
          "Le QR code conserve son rôle simple : ouvrir vite. Vistaire prend ensuite le relais pour donner une lecture premium de la carte."
        ],
        points: [
          "Accès immédiat depuis la table",
          "Carte mobile adaptée à la lecture courte",
          "Fiches plats pour les créations qui demandent plus de contexte"
        ]
      },
      {
        heading: "Un QR code peut rester haut de gamme",
        body: [
          "Le QR code n'est pas incompatible avec un restaurant premium si l'expérience ouverte est soignée. Les textes, les visuels et les interactions doivent prolonger la salle plutôt que l'appauvrir.",
          "Vistaire évite la logique utilitaire froide : le scan sert de porte d'entrée vers une carte élégante, claire et centrée sur les plats."
        ]
      }
    ],
    comparison: {
      heading: "QR code seul ou carte Vistaire ?",
      beforeLabel: "QR code seul",
      afterLabel: "QR code Vistaire",
      rows: [
        {
          label: "Après le scan",
          before: "Le client ouvre souvent un fichier peu confortable.",
          after: "Le client arrive sur une carte mobile structurée."
        },
        {
          label: "Mise à jour",
          before: "La carte reste liée à un document à republier.",
          after: "L'expérience peut évoluer autour des plats et contenus disponibles."
        },
        {
          label: "Perception",
          before: "Le QR code peut paraître purement pratique.",
          after: "Le QR code devient l'accès discret à une présentation premium."
        }
      ]
    },
    faq: [
      {
        question: "Le QR code suffit-il à moderniser un menu ?",
        answer:
          "Non. Le QR code est seulement le point d'entrée; la qualité dépend de la carte mobile qui s'ouvre ensuite."
      },
      {
        question: "Le client doit-il télécharger quelque chose ?",
        answer:
          "Non. Vistaire est conçu pour s'ouvrir directement depuis le navigateur mobile."
      },
      {
        question: "Faut-il un QR code par table ou un seul suffit ?",
        answer:
          "Un QR par table ou par zone fonctionne selon le service. L'important est que le scan ouvre toujours la même carte soignée."
      },
      {
        question: "Le client doit-il être connecté au Wi-Fi du restaurant ?",
        answer:
          "Non. Le menu s'ouvre via la connexion mobile du client, comme n'importe quelle page web."
      },
      {
        question: "Un QR code peut-il rester élégant en restaurant premium ?",
        answer:
          "Oui, si l'expérience ouverte prolonge la salle : textes soignés, visuels food-first et parcours mobile fluide."
      },
      {
        question: "Que se passe-t-il si le client n'a pas de smartphone ?",
        answer:
          "Le restaurant peut conserver un menu papier ou proposer une tablette. Vistaire ne remplace pas l'accueil humain."
      }
    ],
    service: {
      name: "Menu QR code Vistaire",
      serviceType: "Menu QR code premium pour restaurants",
      description:
        "Carte mobile premium accessible par QR code, pensée pour la lecture à table et les plats signatures."
    },
    primaryCta: {
      href: "/demo",
      label: "Tester le QR menu exemple"
    },
    secondaryCta: {
      href: "/menu-pdf-vs-menu-digital",
      label: "Comparer avec un PDF"
    }
  },
  {
    slug: "menu-3d-ar-restaurant",
    path: "/menu-3d-ar-restaurant",
    metadataTitle: "Menu 3D/AR pour restaurant | Vistaire",
    metadataDescription:
      "Vistaire ajoute la 3D/AR sélective aux menus de restaurants premium quand un plat compatible gagne à être vu en volume.",
    cardDescription:
      "Quand activer la 3D/AR, quand s'en passer, et comment rester premium sans gadget.",
    relatedDescription:
      "Immersion sélective : plats compatibles, fallback clair, pas de 3D systématique.",
    eyebrow: "3D/AR restaurant",
    footerLabel: "Menu 3D / AR restaurant",
    linkTitle: "3D utile vs gadget — quand l'activer",
    h1: "La 3D n'impressionne que si elle rend le plat plus désirable.",
    answer: [
      "La 3D/AR dans un menu de restaurant aide le client à mieux comprendre un plat avant de choisir, surtout pour les signatures, desserts et cocktails visuels. Vistaire l'intègre comme option de présentation : les plats compatibles peuvent être explorés en 3D, et l'AR s'ouvre sur mobile compatible après action du client.",
      "Cette immersion doit rester sélective. Une fiche plat Vistaire reste claire avec ou sans AR, afin que l'expérience principale du menu ne dépende jamais d'un appareil ou d'un asset particulier."
    ],
    takeaway: {
      heading: "À retenir",
      text:
        "La 3D/AR aide quand le volume ou la présentation du plat compte. Vistaire la réserve aux plats compatibles, avec une fiche visuelle claire si l'AR n'est pas disponible."
    },
    visualImage: {
      src: "/images/demo/dishes/maison-elyse-n1.png",
      alt: "Plat signature presente avec une experience immersive Vistaire"
    },
    sections: [
      {
        heading: "Quand la 3D ou l'AR est-elle pertinente ?",
        body: [
          "La 3D/AR est utile quand le volume, la texture ou la présentation d'un plat raconte quelque chose qu'une ligne de texte ne suffit pas à transmettre.",
          "Vistaire la réserve aux plats compatibles et garde toujours une fiche visuelle lisible pour les clients qui ne l'ouvrent pas."
        ],
        points: [
          "Plats signatures à forte présentation",
          "Desserts, cocktails ou créations visuelles",
          "Ouverture immersive seulement après intention du client"
        ]
      },
      {
        heading: "Une immersion sans alourdir toute la carte",
        body: [
          "Le menu doit rester rapide à parcourir. Les contenus 3D/AR sont donc traités comme une couche de présentation, pas comme une condition d'accès au plat.",
          "Cette approche protège le rythme du service et conserve une expérience premium même si l'appareil ne prend pas en charge l'AR."
        ]
      }
    ],
    comparison: {
      heading: "3D/AR systématique ou sélective ?",
      beforeLabel: "Systématique",
      afterLabel: "Sélective",
      rows: [
        {
          label: "Performance",
          before: "Risque d'alourdir la carte sans bénéfice clair.",
          after: "Les contenus immersifs sont réservés aux plats qui le méritent."
        },
        {
          label: "Compréhension",
          before: "L'effet visuel peut prendre le dessus sur le plat.",
          after: "La 3D soutient la décision du client quand elle apporte du contexte."
        },
        {
          label: "Compatibilité",
          before: "L'expérience peut dépendre fortement de l'appareil.",
          after: "La fiche plat reste utile avec un fallback visuel clair."
        }
      ]
    },
    faq: [
      {
        question: "L'AR fonctionne-t-elle sur tous les téléphones ?",
        answer:
          "Non. Vistaire garde une fiche plat complète et n'ouvre l'AR que lorsqu'elle est disponible et demandée par le client."
      },
      {
        question: "Faut-il modéliser toute la carte ?",
        answer:
          "Non. Une sélection de plats signatures suffit souvent pour créer un moment immersif cohérent."
      },
      {
        question: "La 3D ralentit-elle le chargement du menu ?",
        answer:
          "Les contenus 3D/AR ne se chargent qu'après intention du client sur une fiche plat, pas au parcours initial de la carte."
      },
      {
        question: "L'AR remplace-t-elle la photo du plat ?",
        answer:
          "Non. La fiche garde toujours photo, texte, prix et allergènes. La 3D/AR complète la présentation quand elle apporte du contexte."
      },
      {
        question: "Quels plats méritent une vue 3D en priorité ?",
        answer:
          "Signatures à forte présentation, desserts visuels, cocktails travaillés ou créations dont le volume raconte mieux que le texte."
      },
      {
        question: "Que voit le client si l'AR n'est pas disponible ?",
        answer:
          "La fiche plat reste complète avec visuels premium. L'AR est un bonus, jamais une condition pour comprendre le plat."
      }
    ],
    service: {
      name: "Menu 3D/AR Vistaire",
      serviceType: "Présentation 3D/AR sélective pour menus de restaurants",
      description:
        "Couche immersive pour plats compatibles, avec fiche plat claire et fallback premium."
    },
    primaryCta: {
      href: "/demo/dishes/homard-bisque",
      label: "Voir une fiche plat"
    },
    secondaryCta: {
      href: "/menu-digital-restaurant",
      label: "Revenir au menu digital"
    }
  },
  {
    slug: "menu-pdf-vs-menu-digital",
    path: "/menu-pdf-vs-menu-digital",
    metadataTitle: "Menu PDF vs menu digital restaurant | Vistaire",
    metadataDescription:
      "Comparez menu PDF et menu digital pour restaurant premium : lisibilité mobile, fiches plats, allergènes et expérience à table.",
    cardDescription:
      "Zoom, page fixe, image générique : pourquoi le PDF atteint vite ses limites sur mobile premium.",
    relatedDescription:
      "PDF acceptable parfois, insuffisant à table : la différence concrète avec une carte digitale.",
    eyebrow: "PDF ou digital",
    footerLabel: "PDF vs menu digital",
    linkTitle: "Un PDF n'est pas un menu digital",
    h1: "Un PDF n'est pas un menu digital.",
    answer: [
      "Un PDF reste simple à produire et pratique pour l'impression, mais il est souvent moins confortable à lire sur mobile à table. Un menu digital comme Vistaire structure la carte, met les plats en scène, rend les allergènes plus lisibles et peut ajouter des fiches visuelles ou 3D/AR.",
      "Le bon choix dépend du niveau d'expérience attendu. Pour une carte courte et rarement modifiée, un PDF peut suffire. Pour un restaurant qui veut valoriser ses plats et guider le client avec élégance, une carte digitale dédiée devient plus cohérente."
    ],
    takeaway: {
      heading: "Réponse directe",
      text:
        "Un PDF peut suffire pour une carte simple, mais il peine sur mobile à table. Un menu digital dédié structure la lecture, enrichit les fiches plats et prolonge l'image premium du restaurant."
    },
    visualImage: {
      src: "/images/demo/dishes/tarte-citron-basilic-pourpre.png",
      alt: "Dessert presente dans une carte digitale plutot qu'un menu PDF"
    },
    sections: [
      {
        heading: "Ce que le PDF fait bien",
        body: [
          "Le PDF est facile à créer, proche de l'imprimé et rapide à partager. Pour certaines cartes simples, il reste une solution acceptable.",
          "Sa limite apparaît surtout sur téléphone : zoom, défilement, poids du fichier, manque de hiérarchie et difficulté à mettre en valeur les fiches plats."
        ]
      },
      {
        heading: "Ce qu'apporte une carte digitale",
        body: [
          "Une carte digitale structure la lecture mobile. Le client navigue par catégories, ouvre un plat, vérifie les allergènes et découvre les visuels sans chercher dans une page complète.",
          "Vistaire ajoute une couche premium : image de marque, fiches sobres, visuels food-first et immersion sélective quand elle est pertinente."
        ],
        points: [
          "Lisibilité mobile sans zoom",
          "Fiches plats plus riches",
          "Expérience cohérente avec un restaurant haut de gamme"
        ]
      }
    ],
    comparison: {
      heading: "Menu PDF vs menu digital",
      beforeLabel: "PDF",
      afterLabel: "Vistaire",
      rows: [
        {
          label: "Mobile",
          before: "Le client zoome et cherche dans une page fixe.",
          after: "La carte est organisée pour l'écran du téléphone."
        },
        {
          label: "Fiches plats",
          before: "Le détail est limité par la mise en page du fichier.",
          after: "Chaque plat peut recevoir son image, son récit court et ses détails."
        },
        {
          label: "Perception premium",
          before: "Le fichier peut sembler générique même si la salle ne l'est pas.",
          after: "La carte prolonge le niveau de présentation du restaurant."
        }
      ]
    },
    faq: [
      {
        question: "Un menu PDF est-il mauvais pour tous les restaurants ?",
        answer:
          "Non. Il peut convenir à une carte très simple, mais il atteint vite ses limites en lecture mobile premium."
      },
      {
        question: "Comment commencer sans tout refaire ?",
        answer:
          "Le plus sûr est de partir des plats et informations déjà fiables, puis d'enrichir progressivement les fiches qui comptent le plus."
      },
      {
        question: "Un PDF est-il un menu digital ?",
        answer:
          "Non. Un PDF reste un fichier statique à zoomer. Un menu digital structure la carte pour le mobile avec fiches et navigation."
      },
      {
        question: "Quand le PDF reste-t-il acceptable ?",
        answer:
          "Pour une carte courte, peu modifiée, sans ambition de mise en scène des plats signatures à table."
      },
      {
        question: "Le PDF via QR code pose-t-il le même problème ?",
        answer:
          "Oui. Le QR code accélère l'accès, mais si un PDF s'ouvre, le client subit toujours zoom et page fixe."
      },
      {
        question: "Faut-il abandonner le PDF d'un coup ?",
        answer:
          "Non. Beaucoup de restaurants migrent d'abord leurs plats signatures vers des fiches digitales, puis élargissent progressivement."
      }
    ],
    service: {
      name: "Alternative premium au menu PDF",
      serviceType: "Menu digital premium pour remplacer un PDF QR",
      description:
        "Carte digitale lisible sur mobile avec fiches plats, visuels et informations utiles pour restaurants premium."
    },
    primaryCta: {
      href: "/demo",
      label: "Comparer avec la démo"
    },
    secondaryCta: {
      href: "/menu-qr-code-restaurant",
      label: "Voir le menu QR code"
    }
  }
];

export function getSeoPage(slug: SeoPageSlug): SeoPageData {
  const page = SEO_PAGES.find((candidate) => candidate.slug === slug);

  if (!page) {
    throw new Error(`Unknown SEO page: ${slug}`);
  }

  return page;
}

export function getRelatedSeoPages(currentSlug: SeoPageSlug): SeoPageData[] {
  return SEO_PAGES.filter((page) => page.slug !== currentSlug);
}
