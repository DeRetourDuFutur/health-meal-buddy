import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyProfile,
  upsertMyProfile,
  listPathologies,
  listMyPathologies,
  addMyPathology,
  removeMyPathology,
  listMyProfileHistory,
  updateAvatar,
  getAvatarSignedUrl,
  isLoginAvailable,
  deleteAvatar,
  listMyCustomPathologies,
  addMyCustomPathology,
  removeMyCustomPathology,
  setMyCustomPathologyHidden,
  promoteCustomPathologies,
  demoteDefaultPathologyToCustom,
  deleteDefaultPathology,
  adminDeleteCustomPathology,
  computeBmi,
  bmiLabel,
  type Profile,
  type ProfileInput,
  type Pathology,
  type UserPathology,
  type ProfileHistory,
  type UserCustomPathology,
} from "@/lib/db/profiles";

// Query keys
const qk = {
  profile: ["profile", "me"] as const,
  pathologies: ["pathologies"] as const,
  myPathologies: ["pathologies", "me"] as const,
  history: ["profile_history", "me"] as const,
  myCustomPathologies: ["custom_pathologies", "me"] as const,
};

export function useMyProfile() {
  return useQuery<Profile | null>({
    queryKey: qk.profile,
    queryFn: getMyProfile,
  });
}

export function useUpsertMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileInput) => upsertMyProfile(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.profile });
      qc.invalidateQueries({ queryKey: qk.history });
    },
  });
}

export function usePathologies() {
  return useQuery<Pathology[]>({
    queryKey: qk.pathologies,
    queryFn: listPathologies,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyPathologies() {
  const qc = useQueryClient();
  const list = useQuery<UserPathology[]>({
    queryKey: qk.myPathologies,
    queryFn: listMyPathologies,
  });
  const add = useMutation({
    mutationFn: (pathology_id: string) => addMyPathology(pathology_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.myPathologies }),
  });
  const remove = useMutation({
    mutationFn: (pathology_id: string) => removeMyPathology(pathology_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.myPathologies }),
  });
  return { list, add, remove };
}

export function useMyProfileHistory(limit = 50) {
  return useQuery<ProfileHistory[]>({
    queryKey: [...qk.history, limit],
    queryFn: () => listMyProfileHistory(limit),
  });
}

export function useUpdateAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => updateAvatar(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile }),
  });
}

export function useDeleteAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (currentPath?: string | null) => deleteAvatar(currentPath),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile }),
  });
}

export async function getAvatarUrlOrNull(path?: string | null) {
  if (!path) return null;
  return await getAvatarSignedUrl(path);
}

export async function checkLoginAvailable(login: string) {
  return await isLoginAvailable(login);
}

// Custom pathologies hooks
export function useMyCustomPathologies() {
  return useQuery<UserCustomPathology[]>({
    queryKey: qk.myCustomPathologies,
    queryFn: listMyCustomPathologies,
  });
}

export function useAddMyCustomPathology() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: string | { label: string; code?: string | null }) => {
      if (typeof args === "string") return addMyCustomPathology(args);
      return addMyCustomPathology(args.label, args.code ?? null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.myCustomPathologies }),
  });
}

export function useRemoveMyCustomPathology() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeMyCustomPathology(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.myCustomPathologies }),
  });
}

export function useToggleMyCustomPathologyHidden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) => setMyCustomPathologyHidden(id, hidden),
  onSuccess: () => qc.invalidateQueries({ queryKey: qk.myCustomPathologies }),
  });
}

export function usePromoteCustomPathologies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => promoteCustomPathologies(ids),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.pathologies }),
        qc.invalidateQueries({ queryKey: qk.myCustomPathologies }),
      ]);
    },
  });
}

export function useDemoteDefaultPathologyToCustom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pathologyId: string) => demoteDefaultPathologyToCustom(pathologyId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.pathologies }),
        qc.invalidateQueries({ queryKey: qk.myCustomPathologies }),
        qc.invalidateQueries({ queryKey: qk.myPathologies }),
      ]);
    },
  });
}

export function useAdminDeleteDefaultPathology() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pathologyId: string) => deleteDefaultPathology(pathologyId),
    onMutate: async (pathologyId: string) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: qk.pathologies }),
        qc.cancelQueries({ queryKey: qk.myPathologies }),
      ]);
      const prevPathos = qc.getQueryData<Pathology[]>(qk.pathologies) ?? [];
      const prevMy = qc.getQueryData<UserPathology[]>(qk.myPathologies) ?? [];
      // Optimistic remove in cache
      qc.setQueryData<Pathology[]>(qk.pathologies, (old) => (old ?? []).filter((p) => p.id !== pathologyId));
      qc.setQueryData<UserPathology[]>(qk.myPathologies, (old) => (old ?? []).filter((up) => up.pathology_id !== pathologyId));
      return { prevPathos, prevMy };
    },
    onError: (_err, _id, ctx) => {
      if (!ctx) return;
      qc.setQueryData(qk.pathologies, ctx.prevPathos);
      qc.setQueryData(qk.myPathologies, ctx.prevMy);
    },
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.pathologies, refetchType: "active" }),
        qc.invalidateQueries({ queryKey: qk.myPathologies, refetchType: "active" }),
      ]);
    },
  });
}

export function useAdminDeleteCustomPathology() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminDeleteCustomPathology(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: qk.myCustomPathologies });
      const prev = qc.getQueryData<UserCustomPathology[]>(qk.myCustomPathologies) ?? [];
      qc.setQueryData<UserCustomPathology[]>(qk.myCustomPathologies, (old) => (old ?? []).filter((c) => c.id !== id));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (!ctx) return;
      qc.setQueryData(qk.myCustomPathologies, ctx.prev);
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: qk.myCustomPathologies, refetchType: "active" });
    },
  });
}

// Re-export helpers
export { computeBmi, bmiLabel };
