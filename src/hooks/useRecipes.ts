import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Recipe,
  RecipeInput,
  RecipeItem,
  RecipeItemInput,
  RecipeWithItems,
  listRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  addRecipeItem,
  updateRecipeItem,
  deleteRecipeItem,
} from "@/lib/db/recipes";

const queryKey = ["recipes"] as const;

export function useRecipes() {
  return useQuery<RecipeWithItems[], Error>({
    queryKey,
    queryFn: listRecipes,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation<Recipe, Error, RecipeInput>({
    mutationFn: createRecipe,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation<Recipe, Error, { id: string; input: RecipeInput }>({
    mutationFn: ({ id, input }) => updateRecipe(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => deleteRecipe(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useAddRecipeItem() {
  const qc = useQueryClient();
  return useMutation<RecipeItem, Error, { recipe_id: string; input: RecipeItemInput }>({
    mutationFn: ({ recipe_id, input }) => addRecipeItem(recipe_id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useUpdateRecipeItem() {
  const qc = useQueryClient();
  return useMutation<RecipeItem, Error, { id: string; quantity_g: number }>({
    mutationFn: ({ id, quantity_g }) => updateRecipeItem(id, { quantity_g }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useDeleteRecipeItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => deleteRecipeItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recipes"] }),
  });
}
