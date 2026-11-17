// Runs the database migration tests on an in-memory Postgres (PGlite).
//
//   npm i --no-save @electric-sql/pglite@0.5.16
//   npm run test:db
//
// Order: Supabase stubs -> migrations before the one under test -> legacy seed
// -> migrations from the one under test onward -> *.test.sql files.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const migrationsDir = path.join(root, "supabase/migrations");
const SEED_BEFORE = "20261117000000"; // seed legacy data right before this migration
// Supabase-only extensions that PGlite cannot load.
const SKIP = [/CREATE EXTENSION IF NOT EXISTS pg_cron/i];

const { PGlite } = await import(process.env.PGLITE_MODULE ?? "@electric-sql/pglite");
const db = new PGlite();

let passed = 0;
async function run(label, sql) {
  try {
    await db.exec(sql, {
      onNotice: (n) => {
        if (n.message?.startsWith("ok - ")) {
          passed++;
          console.log(`  ${n.message}`);
        } else {
          console.log(`  NOTICE ${n.message}`);
        }
      },
    });
  } catch (e) {
    console.error(`\nFAILED in ${label}:\n  ${e.message}`);
    process.exit(1);
  }
}

await run("00_supabase_stubs.sql", await readFile(path.join(here, "00_supabase_stubs.sql"), "utf8"));

const migrations = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
let seeded = false;
for (const f of migrations) {
  if (!seeded && f >= SEED_BEFORE) {
    console.log("seed: 10_pre_migration_seed.sql");
    await run("10_pre_migration_seed.sql", await readFile(path.join(here, "10_pre_migration_seed.sql"), "utf8"));
    seeded = true;
  }
  const sql = await readFile(path.join(migrationsDir, f), "utf8");
  if (SKIP.some((re) => re.test(sql))) {
    console.log(`skip: ${f} (Supabase-only extension)`);
    continue;
  }
  console.log(`migrate: ${f}`);
  await run(f, sql);
}

for (const f of (await readdir(here)).filter((f) => f.endsWith(".test.sql")).sort()) {
  console.log(`test: ${f}`);
  await run(f, await readFile(path.join(here, f), "utf8"));
}

console.log(`\n${passed} checks passed`);
await db.close();
