import { useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
// Avatar/Compte/Form/Pathologies extraits en composants dédiés
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  useMyProfile,
  usePathologies,
  useMyPathologies,
  useMyProfileHistory,
  useMyCustomPathologies,
  useAddMyCustomPathology,
  useToggleMyCustomPathologyHidden,
  usePromoteCustomPathologies,
  useDemoteDefaultPathologyToCustom,
  useAdminDeleteDefaultPathology,
  useAdminDeleteCustomPathology,
} from "@/hooks/useProfile";
import type { ProfileInput } from "@/lib/db/profiles";
import { profileInputSchema } from "@/lib/db/profiles";
import { AvatarManagerCard } from "./profile/components/AvatarManagerCard";
import { AccountInfoCard } from "./profile/components/AccountInfoCard";
import { ProfileForm } from "./profile/components/ProfileForm";
import { PathologiesSection } from "./profile/components/pathologies/PathologiesSection";

const Profil = () => {
  const { user } = useAuth();

  // Queries & mutations
  const profileQ = useMyProfile();
  const pathologiesQ = usePathologies();
  const myPathos = useMyPathologies();
  const myCustom = useMyCustomPathologies();
  const addCustom = useAddMyCustomPathology();
  const toggleCustomHidden = useToggleMyCustomPathologyHidden();
  const promoteCustom = usePromoteCustomPathologies();
  const demoteDefault = useDemoteDefaultPathologyToCustom();
  const delDefault = useAdminDeleteDefaultPathology();
  const delCustom = useAdminDeleteCustomPathology();
  const sanitizeCode = (s: string) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2);
  useMyProfileHistory(10); // prime cache (affichage optionnel)
  
  const showAdmin = user?.user_metadata?.role === "admin";
  // Masquage UI de la section "Confidentialité" (fonctionnalité conservée)
  const showPrivacy = false;

  // Form init
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: {
      login: "",
      first_name: "",
      last_name: "",
      age: undefined,
      height_cm: undefined,
      weight_kg: undefined,
      needs_kcal: undefined,
      needs_protein_g: undefined,
      needs_carbs_g: undefined,
      needs_fat_g: undefined,
      needs_display_mode: undefined,
      privacy: {},
    },
  });

  // Populate on load
  useEffect(() => {
    const p = profileQ.data;
    if (!p) return;
    form.reset({
      login: p.login ?? "",
      first_name: p.first_name ?? "",
      last_name: p.last_name ?? "",
      age: p.age ?? undefined,
      height_cm: p.height_cm ?? undefined,
      weight_kg: p.weight_kg ?? undefined,
      needs_kcal: p.needs_kcal ?? undefined,
      needs_protein_g: p.needs_protein_g ?? undefined,
      needs_carbs_g: p.needs_carbs_g ?? undefined,
      needs_fat_g: p.needs_fat_g ?? undefined,
      needs_display_mode: p.needs_display_mode ?? undefined,
      privacy: p.privacy ?? {},
    });
  }, [profileQ.data]);
  const initial = profileQ.data;

  // Initiales pour l'avatar
  const initials = useMemo(() => {
    const f = (profileQ.data?.first_name || "").trim();
    const l = (profileQ.data?.last_name || "").trim();
    const base = (f ? f[0] : "") + (l ? l[0] : "");
    return (base || (user?.email?.[0] ?? "?")).toUpperCase();
  }, [profileQ.data?.first_name, profileQ.data?.last_name, user?.email]);

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AccountInfoCard email={user?.email} userId={user?.id} createdAt={(user as any)?.created_at ?? null} />
          <AvatarManagerCard
            initialAvatarPath={profileQ.data?.avatar_url}
            userRoleIsAdmin={showAdmin}
            initials={initials}
          />
        </div>

        <ProfileForm form={form} initial={initial} showPrivacy={showPrivacy} />

        <PathologiesSection
          defaultPathologies={pathologiesQ.data ?? []}
          selectedPathologies={myPathos.list.data ?? []}
          customPathologies={myCustom.data ?? []}
          showAdmin={showAdmin}
          sanitizeCode={sanitizeCode}
          onAddDefault={async (pathologyId) => { await myPathos.add.mutateAsync(pathologyId); }}
          onRemoveDefault={async (pathologyId) => { await myPathos.remove.mutateAsync(pathologyId); }}
          onDemoteToCustom={async (pathologyId) => { await demoteDefault.mutateAsync(pathologyId); }}
          onDeleteDefault={async (pathologyId) => { await delDefault.mutateAsync(pathologyId); }}
          onToggleCustomHidden={async (id, hidden) => { await toggleCustomHidden.mutateAsync({ id, hidden }); }}
          onPromoteToDefault={async (id) => { await promoteCustom.mutateAsync([id]); }}
          onDeleteCustom={async (id) => { await delCustom.mutateAsync(id); }}
          onAddCustom={async (payload) => { await addCustom.mutateAsync(payload); }}
          loadingStates={{
            addDefault: myPathos.add.isPending,
            removeDefault: myPathos.remove.isPending,
            demoteDefault: demoteDefault.isPending,
            deleteDefault: delDefault.isPending,
            toggleCustom: toggleCustomHidden.isPending,
            promoteCustom: promoteCustom.isPending,
            deleteCustom: delCustom.isPending,
            addCustom: addCustom.isPending,
          }}
        />
      </div>
    </AppLayout>
  );
};

export default Profil;
