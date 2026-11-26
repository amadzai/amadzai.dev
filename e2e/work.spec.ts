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

test("tints each company name on hover, keeping large-text contrast", async ({
  page,
}) => {
  await page.goto("/");
  const rows = page.getByRole("region", { name: "work" }).getByRole("listitem");

  for (const row of await rows.all()) {
    const name = row.getByRole("link");
    const colour = () => name.evaluate((el) => getComputedStyle(el).color);
    const ink = await colour();

    await row.hover();
    await expect.poll(colour).not.toBe(ink);

    // WCAG contrast of the settled hover colour against the page background; 3:1 is the large-text minimum.
    const contrast = await name.evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((a) => a.finished));
      const rgb = (s: string) => s.match(/\d+/g)!.slice(0, 3).map(Number);
      const lum = (c: number[]) => {
        const [r, g, b] = c.map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const fg = lum(rgb(getComputedStyle(el).color));
      const bg = lum(rgb(getComputedStyle(document.body).backgroundColor));
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(3);
  }
});
