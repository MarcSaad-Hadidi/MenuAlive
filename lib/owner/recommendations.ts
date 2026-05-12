import "server-only";

import { generateMistralOwnerRecommendations } from "@/lib/ai/mistral";
import type {
  OwnerDashboardData,
  OwnerRecommendation,
  OwnerRestaurant,
  OwnerStats
} from "@/lib/owner/types";

type RecommendationResult = {
  recommendations: OwnerRecommendation[];
  source: OwnerDashboardData["recommendationSource"];
};

export function buildRuleBasedOwnerRecommendations(args: {
  stats: OwnerStats;
  restaurants: OwnerRestaurant[];
  storedRecommendations?: OwnerRecommendation[];
}): OwnerRecommendation[] {
  const recommendations: OwnerRecommendation[] = [
    ...(args.storedRecommendations ?? [])
  ];
  const setupRestaurant = args.restaurants.find(
    (restaurant) => restaurant.status === "setup_needed"
  );
  const mostActive = [...args.restaurants].sort(
    (a, b) => b.openingsToday + b.interactionsToday - (a.openingsToday + a.interactionsToday)
  )[0];
  const lowActivity = args.restaurants.find(
    (restaurant) =>
      restaurant.status === "active" &&
      restaurant.openingsToday === 0 &&
      restaurant.interactionsToday === 0
  );

  if (setupRestaurant) {
    recommendations.push({
      id: `setup-${setupRestaurant.id}`,
      title: `${setupRestaurant.name} reste à configurer.`,
      body: "Priorisez les plats, les photos et les liens de menu avant de l'envoyer à un client.",
      restaurantName: setupRestaurant.name,
      type: "setup",
      source: "rules"
    });
  }

  if (mostActive && mostActive.openingsToday + mostActive.interactionsToday > 0) {
    recommendations.push({
      id: `active-${mostActive.id}`,
      title: `${mostActive.name} montre un bon signal d'activité.`,
      body: "C'est un bon candidat pour une discussion de conversion ou d'extension immersive.",
      restaurantName: mostActive.name,
      type: "upsell",
      source: "rules"
    });
  }

  if (lowActivity) {
    recommendations.push({
      id: `low-${lowActivity.id}`,
      title: `${lowActivity.name} a peu d'activité récente.`,
      body: "Vérifiez que le QR code est visible et que le lien de menu est bien utilisé pendant le service.",
      restaurantName: lowActivity.name,
      type: "watch",
      source: "rules"
    });
  }

  if (args.stats.immersiveInteractionsToday > 0) {
    recommendations.push({
      id: "immersive-upsell",
      title: "Les vues immersives créent déjà de l'engagement.",
      body: "Mettez en avant les restaurants qui utilisent la 3D ou l'AR : ce sont les meilleurs candidats pour une offre premium.",
      type: "opportunity",
      source: "rules"
    });
  }

  return recommendations.slice(0, 6);
}

export async function getAutomaticOwnerRecommendations(args: {
  stats: OwnerStats;
  restaurants: OwnerRestaurant[];
  storedRecommendations?: OwnerRecommendation[];
}): Promise<RecommendationResult> {
  const mistralRecommendations = await generateMistralOwnerRecommendations({
    stats: {
      totalRestaurants: args.stats.totalRestaurants,
      menuOpensToday: args.stats.menuOpensToday,
      dishViewsToday: args.stats.dishViewsToday,
      immersiveInteractionsToday: args.stats.immersiveInteractionsToday
    },
    restaurants: args.restaurants.map((restaurant) => ({
      name: restaurant.name,
      status: restaurant.status,
      openingsToday: restaurant.openingsToday,
      interactionsToday: restaurant.interactionsToday,
      dishCount: restaurant.dishCount,
      lastActivity: restaurant.lastActivity
    }))
  });

  if (mistralRecommendations?.length) {
    return {
      recommendations: [
        ...(args.storedRecommendations ?? []),
        ...mistralRecommendations
      ].slice(0, 6),
      source: "mistral"
    };
  }

  if (args.storedRecommendations?.length) {
    return {
      recommendations: buildRuleBasedOwnerRecommendations(args),
      source: "stored"
    };
  }

  return {
    recommendations: buildRuleBasedOwnerRecommendations(args),
    source: "rules"
  };
}
