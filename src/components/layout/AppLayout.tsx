import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden" />
              <Link to="/" className="flex items-center gap-3 group">
                <img src="/src/assets/app-icon.png" alt="NutriSanté+" className="w-8 h-8" />
                <h1 className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent group-hover:opacity-90">
                  NutriSanté+
                </h1>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground hidden md:block">
                Votre assistant santé & nutrition
              </div>
              <Link to="/login">
                <Button variant="outline" size="sm">Se connecter</Button>
              </Link>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}