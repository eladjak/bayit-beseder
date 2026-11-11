/** Public values are fixed at build time by Next.js. */
export const NEW_UI_ENV_NAME = "NEXT_PUBLIC_NEW_UI";
export const UI_OVERRIDE_KEY = "bayit-ui";
const NEW_UI_BUILD = process.env.NEXT_PUBLIC_NEW_UI === "true";
const VERCEL_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV;
const NODE_ENV = process.env.NODE_ENV;

export function isNewUiBuild(): boolean {
  return NEW_UI_BUILD;
}

export function overrideAllowed(): boolean {
  if (VERCEL_ENV === "production") return false;
  return VERCEL_ENV === "preview" || VERCEL_ENV === "development" || NODE_ENV === "development";
}
