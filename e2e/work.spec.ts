import { expect, test } from "@playwright/test";

test("lists each Work role newest first", async ({ page }) => {
  await page.goto("/");
  const rows = page.getByRole("region", { name: "work" }).getByRole("listitem");

  await expect(rows).toHaveText([
    /Sunway Property\s+Software Engineer\s+Jun 2026 – Dec 2026/,
    /ELVTD\.io\s+Full Stack Developer\s+Sep 2024 – Mar 2026/,
    /PETRONAS\s+Data Engineer\s+Apr 2024 – Sep 2024/,
  ]);
});
