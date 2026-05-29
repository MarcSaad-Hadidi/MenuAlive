import type { OwnerAiPriority, OwnerRestaurant } from "@/lib/owner/types";

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/**
 * Deterministic copilot priorities. This is the always-available rules engine
 * that answers the operator questions (which restaurants to prioritize, which
 * QR to test, which menus are incomplete, what blocks publication, etc.).
 * The AI layer only ever proposes — it never mutates data.
 */
export function buildOwnerAiPriorities(
  restaurants: OwnerRestaurant[]
): OwnerAiPriority[] {
  const priorities: OwnerAiPriority[] = [];

  for (const restaurant of restaurants) {
    if (restaurant.isDemo) continue;

    if (restaurant.dishCount === 0) {
      priorities.push({
        id: `${restaurant.id}-menu`,
        title: `${restaurant.name} : menu vide`,
        body: "Aucun plat relié. Le menu public ne peut pas être publié tel quel.",
        priority: "high",
        restaurantName: restaurant.name,
        action: "Ajouter les plats du menu",
        href: "/owner/menus"
      });
    }

    if (restaurant.qrStatus !== "ready") {
      priorities.push({
        id: `${restaurant.id}-qr-generate`,
        title: `${restaurant.name} : QR à générer`,
        body: "Aucun QR sécurisé actif n'est marqué comme prêt pour ce restaurant.",
        priority: "high",
        restaurantName: restaurant.name,
        action: "Générer le QR sécurisé",
        href: "/owner/qr-codes"
      });
    } else {
      priorities.push({
        id: `${restaurant.id}-qr-test`,
        title: `${restaurant.name} : QR à tester`,
        body: "QR marqué prêt — scannez-le pour confirmer la redirection vers le menu.",
        priority: "low",
        restaurantName: restaurant.name,
        action: "Tester le scan du QR",
        href: "/owner/qr-codes"
      });
    }

    if (restaurant.incompleteDishCount > 0) {
      priorities.push({
        id: `${restaurant.id}-photos`,
        title: `${restaurant.name} : ${restaurant.incompleteDishCount} plats sans photo`,
        body: "Les plats sans visuel réduisent la qualité perçue du menu.",
        priority: "medium",
        restaurantName: restaurant.name,
        action: "Compléter les photos",
        href: "/owner/medias"
      });
    }

    if (restaurant.dishCount > 0 && restaurant.immersiveDishCount === 0) {
      priorities.push({
        id: `${restaurant.id}-immersive`,
        title: `${restaurant.name} : aucun plat 3D / AR`,
        body: "Choisir un plat signature pour une vue immersive renforce la valeur Vistaire.",
        priority: "low",
        restaurantName: restaurant.name,
        action: "Préparer un asset 3D / AR",
        href: "/owner/3d-ar"
      });
    }

    if (
      restaurant.status === "setup_needed" &&
      restaurant.dishCount > 0 &&
      restaurant.qrStatus === "ready" &&
      restaurant.incompleteDishCount === 0
    ) {
      priorities.push({
        id: `${restaurant.id}-publish`,
        title: `${restaurant.name} : prêt à publier`,
        body: "Menu, photos et QR sont en place. Validez la mise en ligne.",
        priority: "medium",
        restaurantName: restaurant.name,
        action: "Valider la publication",
        href: "/owner/restaurants"
      });
    }
  }

  return priorities
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    .slice(0, 12);
}
