export type SeoPageKey =
  | "menu-digital-restaurant"
  | "menu-qr-code-restaurant"
  | "menu-3d-ar-restaurant"
  | "menu-pdf-vs-menu-digital";

export type SeoPageLink = {
  href: string;
  label: string;
  description: string;
};

export type SeoPageFaq = {
  question: string;
  answer: string;
};

export type SeoPageSection = {
  heading: string;
  body: string[];
  points?: string[];
};

export type SeoPageStep = {
  title: string;
  body: string;
};

export type SeoComparisonRow = {
  label: string;
  before: string;
  after: string;
};

export type SeoPageData = {
  key: SeoPageKey;
  path: string;
  metadataTitle: string;
  metadataDescription: string;
  h1: string;
  answer: string[];
  heroVariant: "digital" | "qr" | "ar" | "pdf";
  heroImage: {
    src: string;
    alt: string;
  };
  primaryCta: SeoPageLink;
  secondaryCta?: SeoPageLink;
  sections: SeoPageSection[];
  visual: {
    heading: string;
    body: string;
    steps: SeoPageStep[];
  };
  comparison: {
    heading: string;
    body: string;
    beforeLabel: string;
    afterLabel: string;
    rows: SeoComparisonRow[];
  };
  faq: SeoPageFaq[];
  relatedLinks: SeoPageLink[];
  service: {
    name: string;
    serviceType: string;
    description: string;
  };
};

export const SEO_PAGE_ORDER: SeoPageKey[] = [
  "menu-digital-restaurant",
  "menu-qr-code-restaurant",
  "menu-3d-ar-restaurant",
  "menu-pdf-vs-menu-digital"
];

export const SEO_PAGES: Record<SeoPageKey, SeoPageData> = {
  "menu-digital-restaurant": {
    key: "menu-digital-restaurant",
    path: "/menu-digital-restaurant",
    metadataTitle: "Menu digital restaurant premium | Vistaire",
    metadataDescription:
      "Vistaire transforme le menu digital restaurant en expérience premium: fiches plats, photos, badges, allergènes, 3D/AR disponible et aperçu restaurateur.",
    h1: "Menu digital restaurant premium",
    answer: [
      "Vistaire est un menu digital pour restaurant qui s'ouvre après un scan QR à table, sans application à installer.",
      "Le client ne tombe pas sur un PDF: il parcourt une carte mobile rapide, visuelle, avec fiches plats, photos, allergènes, badges et vues 3D/AR quand elles sont disponibles."
    ],
    heroVariant: "digital",
    heroImage: {
      src: "/images/demo/dishes/homard-bleu-bisque-fenouil.png",
      alt: "Fiche plat Vistaire avec photo de homard bleu et détails utiles"
    },
    primaryCta: {
      href: "/demo",
      label: "Voir le menu client",
      description: "Explorer la démonstration client Vistaire."
    },
    secondaryCta: {
      href: "/admin",
      label: "Voir l'aperçu restaurateur",
      description: "Observer les signaux anonymes autour du menu."
    },
    sections: [
      {
        heading: "Qu'est-ce qu'un menu digital utile pour un restaurant ?",
        body: [
          "Un bon menu digital ne se contente pas de mettre une carte en ligne. Il doit aider un client assis à table à comprendre rapidement les plats, les prix, les allergènes, les options et les signatures de la maison.",
          "Pour un restaurant premium, la sensation compte autant que l'information: typographie lisible, photos propres, rythme calme, détails concrets et navigation qui ne donne pas l'impression de consulter un fichier administratif."
        ],
        points: [
          "Ouverture directe depuis le QR code à table.",
          "Lecture mobile sans zoom ni pincement.",
          "Fiches plats plus riches qu'une ligne de menu.",
          "Accès naturel à la démo client et à l'aperçu restaurateur."
        ]
      },
      {
        heading: "Que voit le client après le scan ?",
        body: [
          "Le client arrive sur une carte pensée pour son téléphone: catégories, photos, prix, badges, plats recommandés, informations allergènes et boutons clairs vers les fiches plats.",
          "Une fiche peut répondre aux questions qui arrivent d'habitude au serveur: ingrédients, temps de préparation, accompagnements, options et note du chef. Quand un plat s'y prête, une vue 3D ou AR peut compléter la photo."
        ]
      },
      {
        heading: "Comment le restaurateur garde une lecture claire ?",
        body: [
          "Vistaire inclut un aperçu restaurateur pour lire l'attention portee à la carte: plats consultes, recherches, moments de service et vues immersives.",
          "L'objectif n'est pas de noyer l'équipe dans des graphiques. Il s'agit de voir ce qui attire vraiment les clients pendant le choix: une signature, un dessert, une recherche allergène ou une fiche qui mérite une meilleure photo."
        ]
      },
      {
        heading: "Faut-il remplacer tout le papier ?",
        body: [
          "Pas forcement. Un beau support papier peut encore avoir sa place pour l'accueil, les vins ou une carte courte.",
          "Le digital devient surtout pertinent lorsque la carte évolue, que les détails produits comptent, que les clients demandent souvent les allergènes, ou que le restaurant veut valoriser des plats signatures avec plus qu'une ligne de texte."
        ]
      }
    ],
    visual: {
      heading: "Du QR code au menu vivant",
      body:
        "Le parcours doit rester simple: scanner, comprendre, choisir, puis approfondir seulement si le client en a envie.",
      steps: [
        {
          title: "Scan à table",
          body:
            "Le QR code devient une porte d'entree vers une expérience, pas un simple lien vers un fichier."
        },
        {
          title: "Carte lisible",
          body:
            "Les catégories, photos et badges aident à parcourir la carte sans interrompre le service."
        },
        {
          title: "Fiche plat",
          body:
            "Le client trouve ingrédients, allergènes, options, prix et note du chef au même endroit."
        },
        {
          title: "3D / AR quand disponible",
          body:
            "Les plats sélectionnés peuvent gagner une dimension immersive, sans rendre le reste de la carte dépendante de la 3D."
        },
        {
          title: "Aperçu restaurateur",
          body:
            "L'équipe peut lire les signaux anonymes qui ressortent pendant le service."
        }
      ]
    },
    comparison: {
      heading: "Menu digital Vistaire vs menu PDF",
      body:
        "Le PDF peut dépanner une carte très simple. Vistaire devient pertinent quand la présentation, la lisibilité et les détails influencent le choix.",
      beforeLabel: "Menu PDF QR",
      afterLabel: "Expérience Vistaire",
      rows: [
        {
          label: "Ouverture",
          before: "Un fichier à charger, parfois lourd, souvent à zoomer.",
          after: "Une page mobile-first, structuree pour le scan à table."
        },
        {
          label: "Choix du plat",
          before: "Nom, prix et description figés dans une mise en page papier.",
          after: "Photos, badges, allergènes, options et fiche plat détaillée."
        },
        {
          label: "Valeur perçue",
          before: "Le QR code ressemble à un raccourci technique.",
          after: "Le QR code ouvre un moment visuel coherent avec le restaurant."
        },
        {
          label: "Lecture restaurateur",
          before: "Aucun signal sur ce que les clients consultent.",
          after: "Aperçu des plats ouverts, recherches et vues immersives."
        }
      ]
    },
    faq: [
      {
        question: "Un menu digital remplace-t-il toujours le menu papier ?",
        answer:
          "Non. Un restaurant peut garder du papier pour certains usages et utiliser Vistaire pour le parcours QR, les fiches plats, les allergènes, les photos et les plats signatures."
      },
      {
        question: "Le client doit-il installer une application ?",
        answer:
          "Non. Le client scanne le QR code et ouvre le menu dans le navigateur de son téléphone."
      },
      {
        question: "Vistaire peut-il afficher les allergènes ?",
        answer:
          "Oui, les fiches plats peuvent présenter les allergènes et les informations utiles pour aider le client à choisir plus sereinement."
      },
      {
        question: "Tous les plats doivent-ils avoir une vue 3D ou AR ?",
        answer:
          "Non. La 3D/AR est plus utile sur certains plats signatures. Une fiche reste premium avec une bonne photo, une description claire et des détails utiles."
      },
      {
        question: "Le restaurateur voit-il ce qui intéresse les clients ?",
        answer:
          "L'aperçu restaurateur montre des signaux anonymes comme les plats consultes, les recherches et les vues immersives."
      }
    ],
    relatedLinks: [
      {
        href: "/menu-qr-code-restaurant",
        label: "Menu QR code restaurant",
        description: "Comprendre ce qu'un QR code devrait ouvrir à table."
      },
      {
        href: "/menu-3d-ar-restaurant",
        label: "Menu 3D / AR restaurant",
        description: "Voir comment l'immersion peut valoriser certains plats."
      },
      {
        href: "/menu-pdf-vs-menu-digital",
        label: "PDF vs menu digital",
        description: "Comparer le PDF QR et une expérience mobile premium."
      },
      {
        href: "/demo",
        label: "Démo client Vistaire",
        description: "Parcourir Maison Élyse comme un client à table."
      }
    ],
    service: {
      name: "Menu digital premium Vistaire",
      serviceType: "Menu digital premium pour restaurants",
      description:
        "Menu digital premium pour restaurants avec fiches plats, photos, allergènes, 3D/AR quand disponibles et aperçu restaurateur."
    }
  },
  "menu-qr-code-restaurant": {
    key: "menu-qr-code-restaurant",
    path: "/menu-qr-code-restaurant",
    metadataTitle: "Menu QR code restaurant premium | Vistaire",
    metadataDescription:
      "Avec Vistaire, le QR code ouvre un menu restaurant rapide et visuel: photos, fiches plats, allergènes, badges, 3D/AR disponible et aperçu restaurateur.",
    h1: "Menu QR code restaurant premium",
    answer: [
      "Un QR code de restaurant ne devrait pas etre la fin de l'expérience. Il devrait etre le debut d'une carte claire, rapide et adaptée au téléphone du client.",
      "Vistaire transforme le scan à table en menu visuel: catégories, fiches plats, photos, allergènes, badges et vues 3D/AR quand elles sont disponibles."
    ],
    heroVariant: "qr",
    heroImage: {
      src: "/images/demo/dishes/ravioles-chevre-miel-monteregie.png",
      alt: "Carte mobile Vistaire ouverte après scan QR à table"
    },
    primaryCta: {
      href: "/demo",
      label: "Scanner l'expérience exemple",
      description: "Ouvrir le menu client Vistaire."
    },
    secondaryCta: {
      href: "/admin",
      label: "Lire l'aperçu restaurateur",
      description: "Voir ce que le restaurant peut observer."
    },
    sections: [
      {
        heading: "Comment fonctionne un menu QR code au restaurant ?",
        body: [
          "Le client scanne le QR code posé sur la table, sur un chevalet ou dans un support de salle. Le menu s'ouvre dans le navigateur, sans compte et sans application.",
          "La difference se joue après le scan: soit le QR code ouvre un PDF froid, soit il ouvre une expérience mobile conçue pour choisir un plat pendant le service."
        ],
        points: [
          "Scan direct depuis l'appareil photo.",
          "Menu accessible sans installation.",
          "Parcours tactile pensé pour la table.",
          "Lien possible vers fiches plats et démo restaurateur."
        ]
      },
      {
        heading: "Pourquoi éviter un simple PDF derriere le QR code ?",
        body: [
          "Un PDF garde souvent la logique du papier: petites lignes, zoom manuel, pages à déplacer et peu d'aide pour comparer les plats.",
          "Sur mobile, le client veut voir vite ce qui est signature, ce qui contient un allergène, ce qui est disponible et ce qui mérite d'être ouvert en détail."
        ]
      },
      {
        heading: "Quelles informations utiles pendant le service ?",
        body: [
          "Un bon menu QR montre les informations qui évitent les frictions: photos, prix, catégories, badges, allergènes, ingrédients, options, accompagnements et temps de préparation.",
          "Ces détails ne remplacent pas le service. Ils préparent mieux la conversation avec l'équipe."
        ]
      },
      {
        heading: "Comment garder une perception premium ?",
        body: [
          "Le QR code peut sembler banal si l'expérience qui suit est pauvre. Vistaire soigne la mise en scene: surfaces sombres, contraste champagne, photos et fiches plats concises.",
          "Le scan doit ressembler à un geste naturel dans un restaurant soigne, pas à une concession technique."
        ]
      }
    ],
    visual: {
      heading: "Un QR code ne devrait pas finir sur un PDF",
      body:
        "La valeur du QR code dépend de ce que le client voit dans les cinq premières secondes.",
      steps: [
        {
          title: "Avant le scan",
          body:
            "Le client attend une carte lisible et immédiate, pas un fichier à manipuler."
        },
        {
          title: "Ouverture",
          body:
            "Vistaire ouvre une expérience mobile avec catégorie, photos et actions claires."
        },
        {
          title: "Choix",
          body:
            "Le client compare les plats avec des signaux visuels: signature, recommandé, allergènes, disponibilité."
        },
        {
          title: "Approfondissement",
          body:
            "Une fiche plat détaille les ingrédients, options et vues 3D/AR quand elles existent."
        }
      ]
    },
    comparison: {
      heading: "QR code PDF vs QR code Vistaire",
      body:
        "Le même petit carré sur la table peut mener à deux expériences très différentes.",
      beforeLabel: "QR vers PDF",
      afterLabel: "QR vers Vistaire",
      rows: [
        {
          label: "Première impression",
          before: "Un document statique qui ressemble à une piece jointe.",
          after: "Une carte mobile qui porte l'identite du restaurant."
        },
        {
          label: "Navigation",
          before: "Zoom, defilement de page, recherche difficile.",
          after: "Catégories, recherche, filtres et fiches accessibles."
        },
        {
          label: "Questions client",
          before: "Les allergènes et options restent difficiles à repérer.",
          after: "Les détails utiles sont visibles sur chaque fiche plat."
        },
        {
          label: "Suite restaurateur",
          before: "Le scan ne donne aucun retour exploitable.",
          after: "L'aperçu montre les plats et recherches qui attirent l'attention."
        }
      ]
    },
    faq: [
      {
        question: "Le QR code change-t-il si la carte change ?",
        answer:
          "Le principe d'un menu digital est de garder le même accès tout en faisant évoluer la carte côté contenu. Le support QR peut donc rester stable."
      },
      {
        question: "Un menu QR code est-il adapté à un restaurant premium ?",
        answer:
          "Oui, si l'expérience ouverte par le QR code est soignée, rapide et utile. Un simple PDF donne souvent une impression moins maîtrisée."
      },
      {
        question: "Le client doit-il télécharger quelque chose ?",
        answer:
          "Non. Le menu Vistaire s'ouvre dans le navigateur du téléphone après le scan."
      },
      {
        question: "Peut-on montrer les plats indisponibles ?",
        answer:
          "Oui, les états de disponibilité peuvent être présentés clairement pour éviter les choix frustrants."
      },
      {
        question: "Le QR code suffit-il à moderniser un menu ?",
        answer:
          "Non. Le QR code est seulement l'accès. La modernisation vient de la lisibilité mobile, des fiches plats, des photos et des signaux utiles."
      }
    ],
    relatedLinks: [
      {
        href: "/menu-digital-restaurant",
        label: "Menu digital restaurant",
        description: "Voir la page pilier sur l'expérience Vistaire."
      },
      {
        href: "/menu-pdf-vs-menu-digital",
        label: "Alternative au menu PDF",
        description: "Comparer concrètement PDF QR et menu vivant."
      },
      {
        href: "/demo",
        label: "Démo Vistaire",
        description: "Ouvrir le parcours client exemple."
      }
    ],
    service: {
      name: "Menu QR code Vistaire",
      serviceType: "Menu QR code premium pour restaurants",
      description:
        "Expérience de menu QR code pour restaurants avec parcours mobile, fiches plats, photos, allergènes et aperçu restaurateur."
    }
  },
  "menu-3d-ar-restaurant": {
    key: "menu-3d-ar-restaurant",
    path: "/menu-3d-ar-restaurant",
    metadataTitle: "Menu 3D/AR pour restaurant | Vistaire",
    metadataDescription:
      "Vistaire enrichit les fiches plats avec des vues 3D/AR quand disponibles, tout en gardant photos, allergènes, badges et parcours mobile rapide.",
    h1: "Menu 3D et AR pour restaurant",
    answer: [
      "Un menu 3D/AR permet de montrer certains plats sous forme immersive depuis leur fiche, quand les assets et l'appareil du client le permettent.",
      "Vistaire garde une base solide même sans AR: photo, description, prix, allergènes et détails utiles restent toujours lisibles."
    ],
    heroVariant: "ar",
    heroImage: {
      src: "/images/demo/dishes/homard-bleu-bisque-fenouil.png",
      alt: "Plat signature Vistaire pouvant etre explore en vue 3D ou AR quand disponible"
    },
    primaryCta: {
      href: "/demo/dishes/homard-bisque",
      label: "Voir la fiche homard",
      description: "Explorer une fiche plat avec vue immersive."
    },
    secondaryCta: {
      href: "/demo",
      label: "Explorer le menu client",
      description: "Voir la carte complète de démonstration."
    },
    sections: [
      {
        heading: "Qu'est-ce qu'un menu 3D/AR pour restaurant ?",
        body: [
          "C'est une fiche plat qui peut afficher une vue 3D, ou une option AR lorsque le modèle, le format et le téléphone sont compatibles.",
          "La 3D ne doit pas remplacer les fondamentaux du choix: belle photo, description précise, prix, allergènes, options et disponibilité."
        ],
        points: [
          "3D sélective sur les plats qui méritent une mise en scène.",
          "AR seulement lorsque le support technique est prêt.",
          "Fallback premium si la vue immersive n'est pas disponible.",
          "Pas de promesse que tout fonctionne partout."
        ]
      },
      {
        heading: "Quels plats méritent une vue immersive ?",
        body: [
          "Les plats signatures, les assiettes à forte valeur perçue, les desserts spectaculaires et certains cocktails se prêtent mieux à l'immersion.",
          "Un plat simple peut rester photo-only. L'intérêt est de donner plus de présence aux plats qui gagnent vraiment à être visualisés."
        ]
      },
      {
        heading: "Que se passe-t-il si l'AR n'est pas disponible ?",
        body: [
          "L'expérience ne doit pas s'effondrer. Le client garde la photo, la fiche plat, les allergènes, les options et la description.",
          "Vistaire présente l'immersion comme un niveau supplémentaire, pas comme une condition obligatoire pour comprendre le menu."
        ]
      },
      {
        heading: "Comment proteger la performance mobile ?",
        body: [
          "Les modèles 3D ne doivent pas etre charges comme une decoration de page. Ils doivent apparaitre au bon moment, quand le client manifeste une intention.",
          "Cette approche garde les pages SEO légères et préserve la démo client, surtout sur réseau mobile ou en salle avec peu de bande passante."
        ]
      }
    ],
    visual: {
      heading: "Photo, fiche, 3D, AR: le bon ordre",
      body:
        "L'immersion fonctionne mieux quand elle arrive après une fiche claire, pas avant.",
      steps: [
        {
          title: "Photo d'abord",
          body:
            "La photo donne immédiatement une idée du dressage et du niveau de cuisine."
        },
        {
          title: "Détails utiles",
          body:
            "Ingrédients, allergènes, options et note du chef rassurent avant l'interaction immersive."
        },
        {
          title: "Vue 3D",
          body:
            "Le client peut explorer le volume du plat lorsque le modèle est disponible."
        },
        {
          title: "AR compatible",
          body:
            "L'affichage dans l'espace reste conditionne par l'appareil, le navigateur et les assets valides."
        },
        {
          title: "Fallback premium",
          body:
            "Si l'AR n'est pas possible, la fiche reste vendable et claire."
        }
      ]
    },
    comparison: {
      heading: "Immersion utile vs effet gadget",
      body:
        "La 3D/AR doit aider à comprendre et valoriser le plat. Elle perd son sens si elle ralentit toute la carte.",
      beforeLabel: "3D imposee partout",
      afterLabel: "3D/AR sélective Vistaire",
      rows: [
        {
          label: "Portee",
          before: "Tous les plats deviennent dépendants d'assets lourds.",
          after: "Seuls les plats qui gagnent en présence passent en 3D."
        },
        {
          label: "Compatibilite",
          before: "Promesse fragile si un téléphone ne supporte pas l'AR.",
          after: "Message honnête et fiche plat solide en fallback."
        },
        {
          label: "Performance",
          before: "Chargement inutile avant l'intention du client.",
          after: "Expérience chargée au bon moment, depuis la fiche plat."
        },
        {
          label: "Valeur business",
          before: "Effet spectaculaire mais peu relie au choix.",
          after: "Accent sur plats signatures, perception et decision."
        }
      ]
    },
    faq: [
      {
        question: "L'AR fonctionne-t-elle sur tous les téléphones ?",
        answer:
          "Non. L'AR dépend du modèle disponible, du format, du navigateur et de l'appareil. Vistaire doit toujours garder une fiche plat premium en fallback."
      },
      {
        question: "Faut-il modeliser toute la carte ?",
        answer:
          "Non. La 3D/AR est plus pertinente pour certains plats signatures, desserts, cocktails ou assiettes à forte valeur perçue."
      },
      {
        question: "Que voit le client si la 3D n'est pas chargée ?",
        answer:
          "Il conserve la photo, le prix, la description, les allergènes, les options et le reste de la fiche plat."
      },
      {
        question: "La 3D ralentit-elle le menu ?",
        answer:
          "Elle peut le faire si elle est chargée trop tôt. Vistaire privilégie une approche sélective et liée à l'intention du client."
      },
      {
        question: "La 3D/AR est-elle utile en restauration haut de gamme ?",
        answer:
          "Oui lorsqu'elle valorise un plat qui mérite d'être observé. Elle doit rester élégante, sobre et au service du choix."
      }
    ],
    relatedLinks: [
      {
        href: "/demo/dishes/homard-bisque",
        label: "Fiche homard immersive",
        description: "Voir une fiche plat avec vue 3D/AR quand disponible."
      },
      {
        href: "/menu-digital-restaurant",
        label: "Menu digital premium",
        description: "Replacer la 3D dans l'expérience complète Vistaire."
      },
      {
        href: "/demo",
        label: "Menu client Vistaire",
        description: "Parcourir la carte exemple avant la fiche immersive."
      }
    ],
    service: {
      name: "Menu 3D/AR Vistaire",
      serviceType: "Présentation 3D/AR sélective pour menus de restaurants",
      description:
        "Enrichissement de fiches plats avec vues 3D/AR quand les assets et appareils le permettent, avec fallback premium."
    }
  },
  "menu-pdf-vs-menu-digital": {
    key: "menu-pdf-vs-menu-digital",
    path: "/menu-pdf-vs-menu-digital",
    metadataTitle: "Menu PDF vs menu digital restaurant | Vistaire",
    metadataDescription:
      "Comparez menu PDF et menu digital pour restaurant: lisibilité mobile, photos, allergènes, mises à jour, expérience client et valeur perçue.",
    h1: "Menu PDF ou menu digital: que choisir pour un restaurant ?",
    answer: [
      "Un PDF peut suffire pour une carte courte, stable et rarement consultee sur téléphone.",
      "Un menu digital devient plus pertinent lorsqu'un restaurant veut une lecture mobile propre, des photos, des fiches plats, des allergènes clairs, des signatures valorisées et un aperçu de ce que les clients consultent."
    ],
    heroVariant: "pdf",
    heroImage: {
      src: "/images/demo/dishes/souffle-chocolat-grand-cru.png",
      alt: "Comparaison entre menu PDF statique et fiche plat digitale Vistaire"
    },
    primaryCta: {
      href: "/demo",
      label: "Comparer dans la démo",
      description: "Voir le menu digital Vistaire en situation."
    },
    secondaryCta: {
      href: "/admin",
      label: "Voir l'aperçu restaurateur",
      description: "Comprendre ce que le PDF ne montre pas."
    },
    sections: [
      {
        heading: "Quand un PDF reste-t-il suffisant ?",
        body: [
          "Un PDF reste acceptable pour une carte courte, très stable, avec peu de photos et peu de variations. Il peut aussi servir de support secondaire pour une carte imprimee déjà très claire.",
          "Le probleme commence quand le PDF devient l'expérience principale du client sur mobile: petits textes, zoom, pages figés, allergènes disperses et aucun signal sur ce qui intéresse vraiment les convives."
        ],
        points: [
          "Carte courte et très stable: PDF possible.",
          "Carte visuelle, évolutive ou premium: menu digital préférable.",
          "Besoin d'allergènes lisibles: fiche plat plus claire.",
          "Besoin de comprendre l'attention client: PDF insuffisant."
        ]
      },
      {
        heading: "Pourquoi le PDF fatigue souvent sur mobile ?",
        body: [
          "Le PDF a été pensé pour une page, pas pour un pouce. Il force souvent le client à zoomer, déplacer, revenir en arrière et chercher dans une mise en page trop large.",
          "À table, cette friction compte: le client veut comparer deux plats, vérifier un allergène, regarder une photo ou comprendre une option sans interrompre la conversation."
        ]
      },
      {
        heading: "Ce qu'un menu digital change à table",
        body: [
          "Le menu digital transforme la carte en parcours: catégories, vignettes, badges, recherche, filtres, fiches plats et CTA clairs.",
          "La valeur n'est pas seulement technique. Un plat signature peut être photographié, décrit, complété par ses allergènes et, quand disponible, présenté en 3D/AR."
        ]
      },
      {
        heading: "Comment migrer sans perdre la simplicite ?",
        body: [
          "Le bon compromis n'est pas d'ajouter un logiciel lourd à la salle. C'est de conserver le geste simple du QR code et de remplacer la destination par une expérience lisible.",
          "Vistaire garde le parcours court: scan, carte, fiche plat, démo immersive si pertinente, puis aperçu restaurateur pour lire les signaux."
        ]
      }
    ],
    visual: {
      heading: "Avant / après: le même scan, pas le même effet",
      body:
        "Le QR code ne change pas. Ce qui change, c'est la qualite de la destination.",
      steps: [
        {
          title: "PDF statique",
          body:
            "Le client ouvre un document, zoome, puis cherche les informations utiles."
        },
        {
          title: "Menu mobile",
          body:
            "La carte s'adapte au téléphone, avec catégories et plats lisibles."
        },
        {
          title: "Fiche détaillée",
          body:
            "Chaque plat peut montrer photo, description, allergènes, options et prix."
        },
        {
          title: "Signal restaurateur",
          body:
            "Le restaurant comprend quels plats, recherches et moments attirent l'attention."
        }
      ]
    },
    comparison: {
      heading: "Comparatif concret",
      body:
        "Le choix ne se résume pas à papier contre digital. Il dépend de la lisibilité, de la valeur perçue et des informations que le restaurant veut mettre à disposition.",
      beforeLabel: "Menu PDF",
      afterLabel: "Menu digital Vistaire",
      rows: [
        {
          label: "Lecture mobile",
          before: "Zoom et déplacement dans une page conçue pour l'impression.",
          after: "Cartes, titrès et actions dimensionnes pour le téléphone."
        },
        {
          label: "Photos",
          before: "Images absentes, petites ou compressées dans le document.",
          after: "Photos mises en scene dans les cartes et fiches plats."
        },
        {
          label: "Allergènes",
          before: "Notes souvent séparées, difficiles à repérer vite.",
          after: "Badges et sections dediees sur les fiches."
        },
        {
          label: "Mises à jour",
          before: "Nouveau fichier à exporter et remplacer.",
          after: "Carte conçue pour évoluer sans changer le geste du scan."
        },
        {
          label: "3D / AR",
          before: "Aucune expérience immersive native.",
          after: "Possible sur certains plats quand les assets sont disponibles."
        },
        {
          label: "Aperçu restaurateur",
          before: "Aucune lecture des consultations.",
          after: "Signaux anonymes sur plats ouverts, recherches et vues."
        }
      ]
    },
    faq: [
      {
        question: "Un menu PDF est-il mauvais pour tous les restaurants ?",
        answer:
          "Non. Un PDF peut convenir à une carte très courte et stable. Il devient limite quand le mobile, les photos, les allergènes et les fiches plats comptent vraiment."
      },
      {
        question: "Pourquoi un menu digital est-il plus lisible sur téléphone ?",
        answer:
          "Il est compose pour l'écran: titrès, cartes, boutons, catégories et sections détaillées au lieu d'une page à zoomer."
      },
      {
        question: "Un menu digital peut-il rester simple ?",
        answer:
          "Oui. Le client doit pouvoir scanner, parcourir les catégories et ouvrir une fiche plat sans parcours complique."
      },
      {
        question: "Le PDF donne-t-il des informations au restaurateur ?",
        answer:
          "Non, pas naturellement. Vistaire peut montrer des signaux anonymes comme les plats consultes, recherches et vues immersives."
      },
      {
        question: "Comment commencer sans tout refaire ?",
        answer:
          "Le plus simple est de garder le geste du QR code et de remplacer le PDF par une expérience mobile avec les plats les plus importants bien présentés."
      }
    ],
    relatedLinks: [
      {
        href: "/menu-digital-restaurant",
        label: "Menu digital restaurant",
        description: "Comprendre l'expérience Vistaire complète."
      },
      {
        href: "/menu-qr-code-restaurant",
        label: "Menu QR code restaurant",
        description: "Transformer le QR code en expérience client."
      },
      {
        href: "/demo",
        label: "Démo Vistaire",
        description: "Voir ce qu'un client ouvre après le scan."
      }
    ],
    service: {
      name: "Alternative premium au menu PDF",
      serviceType: "Menu digital premium pour remplacer un PDF QR",
      description:
        "Alternative au menu PDF restaurant avec lecture mobile, fiches plats, photos, allergènes, 3D/AR quand disponibles et aperçu restaurateur."
    }
  }
};

export function getSeoPage(key: SeoPageKey): SeoPageData {
  return SEO_PAGES[key];
}

export function getSeoPages(): SeoPageData[] {
  return SEO_PAGE_ORDER.map((key) => SEO_PAGES[key]);
}

