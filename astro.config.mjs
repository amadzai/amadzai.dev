// @ts-check
import { defineConfig, envField, fontProviders } from "astro/config";

import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://amadzai.dev",
  // Lists every page for search engines; robots.txt and the head point to it.
  integrations: [sitemap()],
  fonts: [
    {
      name: "Jost",
      cssVariable: "--font-jost",
      provider: fontProviders.fontsource(),
      weights: [400, 500, 800],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["sans-serif"],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      // Read-only, public-repo token for Recent commits. Build time only: a secret never reaches the client.
      GITHUB_TOKEN: envField.string({ context: "server", access: "secret" }),
    },
  },
});
