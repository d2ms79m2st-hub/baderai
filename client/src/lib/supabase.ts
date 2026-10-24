import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://ukbukoagjlddtevdxyzc.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_dYhCvGOxdWquCA5YUahZNw_KZyeKaZm";

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
