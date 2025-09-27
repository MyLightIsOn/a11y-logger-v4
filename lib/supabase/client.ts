import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";

export function createClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
  );
}
