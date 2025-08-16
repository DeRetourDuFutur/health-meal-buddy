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
  type Profile,
  type ProfileInput,
  type Pathology,
  type UserPathology,
  type ProfileHistory,
} from "@/lib/db/profiles";

// Query keys
const qk = {
  profile: ["profile", "me"] as const,
  pathologies: ["pathologies"] as const,
  myPathologies: ["pathologies", "me"] as const,
  history: ["profile_history", "me"] as const,
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

export async function getAvatarUrlOrNull(path?: string | null) {
  if (!path) return null;
  return await getAvatarSignedUrl(path);
}

export async function checkLoginAvailable(login: string) {
  return await isLoginAvailable(login);
}
