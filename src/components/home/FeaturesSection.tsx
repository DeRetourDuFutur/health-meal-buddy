import { FeatureCard } from "./FeatureCard";
import { Calendar, Heart, Apple } from "lucide-react";

const featuresData = [
  {
    icon: Calendar,
    title: "Planification Intelligente",
    description: "Créez automatiquement des menus hebdomadaires personnalisés selon vos besoins nutritionnels et vos contraintes médicales.",
    features: [
      "Génération automatique de menus IG bas",
      "Adaptation au taux de cholestérol",
      "Prise en compte des allergies et préférences",
      "Export PDF des menus et recettes",
      "Liste de courses automatique"
    ],
    buttonText: "Planifier mes repas",
    variant: "success" as const
  },
  {
    icon: Heart,
    title: "Suivi Médical Complet",
    description: "Gérez vos traitements, suivez vos indicateurs de santé et recevez des rappels personnalisés pour ne rien oublier.",
    features: [
      "Gestion des médicaments et posologies",
      "Rappels de prise et recharge stock",
      "Suivi glycémie et cholestérol",
      "Historique et tendances de santé",
      "Alertes et recommandations"
    ],
    buttonText: "Gérer ma santé",
    variant: "medical" as const,
    comingSoon: true
  },
  {
    icon: Apple,
    title: "Base Alimentaire Enrichie",
    description: "Accédez à une base de données complète d'aliments avec toutes leurs valeurs nutritionnelles et indices glycémiques.",
    features: [
      "Plus de 1000 aliments référencés",
      "Indices glycémiques et cholestérol",
      "Valeurs nutritionnelles complètes",
      "Filtres par catégories et préférences",
      "Système de favoris et exclusions"
    ],
    buttonText: "Explorer les aliments",
    variant: "nutrition" as const,
    comingSoon: true
  }
];

export function FeaturesSection() {
  return (
  <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Fonctionnalités Principales
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Découvrez tous les outils nécessaires pour une gestion optimale de votre alimentation
            et de votre santé au quotidien.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {featuresData.map((feature, index) => (
            <div 
              key={feature.title}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <FeatureCard {...feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}