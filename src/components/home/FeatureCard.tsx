import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  buttonText: string;
  variant: "medical" | "nutrition" | "success";
  comingSoon?: boolean;
}

export function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  features, 
  buttonText, 
  variant,
  comingSoon = false
}: FeatureCardProps) {
  const variantStyles = {
    medical: "border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10",
    nutrition: "border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10", 
    success: "border-success/20 bg-gradient-to-br from-success/5 to-success/10"
  };

  const iconStyles = {
    medical: "text-secondary",
    nutrition: "text-accent",
    success: "text-success"
  };

  return (
    <Card className={`p-6 space-y-6 relative overflow-hidden ${variantStyles[variant]}`}>
      {comingSoon && (
        <div className="absolute top-4 right-4 bg-warning text-warning-foreground text-xs px-2 py-1 rounded-full font-medium">
          Bientôt disponible
        </div>
      )}
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-background/50 ${iconStyles[variant]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        </div>
        
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <div className={`w-1.5 h-1.5 rounded-full mt-2 ${iconStyles[variant]} bg-current`} />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {comingSoon ? (
        <Button variant={variant} className="w-full" disabled>
          {buttonText}
        </Button>
      ) : (
        <Link to="/planification" className="block">
          <Button variant={variant} className="w-full">
            {buttonText}
          </Button>
        </Link>
      )}
    </Card>
  );
}