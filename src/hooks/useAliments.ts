import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Aliment, AlimentInput, createAliment, deleteAliment, listAliments, updateAliment } from "@/lib/db/aliments";

const queryKey = ["aliments"] as const;

export function useAliments() {
  return useQuery<Aliment[], Error>({
    queryKey,
    queryFn: listAliments,
  });
}

export function useCreateAliment() {
  const qc = useQueryClient();
  return useMutation<Aliment, Error, AlimentInput>({
    mutationFn: createAliment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateAliment() {
  const qc = useQueryClient();
  return useMutation<Aliment, Error, { id: string; input: AlimentInput }>({
    mutationFn: ({ id, input }) => updateAliment(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteAliment() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => deleteAliment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}
