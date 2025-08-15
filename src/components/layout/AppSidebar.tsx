import { useState } from "react";
import { 
  Home, 
  User, 
  Calendar, 
  ShoppingCart, 
  Pill, 
  BarChart3, 
  Settings,
  Apple,
  Heart,
  FileText
} from "lucide-react";
import { NavLink, useLocation, Link } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Accueil", url: "/", icon: Home },
  { title: "Mon Profil", url: "/profil", icon: User },
];

const planificationItems = [
  { title: "Planification Repas", url: "/planification", icon: Calendar },
  { title: "Aliments", url: "/aliments", icon: Apple },
  { title: "Recettes", url: "/recettes", icon: FileText },
  { title: "Liste de Courses", url: "/courses", icon: ShoppingCart },
];

const suiviItems = [
  { title: "Suivi Médical", url: "/suivi", icon: Heart },
  { title: "Médicaments", url: "/medicaments", icon: Pill },
  { title: "Statistiques", url: "/statistiques", icon: BarChart3 },
];

const autresItems = [
  { title: "Paramètres", url: "/parametres", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-accent/50 hover:text-accent-foreground";

  const MenuSection = ({ 
    items, 
    label 
  }: { 
    items: typeof navigationItems; 
    label: string; 
  }) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink 
                  to={item.url} 
                  end 
                  className={getNavClasses}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent className="bg-gradient-card">
        <div className="p-4 border-b">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/src/assets/app-icon.png" alt="NutriSanté+" className="w-8 h-8" />
              <div>
                <h2 className="font-bold text-lg bg-gradient-hero bg-clip-text text-transparent group-hover:opacity-90">
                  NutriSanté+
                </h2>
                <p className="text-xs text-muted-foreground">
                  Santé & Nutrition
                </p>
              </div>
            </Link>
          )}
        </div>

        <MenuSection items={navigationItems} label="Navigation" />
        <MenuSection items={planificationItems} label="Planification" />
        <MenuSection items={suiviItems} label="Suivi Médical" />
        <MenuSection items={autresItems} label="Autres" />
      </SidebarContent>
    </Sidebar>
  );
}