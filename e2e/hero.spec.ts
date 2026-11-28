import { expect, test, type Page } from "@playwright/test";

const hero = (page: Page) => page.getByRole("region", { name: /amad\s*zai/i });

const playStates = (page: Page) =>
  hero(page).evaluate((el) =>
    el.getAnimations({ subtree: true }).map((a) => a.playState),
  );

test("hero animation waits until the tab is visible", async ({ page }) => {
  // Make the page report itself hidden until the test says otherwise.
  await page.addInitScript(() => {
    let hidden = true;
    Object.defineProperty(document, "hidden", { get: () => hidden });
    Object.defineProperty(document, "visibilityState", {
      get: () => (hidden ? "hidden" : "visible"),
    });
    Object.assign(window, {
      showPage: () => {
        hidden = false;
        document.dispatchEvent(new Event("visibilitychange"));
      },
    });
  });
  await page.goto("/");

  const hidden = await playStates(page);
  expect(hidden.length).toBeGreaterThan(0);
  expect(new Set(hidden)).toEqual(new Set(["paused"]));

  await page.evaluate(() =>
    (window as unknown as { showPage(): void }).showPage(),
  );
  expect(await playStates(page)).not.toContain("paused");
});

test("hero animation plays in a visible tab", async ({ page }) => {
  await page.goto("/");
  const states = await playStates(page);
  expect(states.length).toBeGreaterThan(0);
  expect(states).not.toContain("paused");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("hero animation plays", async ({ page }) => {
    await page.goto("/");
    const states = await playStates(page);
    expect(states.length).toBeGreaterThan(0);
    expect(states).not.toContain("paused");
  });
});

test("reduced motion shows the composition with no animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await playStates(page)).toEqual([]);
  await expect(hero(page).locator("svg")).toBeVisible();
});

test("keeps the hero's three buttons on one row at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const tops = await page
    .getByRole("navigation", { name: "Contact" })
    .locator("a, button")
    .evaluateAll((all) =>
      all.map((el) => Math.round(el.getBoundingClientRect().top)),
    );
  expect(tops).toHaveLength(3);
  expect(new Set(tops).size).toBe(1);
});

for (const width of [320, 375, 414]) {
  test(`stretches "amad" across the hero on a ${width}px phone`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const share = await page.locator("#hero-name").evaluate((name) => {
      // The text, not its box: a block always fills the column.
      const range = document.createRange();
      range.selectNodeContents(name.querySelector(".name")!);
      return range.getBoundingClientRect().width / name.clientWidth;
    });
    expect(share).toBeGreaterThan(0.95);
    expect(share).toBeLessThanOrEqual(1);
  });
}
