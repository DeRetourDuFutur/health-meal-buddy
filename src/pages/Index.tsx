import { AppLayout } from "@/components/layout/AppLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";

const Index = () => {
  return (
    <AppLayout>
      <div className="space-y-0">
        <HeroSection />
        <FeaturesSection />
      </div>
    </AppLayout>
  );
};

export default Index;
