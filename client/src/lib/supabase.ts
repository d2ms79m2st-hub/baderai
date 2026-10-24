import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://ukbukoagjlddtevdxyzc.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_dYhCvGOxdWquCA5YUahZNw_KZyeKaZm";

let client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!client) {
    client = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
