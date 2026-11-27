import { expect, test } from "@playwright/test";

const meta = (property: string) =>
  `meta[property="${property}"], meta[name="${property}"]`;

test("has a title, description, canonical URL and share tags", async ({
  page,
}) => {
  await page.goto("/");
  const head = page.locator("head");

  await expect(page).toHaveTitle("Amad Zai");
  await expect(head.locator(meta("description"))).toHaveAttribute(
    "content",
    "AI engineer and full stack developer from Kuala Lumpur",
  );
  await expect(head.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://amadzai.dev/",
  );
  for (const [property, content] of [
    ["og:type", "website"],
    ["og:url", "https://amadzai.dev/"],
    ["og:title", "Amad Zai"],
    ["og:image", "https://amadzai.dev/og.png"],
    ["og:image:width", "1200"],
    ["og:image:height", "630"],
    ["twitter:card", "summary_large_image"],
  ]) {
    await expect(head.locator(meta(property))).toHaveAttribute(
      "content",
      content,
    );
  }
  await expect(head.locator(meta("og:image:alt"))).toHaveAttribute(
    "content",
    /amad zai/i,
  );
});

test("links an SVG favicon with ICO and Apple touch fallbacks", async ({
  page,
}) => {
  await page.goto("/");
  const head = page.locator("head");
  await expect(
    head.locator('link[rel="icon"][type="image/svg+xml"]'),
  ).toHaveAttribute("href", "/favicon.svg");
  await expect(head.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute(
    "href",
    "/favicon.ico",
  );
  await expect(head.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/apple-touch-icon.png",
  );
});

// A PNG's width and height sit in its IHDR chunk, at bytes 16 to 23.
const pngSize = (body: Uint8Array) => {
  const view = new DataView(body.buffer, body.byteOffset);
  return [view.getUint32(16), view.getUint32(20)];
};

test("serves the favicons, share image and robots file", async ({
  request,
}) => {
  const svg = await request.get("/favicon.svg");
  expect(svg.ok()).toBe(true);
  expect(await svg.text()).toMatch(/^<svg[^>]*viewBox="0 0 16 16"/);

  const ico = await request.get("/favicon.ico");
  // An ICO file starts with reserved 0, then type 1.
  expect([...(await ico.body()).subarray(0, 4)]).toEqual([0, 0, 1, 0]);

  expect(
    pngSize(await (await request.get("/apple-touch-icon.png")).body()),
  ).toEqual([180, 180]);
  expect(pngSize(await (await request.get("/og.png")).body())).toEqual([
    1200, 630,
  ]);

  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toMatch(/User-agent: \*\s+Allow: \//);
});

test("the top bar's logo goes home, beside the pages still to come", async ({
  page,
}) => {
  await page.goto("/");
  const bar = page.getByRole("banner");
  const home = bar.getByRole("link", { name: "Amad Zai, home" });
  await expect(home).toHaveAttribute("href", "/");
  await expect(home.locator("svg")).toBeVisible();

  const pages = bar.getByRole("navigation", { name: "Pages" });
  await expect(pages).toHaveText(/Projects\s*Blog/);
  // Named, but not links until the pages exist.
  await expect(pages.getByRole("link")).toHaveCount(0);
});

test("the footer shows the logo with the name and the year", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.locator("svg")).toBeVisible();
  const year = new Date().getFullYear();
  await expect(footer).toContainText(new RegExp(`amad\\s*zai\\s*${year}`, "i"));
});

test("describes Amad as a Person for search engines", async ({ page }) => {
  await page.goto("/");
  const schema = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!,
  );
  expect(schema).toMatchObject({
    "@type": "Person",
    name: "Amad Zai",
    url: "https://amadzai.dev/",
    sameAs: [
      expect.stringMatching(/linkedin\.com\/in\//),
      "https://github.com/amadzai",
      "https://huggingface.co/amadzai",
      "https://www.instagram.com/amadzai",
    ],
  });
});
