import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyFoodPreferences,
  setMyFoodPreference,
  removeMyFoodPreference,
  type FoodPreference,
  type FoodPrefsMap,
} from "@/lib/db/foodPrefs";

const qk = {
  prefs: ["foodPreferences"] as const,
};

export function useFoodPreferences() {
  return useQuery<FoodPrefsMap, Error>({
    queryKey: qk.prefs,
    queryFn: getMyFoodPreferences,
    staleTime: 60 * 1000,
  });
}

type PrefsCtx = { prevPrefs: FoodPrefsMap; paramsKey?: unknown };

export function useSetFoodPreference() {
  const qc = useQueryClient();
  return useMutation<void, Error, { alimentId: string; pref: FoodPreference; paramsKey?: unknown }, PrefsCtx>(
    {
      mutationFn: ({ alimentId, pref }) => setMyFoodPreference(alimentId, pref),
      onMutate: async ({ alimentId, pref, paramsKey }) => {
        await Promise.all([
          qc.cancelQueries({ queryKey: qk.prefs }),
          paramsKey ? qc.cancelQueries({ queryKey: ["aliments", paramsKey] }) : Promise.resolve(),
        ]);
        const prevPrefs = qc.getQueryData<FoodPrefsMap>(qk.prefs) ?? {};
        // Optimistic update
        qc.setQueryData<FoodPrefsMap>(qk.prefs, { ...prevPrefs, [alimentId]: pref });
        return { prevPrefs, paramsKey } as PrefsCtx;
      },
      onError: (_err, _vars, ctx) => {
        if (!ctx) return;
        qc.setQueryData<FoodPrefsMap>(qk.prefs, ctx.prevPrefs);
      },
      onSettled: async (_data, _err, _vars, ctx) => {
        await qc.invalidateQueries({ queryKey: qk.prefs, refetchType: "active" });
        if (ctx?.paramsKey) await qc.invalidateQueries({ queryKey: ["aliments", ctx.paramsKey], refetchType: "active" });
      },
    }
  );
}

export function useRemoveFoodPreference() {
  const qc = useQueryClient();
  return useMutation<void, Error, { alimentId: string; paramsKey?: unknown }, PrefsCtx>(
    {
      mutationFn: ({ alimentId }) => removeMyFoodPreference(alimentId),
      onMutate: async ({ alimentId, paramsKey }) => {
        await Promise.all([
          qc.cancelQueries({ queryKey: qk.prefs }),
          paramsKey ? qc.cancelQueries({ queryKey: ["aliments", paramsKey] }) : Promise.resolve(),
        ]);
        const prevPrefs = qc.getQueryData<FoodPrefsMap>(qk.prefs) ?? {};
        const next = { ...prevPrefs };
        delete next[alimentId];
        qc.setQueryData<FoodPrefsMap>(qk.prefs, next);
        return { prevPrefs, paramsKey } as PrefsCtx;
      },
      onError: (_err, _vars, ctx) => {
        if (!ctx) return;
        qc.setQueryData<FoodPrefsMap>(qk.prefs, ctx.prevPrefs);
      },
      onSettled: async (_data, _err, _vars, ctx) => {
        await qc.invalidateQueries({ queryKey: qk.prefs, refetchType: "active" });
        if (ctx?.paramsKey) await qc.invalidateQueries({ queryKey: ["aliments", ctx.paramsKey], refetchType: "active" });
      },
    }
  );
}
