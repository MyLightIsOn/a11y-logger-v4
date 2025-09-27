// Centralized, type-safe environment loader
// - Validates all required variables at boot (fail-fast)
// - Separates server-only vs NEXT_PUBLIC (client-exposed) variables
// - Never exposes secrets to the client bundle
// - Provide safe defaults where appropriate

import { z, ZodError } from "zod";

// Utilities
function formatZodError(err: ZodError): string {
  return (
    "Environment validation failed:\n" +
    err.issues
      .map((i) => {
        const path = i.path.join(".") || "<root>";
        return `- ${path}: ${i.message}`;
      })
      .join("\n") +
    "\n\nFix: Check your .env / deployment secrets."
  );
}

// Public (client-exposed) variables must start with NEXT_PUBLIC_
const clientSchema = z.object({
  // Build/runtime mode (safe to expose)
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Optional platform hints (non-secret)
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),

  // Required by Supabase client usage
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: "Must be a valid URL" }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY: z
    .string()
    .min(20, { message: "Expected a Supabase anon/publishable key" }),

  // App routing base for public VPAT pages (safe default)
  NEXT_PUBLIC_PUBLIC_VPAT_BASE: z.string().default("/edge/public/vpats"),
});

// Server-only variables (never expose to the client)
const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Platform-derived envs (optional, used for hints/URLs)
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),

  // Third-party services
  CLOUDINARY_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Supabase service role (server-only). Optional here; may be required in scripts/CI.
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),

  // AI key (feature-optional)
  OPEN_AI_KEY: z.string().optional(),
});

const isServer = typeof window === "undefined";

// Always safe to expose: client env
const clientResult = clientSchema.safeParse(process.env);
if (!clientResult.success) {
  throw new Error(formatZodError(clientResult.error));
}

// Server env: validate on server; in the browser, provide a guarded proxy that throws on access
let serverEnvExport: z.infer<typeof serverSchema>;
if (isServer) {
  const serverResult = serverSchema.safeParse(process.env);
  if (!serverResult.success) {
    throw new Error(formatZodError(serverResult.error));
  }
  serverEnvExport = serverResult.data;
} else {
  // Any attempt to access server-only vars from the client will throw at runtime
  // and, importantly, no secret values will be embedded in the client bundle.
  serverEnvExport = new Proxy({} as z.infer<typeof serverSchema>, {
    get() {
      throw new Error(
        "Accessing server-only environment variables on the client is forbidden. Import and use clientEnv instead.",
      );
    },
  });
}

export const clientEnv = clientResult.data;
export const serverEnv = serverEnvExport;

// Optional: convenience type for consumers
export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;
