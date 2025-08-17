import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing Supabase env vars. Set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.",
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const jsonPath = resolve(__dirname, "../data/wcag-criteria.json");
  const raw = await readFile(jsonPath, "utf8");
  /** @type {{ code: string; name: string; level: "A"|"AA"|"AAA"; versions: string[] }[]} */
  const items = JSON.parse(raw);

  // Expand versions into per-version rows
  const rows = [];
  for (const it of items) {
    if (
      !it.code ||
      !it.name ||
      !it.level ||
      !Array.isArray(it.versions) ||
      it.versions.length === 0
    ) {
      console.warn("Skipping invalid item:", it);
      continue;
    }
    for (const v of it.versions) {
      if (!["2.0", "2.1", "2.2"].includes(v)) {
        console.warn(`Skipping unsupported version "${v}" for code ${it.code}`);
        continue;
      }
      rows.push({
        code: it.code,
        name: it.name,
        version: v,
        level: it.level,
      });
    }
  }

  // Upsert in batches to be safe
  const chunkSize = 200;
  let totalUpserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error, count } = await supabase
      .from("wcag_criteria")
      .upsert(chunk, {
        onConflict: "version,code",
        ignoreDuplicates: false,
        count: "estimated",
      });

    if (error) {
      console.error("Upsert error:", error);
      process.exit(1);
    }
    totalUpserted += chunk.length;
  }

  console.log(`Seed completed. Processed ${rows.length} rows from JSON.`);
  console.log(
    "You can verify with: select version, level, code, name from public.wcag_criteria order by version, code;",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
