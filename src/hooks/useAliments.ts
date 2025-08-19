import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Aliment,
  AlimentInput,
  createAliment,
  deleteAliment,
  listAliments,
  updateAliment,
  listAlimentsPaged,
  AlimentsQueryParams,
  AlimentsPagedResult,
} from "@/lib/db/aliments";

const queryKey = ["aliments"] as const;

export function useAliments() {
  return useQuery<Aliment[], Error>({
    queryKey,
    queryFn: listAliments,
  });
}

export function useAlimentsPaged(params: AlimentsQueryParams) {
  return useQuery<AlimentsPagedResult, Error>({
    queryKey: ["aliments", params],
    queryFn: () => listAlimentsPaged(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateAliment() {
  const qc = useQueryClient();
  return useMutation<Aliment, Error, AlimentInput>({
    mutationFn: createAliment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aliments"], refetchType: "active" });
    },
  });
}

export function useUpdateAliment(paramsKey?: AlimentsQueryParams) {
  const qc = useQueryClient();
  return useMutation<Aliment, Error, { id: string; input: AlimentInput }>({
    mutationFn: ({ id, input }) => updateAliment(id, input),
    onMutate: async ({ id, input }) => {
  const keyFilter = paramsKey ? ["aliments", paramsKey] : ["aliments"];
  await qc.cancelQueries({ queryKey: keyFilter });
  const snapshot = qc.getQueriesData<unknown>({ queryKey: keyFilter });
      for (const [key, data] of snapshot) {
        if (!data) continue;
        if (Array.isArray(data)) {
          qc.setQueryData(key, (old: Aliment[] | undefined) =>
            (old ?? []).map((a) => (a.id === id ? { ...a, ...input, notes: input.notes && input.notes.length > 0 ? input.notes : null } as any : a))
          );
        } else if (typeof data === "object") {
          qc.setQueryData(key, (old: AlimentsPagedResult | undefined) => {
            if (!old) return old;
            return {
              ...old,
              items: (old.items ?? []).map((a) => (a.id === id ? { ...a, ...input, notes: input.notes && input.notes.length > 0 ? input.notes : null } as any : a)),
            };
          });
        }
      }
      return { snapshot } as const;
    },
    onError: (_err, _vars, ctx) => {
      const snap = (ctx as any)?.snapshot as Array<[any, any]> | undefined;
      if (!snap) return;
      for (const [key, prev] of snap) qc.setQueryData(key, prev);
    },
    onSettled: async () => {
      const keyFilter = paramsKey ? ["aliments", paramsKey] : ["aliments"];
      await qc.invalidateQueries({ queryKey: keyFilter, refetchType: "active" });
    },
  });
}

export function useDeleteAliment() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => deleteAliment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aliments"], refetchType: "active" });
    },
  });
}
