import { expect, test, type Page } from "@playwright/test";
import { contrast } from "./contrast";

const cards = (page: Page) =>
  page.getByRole("region", { name: "projects" }).getByRole("article");

test("shows each Project card in order with its description and stack", async ({
  page,
}) => {
  await page.goto("/");

  await expect(cards(page)).toHaveText([
    /think fast jev\s+A benchmark of decision models against LLMs on crypto market questions\.\s+Python/,
    /gambit\s+AI launchpad that tokenizes chess agents, making market cap their ELO\.\s+TypeScript\s+NestJS\s+Next\.js\s+Solidity\s+Foundry/,
    /bytesize\s+A self-hosted URL shortener with fast redirects and visit analytics by location\.\s+Ruby\s+Rails\s+React\s+Postgres/,
    /wedding\s+My wedding invitation website, with flowing animations and floral designs\.\s+TypeScript\s+React/,
  ]);
});

test("colours each stack pill with text that reads at 4.5:1 or more", async ({
  page,
}) => {
  await page.goto("/");
  const pills = await cards(page)
    .getByRole("listitem")
    .evaluateAll((all) =>
      all.map((pill) => {
        const { color, backgroundColor } = getComputedStyle(pill);
        return { name: pill.textContent?.trim(), color, backgroundColor };
      }),
    );
  expect(pills).toHaveLength(12);

  for (const { name, color, backgroundColor } of pills) {
    // A transparent pill would have no brand colour.
    expect(backgroundColor, name).not.toBe("rgba(0, 0, 0, 0)");
    expect(contrast(color, backgroundColor), name).toBeGreaterThanOrEqual(4.5);
  }
});

for (const width of [1280, 375]) {
  test(`loads each Cover lazily as AVIF, sized for its box at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");

    for (const card of await cards(page).all()) {
      // The Cover is decorative: the card's heading already names the Project.
      await expect(card.getByRole("img")).toHaveCount(0);
      const cover = card.locator("img");
      await expect(cover).toHaveAttribute("loading", "lazy");
      // Fixed dimensions reserve the space, so nothing shifts as it loads.
      await expect(cover).toHaveAttribute("width", /\d+/);
      await expect(cover).toHaveAttribute("height", /\d+/);

      await cover.scrollIntoViewIfNeeded();
      await expect
        .poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);
      const { src, file, shown } = await cover.evaluate(
        async (img: HTMLImageElement) => {
          // naturalWidth of a srcset image reports its sizes slot, so load the chosen file alone to read its width.
          const probe = new Image();
          probe.src = img.currentSrc;
          await probe.decode();
          return {
            src: img.currentSrc,
            file: probe.naturalWidth,
            shown: img.clientWidth * devicePixelRatio,
          };
        },
      );
      expect(src).toMatch(/\.avif$/);
      // At least as wide as it is drawn, so it stays sharp, but not the full-size source.
      expect(file).toBeGreaterThanOrEqual(shown);
      expect(file).toBeLessThanOrEqual(shown * 2);
    }
  });
}

test("opens a Project's source from a click anywhere on its card above the links", async ({
  page,
}) => {
  await page.goto("/");
  // What a click at the middle of this element would land on.
  const target = (part: string, card: number) =>
    cards(page)
      .nth(card)
      .locator(part)
      .first()
      .evaluate((element) => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
        return hit?.closest("a")?.getAttribute("href");
      });

  for (const [card, source] of [
    [0, "https://github.com/amadzai/think-fast-jev"],
    [2, "https://github.com/amadzai/bytesize"],
  ] as const) {
    await cards(page).nth(card).scrollIntoViewIfNeeded();
    for (const part of ["img", "h3", "p", "ul"]) {
      expect(await target(part, card), part).toBe(source);
    }
  }
  // The links keep their own targets.
  expect(await target("a:text('Live site')", 2)).toBe(
    "https://app.bytesize.now/",
  );
});

test("shows the cards in two columns, stacked in one on phones", async ({
  page,
}) => {
  const boxes = () =>
    cards(page).evaluateAll((all) =>
      all.map((card) => card.getBoundingClientRect().left),
    );
  await page.goto("/");
  const [first, second, third, fourth] = await boxes();
  expect(second).toBeGreaterThan(first);
  expect([third, fourth]).toEqual([first, second]);

  await page.setViewportSize({ width: 375, height: 800 });
  expect(new Set(await boxes()).size).toBe(1);
});

test("links each Project to its source, and to its live site when it has one", async ({
  page,
}) => {
  await page.goto("/");
  const links = (card: number) =>
    cards(page)
      .nth(card)
      .getByRole("link")
      .evaluateAll((all) =>
        all.map((a) => [a.textContent?.trim(), a.getAttribute("href")]),
      );

  expect(await links(0)).toEqual([
    ["GitHub", "https://github.com/amadzai/think-fast-jev"],
  ]);
  expect(await links(1)).toEqual([
    ["GitHub", "https://github.com/amadzai/gambit"],
  ]);
  expect(await links(2)).toEqual([
    ["Live site", "https://app.bytesize.now/"],
    ["GitHub", "https://github.com/amadzai/bytesize"],
  ]);
  expect(await links(3)).toEqual([
    ["Live site", "https://amadsya.love/"],
    ["GitHub", "https://github.com/amadzai/syamad-wedding-invitation"],
  ]);
});
