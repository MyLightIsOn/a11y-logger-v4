import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";
import { hasEnvVars } from "@/lib/utils";

export function createClient() {
  if (!hasEnvVars) {
    throw new Error(
      "Supabase client cannot be created: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY are missing. Add them to your .env.local."
    );
  }
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL!,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
  );
}
