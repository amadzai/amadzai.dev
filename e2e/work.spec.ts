import { expect, test } from "@playwright/test";

test("lists each Work role newest first", async ({ page }) => {
  await page.goto("/");
  const rows = page.getByRole("region", { name: "work" }).getByRole("listitem");

  await expect(rows).toHaveText([
    /Sunway Property\s+Software Engineer\s+Jun 2026 – Dec 2026/,
    /ELVTD\s+Full Stack Developer\s+Sep 2024 – Mar 2026/,
    /PETRONAS\s+Data Engineer\s+Apr 2024 – Sep 2024/,
  ]);
});

test("shows a decorative logo in each Work row", async ({ page }) => {
  await page.goto("/");
  const rows = page.getByRole("region", { name: "work" }).getByRole("listitem");
  await expect(rows).toHaveCount(3);

  for (const row of await rows.all()) {
    // Logos are decorative: the company name already labels the row, so screen readers skip them.
    await expect(row.getByRole("img")).toHaveCount(0);
    const logo = row.locator("img");
    await expect(logo).toHaveCount(1);
    await expect
      .poll(() => logo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  }
});

test("links each Work row to the company's website", async ({ page }) => {
  await page.goto("/");
  const work = page.getByRole("region", { name: "work" });

  for (const [company, href] of [
    ["Sunway Property", "https://sunwayproperty.com/"],
    ["ELVTD", "https://www.elvtd.io/"],
    ["PETRONAS", "https://www.petronas.com/"],
  ]) {
    await expect(
      work.getByRole("link", { name: company, exact: true }),
    ).toHaveAttribute("href", href);
  }
});
