import { expect, test } from "@playwright/test";

test("shows the name, intro and contact links", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toHaveText(/amad\s*zai/i);
  await expect(
    page.getByText("Full stack developer and AI engineer from Kuala Lumpur"),
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
