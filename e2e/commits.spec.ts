import { expect, test, type Page } from "@playwright/test";
import { contrast } from "./contrast";

// The rows come from live GitHub data at build time, so these check their shape, not their text.
const rows = (page: Page) =>
  page
    .getByRole("region", { name: "recent commits" })
    .getByRole("listitem")
    .getByRole("link");

test("lists five recent commits, each linking to GitHub with its diff counts", async ({
  page,
}) => {
  await page.goto("/");
  await expect(rows(page)).toHaveCount(5);

  for (const row of await rows(page).all()) {
    await expect(row).toHaveAttribute(
      "href",
      /^https:\/\/github\.com\/amadzai\/[\w.-]+\/commit\/[0-9a-f]{40}$/,
    );
    await expect(row).toHaveAttribute("target", "_blank");
    // Repo, headline, then the diff with a real minus sign, split by a slash.
    await expect(row).toHaveText(/^[\w.-]+\s*.+\s*\+\d+ \/ −\d+$/);
  }
});

for (const width of [1280, 375, 320]) {
  test(`keeps each commit's headline and diff on one line at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");

    for (const row of await rows(page).all()) {
      const [headline, diff] = await row.evaluate((a) =>
        [a.children[2], a.children[3]].map((child) => {
          const { top, right } = child.getBoundingClientRect();
          // Count the distinct lines the text is laid out on.
          const range = document.createRange();
          range.selectNodeContents(child);
          const tops = new Set(
            [...range.getClientRects()].map(({ top }) => Math.round(top)),
          );
          return { top, right, lines: tops.size };
        }),
      );
      expect(headline.lines).toBe(1);
      expect(diff.lines).toBe(1);
      // Inline: the diff sits on the headline's line, to its right.
      expect(diff.top).toBeCloseTo(headline.top, 0);
      expect(diff.right).toBeGreaterThan(headline.right);
    }

    // Right-aligned: every row's diff ends at the same edge.
    const rights = await rows(page).evaluateAll((all) =>
      all.map((a) => {
        // Measure the text, not its box: the box always fills the column.
        const range = document.createRange();
        range.selectNodeContents(a.children[3]);
        return Math.round(range.getBoundingClientRect().right);
      }),
    );
    expect(new Set(rights).size).toBe(1);
  });
}

test("tints a commit's repo and headline in its marker colour on hover, keeping text contrast", async ({
  page,
}) => {
  await page.goto("/");
  const ink = "rgb(27, 25, 22)";
  const paper = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );

  for (const row of await rows(page).all()) {
    await row.hover();
    const { marker, repo, headline, decoration } = await row.evaluate(
      async (a) => {
        await Promise.all(
          a.getAnimations({ subtree: true }).map(({ finished }) => finished),
        );
        const [marker, repo, headline] = [...a.children].map((child) =>
          getComputedStyle(child),
        );
        return {
          marker: marker.backgroundColor,
          repo: repo.color,
          headline: headline.color,
          decoration: headline.textDecorationLine,
        };
      },
    );
    expect(decoration).toBe("none");
    expect(repo).toBe(headline);
    // An ink marker has no colour to take.
    if (marker !== ink) expect(headline).not.toBe(ink);
    expect(contrast(headline, paper)).toBeGreaterThanOrEqual(4.5);
  }
});

test("names each language and its share in a tooltip when its segment is focused", async ({
  page,
}) => {
  await page.goto("/");
  const segments = page
    .getByRole("list", { name: "Language breakdown" })
    .getByRole("listitem");
  await expect(segments.first()).toBeAttached();
  const opacity = (segment: typeof segments) =>
    segment.locator("span").evaluate(async (tooltip) => {
      await Promise.all(
        tooltip.getAnimations().map(({ finished }) => finished),
      );
      return getComputedStyle(tooltip).opacity;
    });

  const percents = [];
  for (const segment of await segments.all()) {
    expect(await opacity(segment)).toBe("0");
    await segment.focus();
    expect(await opacity(segment)).toBe("1");
    const [, percent] = (await segment.textContent())!
      .trim()
      .match(/^.+ (\d+)%$/)!;
    percents.push(Number(percent));
  }
  expect(percents.reduce((total, n) => total + n, 0)).toBe(100);
});
