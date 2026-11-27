import { expect, test } from "@playwright/test";
import { finishEntrances } from "./entrances";

// The comfortable tap size: WCAG's enhanced target size, and Apple's guideline.
const TAP = 44;
// Probe just inside each edge of a TAP-sized square on the target's centre.
const REACH = TAP / 2 - 1;

test.use({
  viewport: { width: 375, height: 667 },
  hasTouch: true,
  isMobile: true,
});

test("a tap within 22px of a link or button's centre lands on it", async ({
  page,
}) => {
  await page.goto("/");
  await finishEntrances(page);

  const misses = await page.evaluate((reach) => {
    const targets = [...document.querySelectorAll("a, button")].filter(
      (el) => el.checkVisibility() && !el.closest("[aria-hidden=true]"),
    );
    return targets.flatMap((el) => {
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const { left, top, width, height } = el.getBoundingClientRect();
      const [x, y] = [left + width / 2, top + height / 2];
      const edges = [
        [x, y - reach],
        [x, y + reach],
        [x - reach, y],
        [x + reach, y],
      ];
      const missed = edges.some(([px, py]) => {
        const hit = document.elementFromPoint(px, py);
        return !hit || !el.contains(hit);
      });
      const label = (el.getAttribute("aria-label") ?? el.textContent ?? "")
        .trim()
        .replace(/\s+/g, " ");
      return missed
        ? [`${label} (${Math.round(width)}x${Math.round(height)})`]
        : [];
    });
  }, REACH);

  expect(misses).toEqual([]);
});
