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
  qc.invalidateQueries({ queryKey: ["aliments"] });
    },
  });
}

export function useUpdateAliment() {
  const qc = useQueryClient();
  return useMutation<Aliment, Error, { id: string; input: AlimentInput }>({
    mutationFn: ({ id, input }) => updateAliment(id, input),
    onSuccess: () => {
  qc.invalidateQueries({ queryKey: ["aliments"] });
    },
  });
}

export function useDeleteAliment() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => deleteAliment(id),
    onSuccess: () => {
  qc.invalidateQueries({ queryKey: ["aliments"] });
    },
  });
}
