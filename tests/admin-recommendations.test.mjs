import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRuleBasedAdminAssistantAnswer,
  buildRuleBasedAdminRecommendations,
  calculateDishInterestScore,
  containsForbiddenAdminAssistantContent,
  getSearchInterpretation,
  isAdminAssistantQuestionInScope,
  isMenuAuditQuestion
} from "../lib/admin/recommendations.ts";

const dish = {
  id: "dish-homard",
  slug: "homard-bisque",
  name: "Homard bleu",
  categorySlug: "plats-signatures",
  shortDescription: "",
  description: "",
  price: 0,
  image: null,
  ingredients: [],
  allergens: [],
  options: [],
  sides: [],
  chefRecommendation: "",
  isSignature: true,
  isRecommended: true,
  isAvailable: true,
  preparationTime: "",
  model3dUrl: "",
  usdzUrl: ""
};

const category = {
  id: "cat-signatures",
  slug: "plats-signatures",
  name: "Plats signatures",
  description: "",
  order: 1
};

const baseInsights = {
  generatedFor: "Maison Elyse",
  serviceLabel: "Aujourd'hui",
  summary: [
    {
      id: "menu-opens",
      label: "Ouvertures du menu aujourd'hui",
      value: "120",
      helper: "Clients qui ont ouvert la carte."
    },
    {
      id: "anonymous-sessions",
      label: "Sessions anonymes",
      value: "84",
      helper: "Sessions anonymes detectees."
    },
    {
      id: "top-category",
      label: "Categorie la plus populaire",
      value: "Plats signatures",
      helper: "Section la plus consultee."
    }
  ],
  topDishes: [
    {
      rank: 1,
      dish,
      category,
      views: 80,
      averageTime: "Non suivi",
      immersiveInteractions: 8,
      interestScore: 100,
      interestLevel: "Très fort"
    }
  ],
  searchInsights: [
    {
      term: "sans gluten",
      count: 12,
      trend: "En hausse",
      interpretation: "Préférences alimentaires présentes"
    }
  ],
  immersiveInsights: [],
  engagementFunnel: [
    {
      id: "menu-opened",
      label: "Menu ouvert",
      value: 120,
      share: 100,
      helper: "Ouvertures du menu."
    },
    {
      id: "dish-opened",
      label: "Plat ouvert",
      value: 80,
      share: 67,
      helper: "Fiches plats ouvertes."
    }
  ],
  serviceActivity: [],
  recommendations: []
};

test("scores dish interest from tracked views, immersive actions and related searches", () => {
  assert.equal(
    calculateDishInterestScore({
      views: 40,
      immersiveInteractions: 5,
      relatedSearchCount: 8,
      maxRawScore: 71
    }),
    100
  );

  assert.equal(
    calculateDishInterestScore({
      views: 2,
      immersiveInteractions: 0,
      relatedSearchCount: 0,
      maxRawScore: 71
    }),
    3
  );
});

test("interprets common restaurant search terms without inventing sales metrics", () => {
  assert.equal(getSearchInterpretation("sans gluten"), "Préférences alimentaires présentes");
  assert.equal(getSearchInterpretation("homard"), "Fort intérêt signature");
  assert.equal(getSearchInterpretation("dessert"), "Intérêt en fin de repas");
  assert.equal(getSearchInterpretation("vegetarien"), "Préférence alimentaire suivie");
  assert.equal(getSearchInterpretation("cocktail"), "Attention en fin de soirée");
  assert.equal(getSearchInterpretation("inconnu"), "Lecture à suivre");
});

test("builds concrete rule-based admin recommendations from available menu activity only", () => {
  const recommendations = buildRuleBasedAdminRecommendations(baseInsights);

  assert.ok(recommendations.length >= 3);
  assert.ok(recommendations.some((item) => item.title.includes("Homard bleu")));
  assert.ok(recommendations.some((item) => item.title.includes("sans gluten")));
  assert.ok(
    recommendations.every(
      (item) => !containsForbiddenAdminAssistantContent(`${item.type} ${item.title} ${item.body}`)
    )
  );
});

test("keeps quick questions scoped to menu activity", () => {
  assert.equal(
    isAdminAssistantQuestionInScope("Quel plat devrais-je mettre en avant ce soir ?"),
    true
  );
  assert.equal(
    isAdminAssistantQuestionInScope("Quelle catégorie attire le plus les clients ?"),
    true
  );
  assert.equal(isAdminAssistantQuestionInScope("Quel plat améliore le CA ?"), false);
  assert.equal(isAdminAssistantQuestionInScope("Quel est le profit du restaurant ?"), false);
  assert.equal(isAdminAssistantQuestionInScope("Peux-tu ecrire une chanson ?"), false);
});

test("answers summaries and questions with concise menu-only fallback", () => {
  const summary = buildRuleBasedAdminAssistantAnswer({
    insights: baseInsights,
    mode: "summary"
  });
  const answer = buildRuleBasedAdminAssistantAnswer({
    insights: baseInsights,
    mode: "question",
    question: "Qu'est-ce que les clients cherchent le plus ?"
  });

  assert.match(summary, /Homard bleu/);
  assert.match(summary, /sans gluten/);
  assert.match(answer, /sans gluten/);
  assert.equal(containsForbiddenAdminAssistantContent(`${summary} ${answer}`), false);
});

test("answers lower-attention questions as neutral attention trends", () => {
  const secondDish = {
    ...dish,
    id: "dish-negroni",
    slug: "negroni-fut",
    name: "Negroni"
  };
  const answer = buildRuleBasedAdminAssistantAnswer({
    insights: {
      ...baseInsights,
      topDishes: [
        ...baseInsights.topDishes,
        {
          rank: 2,
          dish: secondDish,
          category,
          views: 12,
          averageTime: "Non suivi",
          immersiveInteractions: 0,
          interestScore: 18,
          interestLevel: "Plus discret"
        }
      ]
    },
    mode: "question",
    question: "Quels plats reçoivent moins d'attention aujourd'hui ?"
  });

  assert.match(answer, /Negroni/);
  assert.match(answer, /moins d'attention/);
  assert.equal(containsForbiddenAdminAssistantContent(answer), false);
});

test("reframes menu-audit questions as client behavior without critique", () => {
  const answer = buildRuleBasedAdminAssistantAnswer({
    insights: baseInsights,
    mode: "question",
    question: "Comment améliorer mon menu ?"
  });

  assert.equal(isMenuAuditQuestion("Comment améliorer mon menu ?"), true);
  assert.match(answer, /comportement des clients/);
  assert.match(answer, /Homard bleu/);
  assert.equal(containsForbiddenAdminAssistantContent(answer), false);
});

test("flags menu-quality and business wording as forbidden assistant content", () => {
  assert.equal(
    containsForbiddenAdminAssistantContent("Le menu devrait être mieux organisé."),
    true
  );
  assert.equal(
    containsForbiddenAdminAssistantContent("La photo n'est pas assez bonne."),
    true
  );
  assert.equal(
    containsForbiddenAdminAssistantContent("Quel plat améliore le CA ?"),
    true
  );
  assert.equal(
    containsForbiddenAdminAssistantContent(
      "Les clients consultent surtout le Homard bleu aujourd'hui."
    ),
    false
  );
});
