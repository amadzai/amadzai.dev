import { expect, test, type Locator } from "@playwright/test";
import { contrast } from "./contrast";

test("shows the name, intro and contact links", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toHaveText(/amad\s*zai/i);
  await expect(
    page.getByText("AI engineer and full stack developer from Kuala Lumpur"),
  ).toBeVisible();

  for (const nav of ["Contact", "Footer"]) {
    const links = page.getByRole("navigation", { name: nav });
    await expect(links.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      /^mailto:/,
    );
    await expect(links.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/amadzai",
    );
    await expect(links.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
      "href",
      /linkedin\.com\/in\//,
    );
  }
});

test("opens every link in a new tab", async ({ page }) => {
  await page.goto("/");
  const targets = await page
    .getByRole("link")
    .evaluateAll((links) => links.map((a) => a.getAttribute("target")));
  expect(targets.length).toBeGreaterThan(0);
  expect(new Set(targets)).toEqual(new Set(["_blank"]));
});

test("has no content wider than a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  // Let entrance animations finish so their offsets don't count; looping ones never finish.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );

  // The page clips horizontal overflow, so scrollWidth can't reveal it: check each element's box.
  const overflowing = await page.evaluate(() =>
    [...document.querySelectorAll("body *")]
      .filter((el) => !el.closest("[aria-hidden=true]"))
      .filter(
        (el) =>
          el.getBoundingClientRect().right >
          document.documentElement.clientWidth,
      )
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  expect(overflowing).toEqual([]);
});

test("tints each footer link on hover, keeping text contrast", async ({
  page,
}) => {
  await page.goto("/");
  const links = page
    .getByRole("navigation", { name: "Footer" })
    .getByRole("link");
  const paper = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  const colour = (link: Locator) =>
    link.evaluate(async (a) => {
      await Promise.all(a.getAnimations().map(({ finished }) => finished));
      return getComputedStyle(a).color;
    });

  const hovered = [];
  for (const link of await links.all()) {
    const before = await colour(link);
    await link.hover();
    const after = await colour(link);
    expect(after).not.toBe(before);
    expect(contrast(after, paper)).toBeGreaterThanOrEqual(4.5);
    hovered.push(after);
  }
  // Each link takes its own colour, as the hero's buttons do.
  expect(new Set(hovered).size).toBe(3);
});

test("a pill button stays pressed with the cursor on its top or right edge", async ({
  page,
}) => {
  // Skip the hero entrance, so the pill is already where it rests.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const pill = page
    .getByRole("navigation", { name: "Contact" })
    .getByRole("link", { name: "GitHub" });
  const box = (await pill.boundingBox())!;

  for (const [x, y] of [
    [box.x + box.width / 2, box.y + 1],
    [box.x + box.width - 1, box.y + box.height / 2],
  ]) {
    await page.mouse.move(x, y);
    // Long enough for a stutter to show: hover lost, the 0.2s spring back, hover again.
    await page.waitForTimeout(600);
    const [hovered, translate] = await pill.evaluate((a) => [
      a.matches(":hover"),
      getComputedStyle(a).translate,
    ]);
    expect(hovered).toBe(true);
    expect(translate).toBe("-3px 3px");
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
  }
});
