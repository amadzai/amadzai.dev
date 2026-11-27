import type { Page } from "@playwright/test";

// Waits for the page's entrance animations, so nothing is measured mid-slide. Looping ones never finish, so they're skipped.
export async function finishEntrances(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );
}
