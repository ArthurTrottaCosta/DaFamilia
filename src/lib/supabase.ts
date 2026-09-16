import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key);
export const launchReady = import.meta.env.VITE_LAUNCH_READY === "true";
export const supabase = configured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storageKey: "df_auth_v2",
      },
    })
  : null;
export function db() {
  if (!supabase)
    throw new Error(
      "A nova versão está em preparação. Explore a demonstração enquanto isso.",
    );
  return supabase;
}
export const supportEmail =
  (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() ||
  "contato@octopool.com.br";
