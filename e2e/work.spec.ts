import { expect, test, type Page } from "@playwright/test";
import { contrast } from "./contrast";

test("lists each Work role newest first, with a one-line summary", async ({
  page,
}) => {
  await page.goto("/");
  const rows = page.getByRole("region", { name: "work" }).getByRole("listitem");

  await expect(rows).toHaveText([
    /Sunway Property\s+Software Engineer\s+Led AI development, from LangGraph agents to durable workflows\.\s+Jun 2026 – Dec 2026/,
    /ELVTD\s+Full Stack Developer\s+Shipped a decentralized prediction market live across multiple EVM chains\.\s+Sep 2024 – Mar 2026/,
    /PETRONAS\s+Data Engineer\s+Built lakehouse pipelines and an ELT tool powering analytics and digital twins\.\s+Apr 2024 – Sep 2024/,
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

    // Contrast of the settled hover colour against the page background; 3:1 is the large-text minimum.
    const [fg, bg] = await name.evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((a) => a.finished));
      return [
        getComputedStyle(el).color,
        getComputedStyle(document.body).backgroundColor,
      ];
    });
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  }
});

// Where a row's parts sit: the role, the summary and the dates.
const layout = (page: Page) =>
  page
    .getByRole("region", { name: "work" })
    .getByRole("listitem")
    .evaluateAll((rows) =>
      rows.map((row) => {
        const box = (el: Element | null) => el!.getBoundingClientRect();
        return {
          role: box(row.querySelector("small")),
          summary: box(row.querySelector("p")),
          dates: box(row.querySelector("time")!.parentElement),
          // The first date, not its box: the box can carry padding.
          datesStart: box(row.querySelector("time")).left,
        };
      }),
    );

test("puts a Work row's dates under the role on tablets, leaving the summary a wide column", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");

  for (const { role, summary, dates, datesStart } of await layout(page)) {
    expect(dates.top).toBeGreaterThanOrEqual(role.bottom);
    expect(datesStart).toBeCloseTo(role.left, 0);
    expect(summary.left).toBeGreaterThan(dates.right);
    expect(summary.width).toBeGreaterThan(300);
  }
});

test("keeps a Work row's dates at the end of the row on desktops", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  for (const { summary, dates } of await layout(page)) {
    expect(dates.left).toBeGreaterThan(summary.right);
  }
});
