import { defineConfig, devices } from "@playwright/test";

// E2E runs against the production build. Port 4322 keeps it clear of the dev server on 4321.
const baseURL = "http://localhost:4322";

export default defineConfig({
  testDir: "e2e",
  use: { baseURL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm astro preview --port 4322 --ignore-lock",
    url: baseURL,
  },
});
