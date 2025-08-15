import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Apple, Calendar, BarChart3 } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const features = [
  {
    icon: Calendar,
    title: "Planification Intelligente",
    description: "Menus personnalisés selon votre IG et cholestérol",
    color: "text-primary"
  },
  {
    icon: Apple,
    title: "Base Alimentaire",
    description: "Plus de 1000 aliments avec indices nutritionnels",
    color: "text-success"
  },
  {
    icon: Heart,
    title: "Suivi Médical",
    description: "Gestion médicaments et rappels personnalisés",
    color: "text-secondary"
  },
  {
    icon: BarChart3,
    title: "Analyse Avancée",
    description: "Statistiques détaillées de votre progression",
    color: "text-accent"
  }
];

export function HeroSection() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center space-y-8 animate-fade-in">
          {/* Logo and title */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <img 
                src="/src/assets/app-icon.png" 
                alt="NutriSanté+" 
                className="w-20 h-20 animate-bounce-in"
              />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-hero bg-clip-text text-transparent leading-tight">
              NutriSanté+
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Votre compagnon intelligent pour une alimentation adaptée au 
              <span className="text-primary font-semibold"> diabète type 2</span> et au 
              <span className="text-secondary font-semibold"> cholestérol</span>
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="hero" size="xl" className="min-w-48">
              Commencer maintenant
            </Button>
            <Button variant="outline" size="xl" className="min-w-48">
              En savoir plus
            </Button>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {features.map((feature, index) => (
              <Card 
                key={feature.title}
                className="p-6 text-center hover:scale-105 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <feature.icon className={`w-12 h-12 mx-auto mb-4 ${feature.color}`} />
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">1000+</div>
              <div className="text-muted-foreground">Aliments référencés</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-secondary">500+</div>
              <div className="text-muted-foreground">Recettes adaptées</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-success">24/7</div>
              <div className="text-muted-foreground">Suivi personnalisé</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}