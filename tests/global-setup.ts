import { execSync } from "node:child_process";

function runDbReset() {
  execSync("npx supabase db reset --local --yes", {
    stdio: "inherit",
  });
}

async function globalSetup() {
  if (process.env.PLAYWRIGHT_SKIP_DB_RESET === "1") {
    return;
  }

  try {
    runDbReset();
  } catch {
    throw new Error(
      "Playwright global setup failed to reset the local Supabase database. Ensure Docker Desktop is running and the local Supabase stack can start.",
    );
  }
}

export default globalSetup;
