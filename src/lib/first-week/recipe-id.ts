import { createHash } from "node:crypto";
// Stable per household and recipe/servings: retrying cannot create duplicate meals.
export function recipeId(household: string, recipe: number, servings: number): string {
  const hex = createHash("sha256").update(`first-week-v1:${household}:${recipe}:${servings}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5"; hex[16] = "a";
  const h = hex.join("");
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
