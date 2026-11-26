/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    // Unit tests only; the E2E specs in e2e/ run under Playwright.
    include: ["src/**/*.test.ts"],
  },
});
